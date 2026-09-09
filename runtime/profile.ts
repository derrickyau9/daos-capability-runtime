import { createHash } from 'node:crypto';
import type { Action, Field, Target } from './schema.js';

const button = (name: string): Target => ({ frame: ['workbench'], strategy: 'role', role: 'button', name, control: 'text', exact: true, cardinality: 1 });
const cell = (name: string, control: 'input' | 'text'): Target => ({ frame: ['workbench'], strategy: 'label-adjacent', role: control === 'input' ? 'textbox' : 'text', name, control, exact: true, cardinality: 1 });
export const targets = {
  memberId: cell('Member number', 'input'), search: button('Find member'),
  detail: button('Open member'), prepare: button('New savings sub-account'),
  nickname: cell('Account nickname', 'input'), review: button('Review request'),
  balance: cell('Current savings balance', 'text'), reviewStatus: cell('Request status', 'text'),
  dismiss: button('Continue working'), unlock: button('Restore training session'),
  confirm: button('Submit account'),
} satisfies Record<string, Target>;
export type TargetId = keyof typeof targets;
export const inputFields: Record<string, Field> = {
  memberId: { type: 'string', description: 'Member reference supplied at invocation.', sensitive: true, minLength: 1, maxLength: 64, values: [] },
  nickname: { type: 'string', description: 'Nickname for the proposed savings sub-account. No submission is performed.', sensitive: true, minLength: 1, maxLength: 64, values: [] },
};
export const outputFields: Record<string, Field> = {
  savingsBalance: { type: 'decimal', description: 'Existing savings balance in USD, decimal string; returned in memory and redacted on disk.', sensitive: true, minLength: 4, maxLength: 30, values: [] },
  reviewStatus: { type: 'enum', description: 'Verified review state. The account has not been opened.', sensitive: false, minLength: 1, maxLength: 64, values: ['Ready for review'] },
};
// Trusted vendor vocabulary. Unknown page prose is never sent to the model or evidence sink.
export const markers = {
  search: 'Member search', results: 'Search results', detail: 'Member overview', form: 'Account setup', review: 'Account review',
  not_found: 'No member found', validation: 'Validation failed', permission: 'Permission denied',
  session_expired: 'Session expired', loading: 'Loading records', interstitial: 'Scheduled maintenance notice',
  app_error: 'Application unavailable', unknown_dialog: 'Supervisor confirmation required',
  vendor_v1: 'Northstar Training Core v1',
} as const;
export const exceptions = [
  { code: 'not_found', class: 'business', response: 'return' },
  { code: 'validation', class: 'business', response: 'return' },
  { code: 'loading', class: 'recoverable', response: 'wait' },
  { code: 'interstitial', class: 'recoverable', response: 'dismiss' },
  { code: 'permission', class: 'hard', response: 'handoff' },
  { code: 'session_expired', class: 'hard', response: 'handoff' },
  { code: 'app_error', class: 'hard', response: 'handoff' },
  { code: 'unknown_dialog', class: 'hard', response: 'handoff' },
] as const;
export const grants: Record<TargetId, { actions: Action['kind'][]; risk: 'read' | 'reversible' | 'irreversible' | 'human-only' }> = {
  memberId: { actions: ['fill'], risk: 'reversible' }, search: { actions: ['click'], risk: 'read' },
  detail: { actions: ['click'], risk: 'read' }, prepare: { actions: ['click'], risk: 'reversible' },
  nickname: { actions: ['fill'], risk: 'reversible' }, review: { actions: ['click'], risk: 'reversible' },
  balance: { actions: ['read'], risk: 'read' }, reviewStatus: { actions: ['read'], risk: 'read' },
  dismiss: { actions: ['click'], risk: 'reversible' }, unlock: { actions: ['click'], risk: 'human-only' },
  confirm: { actions: ['click'], risk: 'irreversible' },
};
export const invocationBindings = { memberId: cell('Member reference', 'text'), nickname: cell('Account nickname', 'text') };
export const profile = { vendor: 'northstar-training', version: '1.0', targets, markers, grants, exceptions, inputs: inputFields, outputs: outputFields, invocationBindings };
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const profileDigest = digest(profile);
export const DEFAULT_GOAL = 'Find the member using memberId, prepare a new savings sub-account using nickname, and reach the account review screen. Return the current savings balance and the request status. Do not submit the account.';
