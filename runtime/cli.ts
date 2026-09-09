import { parseArgs } from 'node:util';
import { readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createServer, projectRoot } from './server.js';
import { Run } from './engine.js';
import { CapabilitySchema } from './schema.js';
import { defaultPolicy, Policy, PolicySchema } from './policy.js';
import { CodexProvider, OpenAIProvider } from './model.js';
import { DEFAULT_GOAL } from './profile.js';

const { positionals, values } = parseArgs({ allowPositionals: true, options: {
  artifact: { type: 'string', default: 'evidence/capability.json' }, params: { type: 'string' }, 'params-file': { type: 'string' },
  provider: { type: 'string', default: 'codex' }, goal: { type: 'string', default: DEFAULT_GOAL }, target: { type: 'string' },
  scenario: { type: 'string', default: 'normal' }, out: { type: 'string', default: 'var/runs' }, save: { type: 'string' },
  port: { type: 'string', default: '4317' }, 'handoff-timeout': { type: 'string', default: '180000' }, headed: { type: 'boolean', default: false }, policy: { type: 'string' },
} });
const mode = positionals[0];
if (mode !== 'discover' && mode !== 'replay') throw new Error('Use discover or replay');
const port = Number(values.port); const service = createServer(port);
await service.listen();
const params = values['params-file'] ? JSON.parse(readFileSync(values['params-file'], 'utf8')) : values.params ? JSON.parse(values.params) : { memberId: 'S1001', nickname: 'Rainy day' };
const config = values.policy ? PolicySchema.parse(JSON.parse(readFileSync(values.policy, 'utf8'))) : defaultPolicy(service.origin);
config.handoffTimeoutMs = Number(values['handoff-timeout']);
const run = new Run({ mode: mode === 'discover' ? 'discovery' : 'replay', target: values.target || `${service.origin}/legacy`, inputs: params, scenario: values.scenario,
  evidenceRoot: values.out!, policy: new Policy(config), goal: values.goal, headed: values.headed,
  provider: mode === 'discover' ? (values.provider === 'openai' ? new OpenAIProvider() : new CodexProvider()) : undefined,
  artifact: mode === 'replay' ? CapabilitySchema.parse(JSON.parse(readFileSync(values.artifact!, 'utf8'))) : undefined,
});
service.runs.set(run.id, run);
console.log(`Run ${run.id}; operator: ${service.origin}/operator/${run.id}`);
const report = setInterval(() => console.log(`${run.status} | step ${run.step} | ${run.control.owner} | LLM calls ${run.llmCalls}${run.intervention ? ' | ' + run.intervention.reason : ''}`), 15000);
try {
  const result = await run.start().done;
  console.log(JSON.stringify(result, null, 2)); // Typed outputs go to the authorized caller; disk evidence is redacted.
  if (run.artifact && mode === 'discover' && result.status === 'success') {
    const destination = values.save || join(projectRoot, 'var/capability.json'); mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(run.evidence.dir, 'capability.json'), destination); console.log(`Capability saved: ${destination}`);
  }
  process.exitCode = result.status === 'failure' ? 1 : 0;
} finally { clearInterval(report); await service.close(); }
