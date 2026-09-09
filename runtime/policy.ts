import { z } from 'zod';
import { RuntimeFault, type Action, type Capability } from './schema.js';
import { digest, exceptions, grants, inputFields, invocationBindings, outputFields, profileDigest, targets, type TargetId } from './profile.js';

export const PolicySchema = z.strictObject({
  origins: z.array(z.string().url().refine(value => { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && value === url.origin; })).min(1),
  routes: z.array(z.string().regex(/^\/[a-zA-Z0-9/_.-]*$/)).min(1),
  actions: z.array(z.enum(['click', 'fill', 'read'])).min(1),
  maxSteps: z.number().int().min(1).max(30),
  runTimeoutMs: z.number().int().min(1000).max(900000),
  handoffTimeoutMs: z.number().int().min(500).max(600000),
});
export type PolicyConfig = z.infer<typeof PolicySchema>;
export const defaultPolicy = (origin: string): PolicyConfig => ({ origins: [origin], routes: ['/legacy', '/legacy/frame', '/legacy/ui.js'], actions: ['click', 'fill', 'read'], maxSteps: 20, runTimeoutMs: 600000, handoffTimeoutMs: 180000 });
export class Policy {
  config: PolicyConfig;
  constructor(config: PolicyConfig) { this.config = PolicySchema.parse(config); }
  allowsUrl(url: string) {
    try {
      const parsed = new URL(url);
      return !parsed.username && !parsed.password && !parsed.search && !parsed.hash && this.config.origins.includes(parsed.origin) && this.config.routes.includes(parsed.pathname);
    } catch { return false; }
  }
  url(url: string) { if (!this.allowsUrl(url)) throw new RuntimeFault('policy_url_blocked'); }
  action(action: Action, human = false) {
    const grant = grants[action.target as TargetId];
    if (!grant || !this.config.actions.includes(action.kind) || !grant.actions.includes(action.kind)) throw new RuntimeFault('policy_action_blocked');
    if (grant.risk === 'irreversible') throw new RuntimeFault('irreversible_blocked');
    if (grant.risk === 'human-only' && !human) throw new RuntimeFault('human_required');
    if (action.kind === 'fill' && (action.input !== action.target || !Object.hasOwn(inputFields, action.input))) throw new RuntimeFault('input_binding_invalid');
    if (action.kind === 'read' && !((action.target === 'balance' && action.output === 'savingsBalance') || (action.target === 'reviewStatus' && action.output === 'reviewStatus'))) throw new RuntimeFault('output_binding_invalid');
    return grant.risk;
  }
  artifact(artifact: Capability) {
    if (artifact.app.vendor !== 'northstar-training' || artifact.app.profileDigest !== profileDigest) throw new RuntimeFault('profile_mismatch');
    if (digest(artifact.inputs) !== digest(inputFields) || digest(artifact.outputs) !== digest(outputFields) || digest(artifact.exceptions) !== digest(exceptions)) throw new RuntimeFault('contract_mismatch');
    if (artifact.steps.length > this.config.maxSteps) throw new RuntimeFault('step_limit');
    const ids = new Set<string>();
    for (const step of artifact.steps) {
      if (ids.has(step.id)) throw new RuntimeFault('duplicate_step');
      ids.add(step.id);
      const risk = this.action(step.action);
      if (step.risk !== risk || digest(artifact.targets[step.action.target]) !== digest(targets[step.action.target as TargetId])) throw new RuntimeFault('target_or_risk_mismatch');
      if (step.before.some(x => !['search', 'results', 'detail', 'form', 'review'].includes(x)) || step.after.some(x => !['search', 'results', 'detail', 'form', 'review'].includes(x))) throw new RuntimeFault('checkpoint_invalid');
    }
    if (digest(artifact.checkpoint) !== digest({ markers: ['review'], outputs: ['savingsBalance', 'reviewStatus'], invocationBindings })) throw new RuntimeFault('checkpoint_invalid');
  }
}
