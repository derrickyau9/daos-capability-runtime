import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CapabilitySchema, DecisionSchema, RuntimeFault, validateValues, type Action, type Capability, type Decision, type Observation, type RunResult, type Step } from './schema.js';
import { DEFAULT_GOAL, exceptions, inputFields, invocationBindings, outputFields, profileDigest, targets } from './profile.js';
import { Policy } from './policy.js';
import { Evidence } from './evidence.js';
import { Control } from './control.js';
import { WebSurface } from './surface.js';
import type { DecisionProvider } from './model.js';

export type RunOptions = { mode: 'discovery' | 'replay'; target: string; inputs: Record<string, unknown>; policy: Policy; evidenceRoot: string; scenario?: string; goal?: string; provider?: DecisionProvider; artifact?: Capability; headed?: boolean };
export type Intervention = { id: string; reason: string; step: number; expected: string[]; observation: Observation; evidenceFile: string; epoch: number; createdAt: string };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const screens = (o: Observation) => o.markers.filter(x => ['search', 'results', 'detail', 'form', 'review'].includes(x));
class BusinessOutcome extends RuntimeFault {}

export class Run {
  id = randomUUID(); sessionId = randomUUID(); control = new Control();
  surface: WebSurface; evidence: Evidence; abort = new AbortController();
  status: 'queued' | 'running' | 'blocked' | 'done' = 'queued';
  step = 0; llmCalls = 0; recoveries = 0; handoffs = 0;
  outputs: Record<string, string> = {}; inputs: Record<string, string> = {};
  artifact: Capability | null = null; result: RunResult | null = null;
  intervention: Intervention | null = null; observation: Observation = { markers: [], controls: [], blocked: null };
  expected: string[] = []; done!: Promise<RunResult>;
  private resolveHandoff: (() => void) | null = null;
  private rejectHandoff: ((reason: unknown) => void) | null = null;
  private deadline = 0;
  constructor(public options: RunOptions) {
    this.surface = new WebSurface(this.sessionId, options.policy);
    this.evidence = new Evidence(join(options.evidenceRoot, this.id), this.id, this.sessionId);
  }
  start() { this.done = this.execute(); return this; }
  private live() {
    if (this.abort.signal.aborted) throw new RuntimeFault('cancelled');
    if (Date.now() > this.deadline) throw new RuntimeFault('run_timeout');
  }
  private async observe() {
    this.observation = await this.control.gate(() => this.surface.observe());
    return this.observation;
  }
  private async act(action: Action) {
    return this.control.gate(async () => {
      this.live(); this.control.assertAutomation();
      const risk = this.options.policy.action(action);
      this.evidence.event('action_started', { step: this.step, actor: 'automation', epoch: this.control.epoch, action, risk });
      const current = await this.surface.observe();
      if (current.blocked || exceptions.some(e => e.code !== 'interstitial' && current.markers.includes(e.code)) || !this.expected.every(marker => current.markers.includes(marker))) throw new RuntimeFault('state_changed_before_action', this.expected, current.markers);
      const result = await this.surface.act(action, this.inputs);
      this.evidence.event('action_finished', { step: this.step, actor: 'automation', action });
      return result;
    });
  }
  private async settle(expected: string[], timeoutMs = 3000): Promise<Observation> {
    this.expected = expected;
    let end = Date.now() + timeoutMs; let loadingSeen = false; let dismissed = false;
    while (true) {
      this.live();
      if (this.control.owner !== 'automation') { await sleep(50); end = Date.now() + timeoutMs; continue; }
      const observed = await this.observe();
      if (observed.blocked) throw new RuntimeFault(observed.blocked, expected, observed.markers);
      if (!observed.markers.includes('vendor_v1')) throw new RuntimeFault('profile_drift', ['vendor_v1'], observed.markers);
      const business = ['not_found', 'validation'].find(x => observed.markers.includes(x));
      if (business) throw new BusinessOutcome(business, expected, observed.markers);
      const hard = ['permission', 'session_expired', 'app_error', 'unknown_dialog'].find(x => observed.markers.includes(x));
      if (hard) {
        await this.handoff(hard, expected, observed); end = Date.now() + timeoutMs; continue;
      }
      if (observed.markers.includes('interstitial')) {
        if (dismissed) throw new RuntimeFault('recovery_exhausted', expected, observed.markers);
        dismissed = true; this.recoveries++;
        this.evidence.event('recovery', { step: this.step, code: 'interstitial', action: 'dismiss_once' });
        await this.act({ kind: 'click', target: 'dismiss' }); continue;
      }
      if (observed.markers.includes('loading')) {
        if (!loadingSeen) { loadingSeen = true; this.recoveries++; this.evidence.event('recovery', { step: this.step, code: 'loading', action: 'bounded_wait' }); }
      } else if (expected.length ? expected.every(x => observed.markers.includes(x)) : screens(observed).length === 1) {
        this.evidence.event('checkpoint_verified', { step: this.step, expected, observed: observed.markers });
        return observed;
      }
      if (Date.now() > end) throw new RuntimeFault('checkpoint_timeout', expected, observed.markers);
      await sleep(75);
    }
  }
  async handoff(reason: string, expected: string[], observation = this.observation) {
    if (++this.handoffs > 3) throw new RuntimeFault('handoff_limit', expected, observation.markers);
    let wait!: Promise<void>;
    await this.control.gate(async () => {
      this.live(); this.control.cede();
      const dom = await this.surface.snapshot().catch(() => undefined);
      const evidenceFile = this.evidence.snapshot(observation, this.step, dom);
      this.intervention = { id: randomUUID(), reason, step: this.step, expected, observation, evidenceFile, epoch: this.control.epoch, createdAt: new Date().toISOString() };
      this.evidence.event('intervention_requested', { interventionId: this.intervention.id, reason, step: this.step, expected, observation, epoch: this.control.epoch, capabilityId: this.options.artifact?.id || 'discovery', goal: 'prepare_savings_review' });
      wait = new Promise<void>((resolve, reject) => { this.resolveHandoff = resolve; this.rejectHandoff = reject; });
      this.status = 'blocked';
    });
    const timer = setTimeout(() => this.rejectHandoff?.(new RuntimeFault('handoff_timeout', expected, observation.markers)), this.options.policy.config.handoffTimeoutMs);
    try { await wait; } finally { clearTimeout(timer); this.resolveHandoff = null; this.rejectHandoff = null; }
  }
  async claim(epoch: number) {
    return this.control.gate(() => {
      this.live(); const lease = this.control.claim(epoch);
      this.evidence.event('control_claimed', { actor: 'human', epoch: lease.epoch, step: this.step });
      return lease;
    });
  }
  async humanAction(token: string, epoch: number, action: Action, values: Record<string, string>) {
    return this.control.gate(async () => {
      this.live(); this.control.assertHuman(token, epoch);
      this.options.policy.action(action, true);
      const inputs = { ...this.inputs };
      if (action.kind === 'fill') {
        const value = values[action.input];
        inputs[action.input] = validateValues({ [action.input]: inputFields[action.input] }, { [action.input]: value })[action.input];
      }
      this.evidence.event('human_action_started', { actor: 'human', epoch, step: this.step, action });
      await this.surface.act(action, inputs, true);
      this.observation = await this.surface.observe();
      this.evidence.event('human_action_finished', { actor: 'human', epoch, step: this.step, action, observation: this.observation });
      return this.observation;
    });
  }
  async resume(token: string, epoch: number) {
    return this.control.gate(async () => {
      this.live(); this.control.assertHuman(token, epoch);
      const observed = await this.surface.observe();
      const expected = this.intervention?.expected || [];
      const errors = exceptions.filter(x => x.class !== 'recoverable').map(x => x.code);
      if (observed.blocked || errors.some(x => observed.markers.includes(x)) || !observed.markers.includes('vendor_v1') || !expected.every(x => observed.markers.includes(x))) throw new RuntimeFault('resume_checkpoint_rejected', expected, observed.markers);
      this.observation = observed;
      this.control.resume(token, epoch); this.status = 'running';
      this.evidence.event('control_resumed', { actor: 'automation', step: this.step, epoch: this.control.epoch, observation: observed });
      this.intervention = null; this.resolveHandoff?.();
    });
  }
  async stop() {
    this.abort.abort();
    await this.control.gate(async () => { this.rejectHandoff?.(new RuntimeFault('cancelled')); this.control.close(); await this.surface.close(); });
  }
  private async replay(artifact: Capability) {
    for (const [index, step] of artifact.steps.entries()) {
      this.step = index; this.live();
      await this.settle(step.before, step.timeoutMs);
      const value = await this.act(step.action);
      if (step.action.kind === 'read' && value !== undefined) this.outputs[step.action.output] = value;
      await this.settle(step.after, step.timeoutMs);
    }
    await this.settle(artifact.checkpoint.markers);
    await this.control.gate(() => { this.live(); this.control.assertAutomation(); return this.surface.verifyInputs(this.inputs); });
    this.outputs = validateValues(artifact.outputs, this.outputs, 'invalid_output');
  }
  private async discover(provider: DecisionProvider) {
    const history: Decision[] = []; const steps: Step[] = []; const hashes: string[] = [];
    let repeats = 0;
    for (this.step = 0; this.step < this.options.policy.config.maxSteps; this.step++) {
      const observed = await this.settle([]);
      hashes.push(this.evidence.observation(observed, this.step));
      const decisionEpoch = this.control.epoch;
      const response = await provider.decide(this.options.goal || DEFAULT_GOAL, observed, history, Object.keys(this.outputs), this.abort.signal);
      this.live(); this.llmCalls++;
      const decision = DecisionSchema.parse(response.decision);
      this.evidence.event('model_decision', { step: this.step, provider: provider.name, model: provider.model, receipt: response.receipt, decision });
      if (decisionEpoch !== this.control.epoch) { this.evidence.event('stale_decision_discarded', { step: this.step }); continue; }
      repeats = JSON.stringify(decision) === JSON.stringify(history.at(-1)) ? repeats + 1 : 0;
      if (repeats >= 2) throw new RuntimeFault('discovery_dead_end');
      history.push(decision);
      if (decision.kind === 'handoff') { await this.handoff('model_blocked', screens(observed)); continue; }
      if (decision.kind === 'complete') {
        await this.settle(['review']);
        await this.control.gate(() => { this.live(); this.control.assertAutomation(); return this.surface.verifyInputs(this.inputs); });
        this.outputs = validateValues(outputFields, this.outputs, 'invalid_output');
        if (this.handoffs > 0) throw new RuntimeFault('manual_discovery_requires_rerecord');
        const usedTargets = Object.fromEntries(steps.map(s => [s.action.target, targets[s.action.target as keyof typeof targets]]));
        this.artifact = CapabilitySchema.parse({ schemaVersion: '1.0', id: 'prepare-savings-review', version: '1.0.0',
          description: 'Locate a member, prepare a savings sub-account, read current savings balance and stop at review. Never submits.',
          app: { vendor: 'northstar-training', surface: 'web', profileVersion: '1.0', profileDigest },
          inputs: inputFields, outputs: outputFields, targets: usedTargets, steps,
          checkpoint: { markers: ['review'], outputs: ['savingsBalance', 'reviewStatus'], invocationBindings }, exceptions,
          provenance: { discoveryRunId: this.id, provider: provider.name, model: provider.model, completedAt: new Date().toISOString(), llmCalls: this.llmCalls, observationHashes: hashes },
        });
        this.options.policy.artifact(this.artifact);
        writeFileSync(join(this.evidence.dir, 'capability.json'), JSON.stringify(this.artifact, null, 2) + '\n');
        this.evidence.event('capability_emitted', { id: this.artifact.id, version: this.artifact.version, steps: steps.length });
        return;
      }
      if (!observed.controls.some(c => c.id === decision.target && c.actions.includes(decision.kind))) throw new RuntimeFault('model_target_invalid');
      const action: Action = decision.kind === 'fill' ? { kind: 'fill', target: decision.target, input: decision.input } : decision.kind === 'read' ? { kind: 'read', target: decision.target, output: decision.output } : { kind: 'click', target: decision.target };
      const risk = this.options.policy.action(action);
      const value = await this.act(action);
      if (action.kind === 'read' && value !== undefined) this.outputs[action.output] = value;
      const after = await this.settle([]);
      steps.push({ id: `step${steps.length + 1}`, action, risk: risk as 'read' | 'reversible', before: screens(observed), after: screens(after), timeoutMs: 3000, retry: { maxAttempts: 1, onlyIf: 'before-action' } });
    }
    throw new RuntimeFault('step_limit');
  }
  private async execute(): Promise<RunResult> {
    this.status = 'running'; this.deadline = Date.now() + this.options.policy.config.runTimeoutMs;
    this.evidence.event('run_started', { mode: this.options.mode, syntheticData: true, policy: this.options.policy.config, profileDigest });
    let status: RunResult['status'] = 'success'; let code = 'checkpoint_verified'; let fault: RuntimeFault | undefined;
    try {
      this.inputs = validateValues(inputFields, this.options.inputs);
      if (this.options.mode === 'replay') {
        this.artifact = CapabilitySchema.parse(this.options.artifact);
        this.options.policy.artifact(this.artifact);
      }
      await this.surface.launch(this.options.target, this.options.scenario || 'normal', this.options.headed);
      if (this.options.mode === 'discovery') {
        if (!this.options.provider) throw new RuntimeFault('model_provider_missing');
        await this.discover(this.options.provider);
      } else await this.replay(this.artifact!);
    } catch (error) {
      fault = error instanceof RuntimeFault ? error : new RuntimeFault('runtime_error');
      status = error instanceof BusinessOutcome ? 'business_outcome' : 'failure'; code = fault.code;
      const dom = this.surface.page ? await this.control.gate(() => this.surface.snapshot().catch(() => undefined)) : undefined;
      this.evidence.snapshot(this.observation, this.step, dom);
      // Unknown hard errors still route a real intervention. Never blindly retry a possibly committed click.
      if (status === 'failure' && this.surface.page && !this.abort.signal.aborted && this.handoffs === 0) {
        try { await this.handoff(code, this.expected); } catch { /* Preserve the original cause in the result. */ }
      }
    } finally {
      await this.control.gate(async () => { this.control.close(); await this.surface.close().catch(() => {}); });
    }
    this.result = { runId: this.id, sessionId: this.sessionId, capabilityId: this.artifact?.id || null, mode: this.options.mode, status, code, step: this.step,
      expected: fault?.expected || this.expected, observed: fault?.observed.length ? fault.observed : this.observation.markers,
      outputs: status === 'success' ? this.outputs : {}, llmCalls: this.llmCalls, recoveries: this.recoveries, handoffs: this.handoffs,
      ...(fault ? { errorId: randomUUID() } : {}),
      ...(fault && this.intervention ? { cause: this.intervention.reason } : {}),
    };
    this.status = 'done'; this.intervention = null; this.evidence.result(this.result);
    return this.result;
  }
  snapshot() {
    return { id: this.id, sessionId: this.sessionId, mode: this.options.mode, status: this.status, step: this.step, control: { owner: this.control.owner, epoch: this.control.epoch },
      observation: this.observation, intervention: this.intervention, llmCalls: this.llmCalls, handoffs: this.handoffs, recoveries: this.recoveries,
      result: this.result ? { ...this.result, outputs: Object.fromEntries(Object.entries(this.result.outputs).map(([key,value]) => [key, key === 'reviewStatus' ? value : '[REDACTED]'])) } : null,
    };
  }
}
