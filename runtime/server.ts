import express from 'express';
import type { Server } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Run } from './engine.js';
import { ActionSchema, CapabilitySchema, RuntimeFault } from './schema.js';
import { defaultPolicy, Policy } from './policy.js';
import { CodexProvider, OpenAIProvider } from './model.js';
import { DEFAULT_GOAL } from './profile.js';
import uiText from './ui-text.json';

export const projectRoot = fileURLToPath(new URL('..', import.meta.url));
export const scenarios = ['normal', 'slow', 'timeout', 'permission', 'app-error', 'unknown-dialog', 'interstitial', 'session-expired', 'drift', 'duplicate', 'bad-output', 'wrong-member'] as const;
const RequestSchema = z.strictObject({ mode: z.enum(['discovery', 'replay']), goal: z.string().min(1).max(1000).optional(), target: z.string().url().optional(),
  inputs: z.record(z.string(), z.string()), provider: z.enum(['codex', 'openai']).optional(), scenario: z.enum(scenarios).default('normal'), artifact: CapabilitySchema.optional(), headed: z.boolean().default(false) });
const LeaseSchema = z.strictObject({ token: z.string().uuid(), epoch: z.number().int() });

export function createServer(port = 4317, evidenceRoot = join(projectRoot, 'var/runs')) {
  const app = express(); const runs = new Map<string, Run>(); let server: Server;
  const origin = `http://127.0.0.1:${port}`;
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; frame-ancestors 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'");
    // This console is local. Check host and origin before accepting control requests.
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) { res.status(403).json({ code: 'host_denied' }); return; }
    if (req.method !== 'GET' && ((req.headers.origin && req.headers.origin !== origin && req.headers.origin !== 'http://127.0.0.1:5178') || !req.is('application/json'))) { res.status(403).json({ code: 'origin_denied' }); return; }
    next();
  });
  app.use(express.json({ limit: '96kb' }));
  app.get('/legacy', (_req, res) => res.sendFile(join(projectRoot, 'fixture/index.html')));
  app.get('/legacy/frame', (_req, res) => res.sendFile(join(projectRoot, 'fixture/frame.html')));
  app.get('/legacy/ui.js', (_req, res) => res.sendFile(join(projectRoot, 'fixture/ui.js')));
  const getRun = (id: string) => { const run = runs.get(id); if (!run) throw new RuntimeFault('run_not_found'); return run; };
  const startRun = (body: unknown) => {
    if ([...runs.values()].some(run => run.status !== 'done')) throw new RuntimeFault('worker_busy');
    const value = RequestSchema.parse(body);
    const artifact = value.artifact || (value.mode === 'replay' && existsSync(join(projectRoot, 'evidence/capability.json')) ? CapabilitySchema.parse(JSON.parse(readFileSync(join(projectRoot, 'evidence/capability.json'), 'utf8'))) : undefined);
    if (value.mode === 'replay' && !artifact) throw new RuntimeFault('artifact_required');
    const run = new Run({ ...value, artifact, evidenceRoot, target: value.target || `${origin}/legacy`, policy: new Policy(defaultPolicy(origin)),
      provider: value.mode === 'discovery' ? (value.provider === 'openai' ? new OpenAIProvider() : new CodexProvider()) : undefined });
    runs.set(run.id, run); run.start(); return run;
  };
  app.get('/api/automation/runs', (_req,res) => res.json([...runs.values()].map(run => run.snapshot()).reverse()));
  app.post('/api/automation/runs', (req,res) => { const run = startRun(req.body); res.status(202).json(run.snapshot()); });
  app.get('/api/automation/runs/:id', (req,res) => res.json(getRun(req.params.id).snapshot()));
  app.get('/api/automation/runs/:id/events', (req,res) => res.json(getRun(req.params.id).evidence.events));
  app.get('/api/automation/runs/:id/capability', (req,res) => { const artifact = getRun(req.params.id).artifact; if (!artifact) throw new RuntimeFault('artifact_not_ready'); res.json(artifact); });
  app.post('/api/automation/runs/:id/claim', async (req,res) => { const { epoch } = z.strictObject({ epoch: z.number().int() }).parse(req.body); res.json(await getRun(req.params.id).claim(epoch)); });
  app.post('/api/automation/runs/:id/act', async (req,res) => {
    const data = LeaseSchema.extend({ action: ActionSchema, values: z.record(z.string(), z.string()).default({}) }).parse(req.body);
    res.json(await getRun(req.params.id).humanAction(data.token, data.epoch, data.action, data.values));
  });
  app.post('/api/automation/runs/:id/resume', async (req,res) => { const data = LeaseSchema.parse(req.body); await getRun(req.params.id).resume(data.token, data.epoch); res.json(getRun(req.params.id).snapshot()); });
  app.post('/api/automation/runs/:id/stop', async (req,res) => { await getRun(req.params.id).stop(); res.json({ code: 'stopping' }); });
  app.post('/api/automation/runs/:id/pause', (req,res) => {
    const run = getRun(req.params.id); if (run.control.owner !== 'automation' || run.status === 'done') throw new RuntimeFault('control_not_owned');
    void run.handoff('operator_pause', run.expected).catch(() => run.stop()); res.status(202).json({ code: 'pause_requested' });
  });
  const snapshot = () => {
    const all = [...runs.values()]; const active = all.filter(x => x.status !== 'done'); const latest = all.at(-1); const events = all.flatMap(r => r.evidence.events).slice(-40).reverse();
    return { runtime: { online: true, status: latest?.status === 'blocked' ? 'paused' : 'online', systemName: 'Capability Runtime', cadenceLabel: 'On demand', activeRuns: active.length, runLimit: 1,
      engineVersion: '1.0.0', lastRunLabel: latest ? latest.status : 'No runs yet', simulation: false, secureMode: true, throughput: all.filter(r => r.result?.status === 'success').length, queueDepth: 0,
      successRate: all.filter(r => r.result).length ? Math.round(100 * all.filter(r => r.result?.status === 'success').length / all.filter(r => r.result).length) : 0,
      autoRun: { enabled: false, running: false, intervalMinutes: 0 } }, autoRun: { enabled: false, running: false, intervalMinutes: 0 },
      tasks: all.slice(-10).reverse().map(r => ({ id: r.id, title: `${r.options.mode === 'discovery' ? 'Discovery' : 'Replay'} · savings review`, owner: r.control.owner, status: r.status, resultStatus: r.result?.status, priority: r.status === 'blocked' ? 'high' : 'normal', progress: r.status === 'done' ? 100 : Math.min(95, r.step * 10), updatedAt: new Date().toISOString(), note: r.result?.code || r.intervention?.reason || 'Working in the application' })),
      integrations: [{ id: 'legacy-core', name: 'Northstar training core', status: 'connected', scope: 'UI only · synthetic records', latencyMs: 0, lastSeenAt: new Date().toISOString() }],
      logs: events.map((event, index) => ({ id: `${event.runId}-${index}`, time: event.time, type: String(event.type).includes('failure') ? 'error' : 'info', source: 'runtime', message: `${event.type} · step ${event.step ?? '—'}` })),
      notifications: active.filter(r => r.intervention).map(r => ({ id: r.intervention!.id, time: r.intervention!.createdAt, type: 'warning', category: 'workflow', source: 'runtime', title: 'Operator needed', message: r.intervention!.reason, target: 'Control room' })),
    };
  };
  app.get('/api/automation/snapshot', (_req,res) => res.json(snapshot()));
  app.post('/api/automation/run', (_req,res) => { startRun({ mode: 'replay', inputs: { memberId: 'S1002', nickname: 'Rainy day' } }); res.status(202).json(snapshot()); });
  app.post('/api/automation/sync', (_req,res) => res.json(snapshot()));
  app.post('/api/automation/stop', async (_req,res) => { await Promise.all([...runs.values()].filter(r => r.status !== 'done').map(r => r.stop())); res.json(snapshot()); });
  app.post('/api/automation/pause', (_req,res) => { const run = [...runs.values()].find(r => r.status === 'running'); if (!run) throw new RuntimeFault('no_active_run'); void run.handoff('operator_pause', run.expected).catch(() => run.stop()); res.json(snapshot()); });
  app.post('/api/automation/resume', (_req,res) => res.status(409).json({ code: 'use_operator_lease_to_resume' }));
  app.post('/api/automation/auto/:command', (_req,res) => res.status(422).json({ code: 'scheduling_out_of_scope' }));
  app.get('/operator/:id', (_req,res) => res.sendFile(join(projectRoot, 'operator/index.html')));
  app.get('/operator-copy.json', (_req,res) => res.json(uiText));
  app.get('/operator.js', (_req,res) => res.sendFile(join(projectRoot, 'operator/operator.js')));
  app.get('/operator.css', (_req,res) => res.sendFile(join(projectRoot, 'operator/operator.css')));
  app.use(express.static(join(projectRoot, 'dist')));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof RuntimeFault ? 409 : 400).json({ code: error instanceof RuntimeFault ? error.code : 'invalid_request' });
  });
  return { app, runs, origin,
    listen: () => new Promise<Server>(resolve => { server = app.listen(port, '127.0.0.1', () => resolve(server)); }),
    close: async () => { await Promise.all([...runs.values()].filter(r => r.status !== 'done').map(r => r.stop())); await new Promise<void>(resolve => server?.close(() => resolve())); },
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4317); const service = createServer(port);
  await service.listen(); console.log(`DaOS runtime: ${service.origin}`);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { void service.close().then(() => process.exit(0)); });
}
