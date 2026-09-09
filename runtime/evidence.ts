import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Observation, RunResult } from './schema.js';

export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Evidence is built from typed, closed vocabulary events, not regex-cleaned raw page content.
export class Evidence {
  seq = 0;
  previousHash = '0'.repeat(64);
  events: Record<string, unknown>[] = [];
  constructor(public dir: string, public runId: string, public sessionId: string) { mkdirSync(dir, { recursive: true }); }
  event(type: string, data: Record<string, unknown> = {}) {
    const body = { seq: ++this.seq, time: new Date().toISOString(), runId: this.runId, sessionId: this.sessionId, type, ...data, previousHash: this.previousHash };
    const eventHash = hash(body);
    const event = { ...body, eventHash };
    appendFileSync(join(this.dir, 'events.jsonl'), JSON.stringify(event) + '\n');
    this.previousHash = eventHash;
    this.events.push(event);
  }
  observation(observation: Observation, step: number) {
    const observationHash = hash(observation);
    this.event('observation', { step, observation, observationHash });
    return observationHash;
  }
  snapshot(observation: Observation, step: number, dom?: unknown) {
    const name = `failure-${step}-${this.seq}.html`;
    const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    // Rich signal: a structural DOM projection. No raw DOM, input values, or screenshots.
    const html = `<!doctype html><meta charset="utf-8"><title>Redacted surface evidence</title><style>body{font:16px system-ui;padding:32px;background:#edf1f8}pre{background:white;padding:24px;white-space:pre-wrap}</style><h1>Redacted surface projection</h1><p>Run ${this.runId} · step ${step} · sensitive cells, inputs and unknown prose omitted. DOM structure and control geometry come from the live frames.</p><pre>${escape(JSON.stringify({ observation, dom: dom || { unavailable: true } }, null, 2))}</pre>`;
    writeFileSync(join(this.dir, name), html);
    this.event('failure_evidence', { step, file: name, format: 'redacted-dom-projection', contentHash: hash(html) });
    return name;
  }
  result(result: RunResult) {
    const redacted = { ...result, outputs: Object.fromEntries(Object.keys(result.outputs).map(key => [key, key === 'reviewStatus' ? result.outputs[key] : '[REDACTED]'])) };
    writeFileSync(join(this.dir, 'result.json'), JSON.stringify(redacted, null, 2) + '\n');
    this.event('run_finished', { status: result.status, code: result.code, llmCalls: result.llmCalls, recoveries: result.recoveries, handoffs: result.handoffs });
  }
}
