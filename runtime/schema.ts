import { z } from 'zod';

export const Id = z.string().regex(/^[a-z][a-zA-Z0-9_-]{0,63}$/);
export const TargetSchema = z.strictObject({
  frame: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/)).max(4),
  strategy: z.enum(['role', 'label-adjacent']),
  role: z.enum(['button', 'heading', 'link', 'textbox', 'text']),
  name: z.string().min(1).max(100),
  control: z.enum(['input', 'text']),
  exact: z.literal(true),
  cardinality: z.literal(1),
});
export type Target = z.infer<typeof TargetSchema>;
export const ActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('click'), target: Id }),
  z.strictObject({ kind: z.literal('fill'), target: Id, input: Id }),
  z.strictObject({ kind: z.literal('read'), target: Id, output: Id }),
]);
export type Action = z.infer<typeof ActionSchema>;
export const DecisionSchema = z.strictObject({
  kind: z.enum(['click', 'fill', 'read', 'complete', 'handoff']),
  target: z.enum(['', 'memberId', 'search', 'detail', 'prepare', 'nickname', 'review', 'balance', 'reviewStatus', 'dismiss', 'unlock', 'confirm']),
  input: z.enum(['', 'memberId', 'nickname']), output: z.enum(['', 'savingsBalance', 'reviewStatus']),
  reason: z.enum(['advance', 'supply_input', 'extract_output', 'verify_goal', 'blocked']),
});
export type Decision = z.infer<typeof DecisionSchema>;
export const FieldSchema = z.strictObject({
  type: z.enum(['string', 'decimal', 'enum']),
  description: z.string().min(1).max(200),
  sensitive: z.boolean(),
  minLength: z.number().int().min(0).max(256),
  maxLength: z.number().int().min(1).max(256),
  values: z.array(z.string()).max(20),
});
export type Field = z.infer<typeof FieldSchema>;
export const StepSchema = z.strictObject({
  id: Id, action: ActionSchema,
  risk: z.enum(['read', 'reversible']),
  before: z.array(Id).min(1), after: z.array(Id).min(1),
  timeoutMs: z.number().int().min(100).max(15000),
  retry: z.strictObject({ maxAttempts: z.literal(1), onlyIf: z.literal('before-action') }),
});
export type Step = z.infer<typeof StepSchema>;
export const CapabilitySchema = z.strictObject({
  schemaVersion: z.literal('1.0'), id: Id, version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(300),
  app: z.strictObject({ vendor: Id, surface: z.literal('web'), profileVersion: z.literal('1.0'), profileDigest: z.string().regex(/^[a-f0-9]{64}$/) }),
  inputs: z.record(Id, FieldSchema), outputs: z.record(Id, FieldSchema),
  targets: z.record(Id, TargetSchema), steps: z.array(StepSchema).min(1).max(30),
  checkpoint: z.strictObject({ markers: z.array(Id).min(1), outputs: z.array(Id).min(1), invocationBindings: z.record(Id, TargetSchema) }),
  exceptions: z.array(z.strictObject({ code: Id, class: z.enum(['business', 'recoverable', 'hard']), response: z.enum(['return', 'wait', 'dismiss', 'handoff']) })),
  provenance: z.strictObject({ discoveryRunId: z.string().uuid(), provider: z.enum(['openai', 'codex']), model: z.string().max(100), completedAt: z.iso.datetime(), llmCalls: z.number().int().min(1), observationHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1) }),
});
export type Capability = z.infer<typeof CapabilitySchema>;

export type RunResult = {
  runId: string; sessionId: string; capabilityId: string | null; mode: 'discovery' | 'replay';
  status: 'success' | 'business_outcome' | 'failure';
  code: string; step: number; expected: string[]; observed: string[];
  outputs: Record<string, string>; llmCalls: number; recoveries: number; handoffs: number;
  errorId?: string;
  cause?: string;
};
export type Observation = { markers: string[]; controls: { id: string; name: string; actions: string[] }[]; blocked: string | null };
export class RuntimeFault extends Error {
  constructor(public code: string, public expected: string[] = [], public observed: string[] = []) { super(code); }
}

export function validateValues(fields: Record<string, Field>, values: Record<string, unknown>, code = 'invalid_input'): Record<string, string> {
  if (Object.keys(values).some(key => !Object.hasOwn(fields, key))) throw new RuntimeFault(code);
  const result: Record<string, string> = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = values[key];
    if (typeof value !== 'string' || value.length < field.minLength || value.length > field.maxLength ||
        (field.type === 'decimal' && !/^\d+\.\d{2}$/.test(value)) ||
        (field.type === 'enum' && !field.values.includes(value))) throw new RuntimeFault(code, [key]);
    result[key] = value;
  }
  return result;
}
