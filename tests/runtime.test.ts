import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Run } from '../runtime/engine.js';
import { CapabilitySchema, DecisionSchema, RuntimeFault, validateValues, type Capability } from '../runtime/schema.js';
import { defaultPolicy, Policy } from '../runtime/policy.js';
import { inputFields } from '../runtime/profile.js';
import { createServer } from '../runtime/server.js';
import { Control } from '../runtime/control.js';
import { get } from 'node:http';
import type { DecisionProvider } from '../runtime/model.js';

const service = createServer(4321); let artifact: Capability;
before(async () => { artifact = CapabilitySchema.parse(JSON.parse(readFileSync('evidence/capability.json','utf8'))); await service.listen(); });
after(async () => service.close());
const poisonProvider: DecisionProvider = { name:'codex', model:'must-never-run', decide:async () => { assert.fail('Replay called an LLM'); } };
function launch(scenario = 'normal', inputs = {memberId:'S1002',nickname:'Reserve'}, timeout = 600) {
  const policy = defaultPolicy(service.origin); policy.handoffTimeoutMs = timeout;
  const run = new Run({ mode:'replay', target:service.origin+'/legacy', inputs, scenario, evidenceRoot:'var/test-runs', policy:new Policy(policy), artifact, provider:poisonProvider });
  service.runs.set(run.id,run); return run.start();
}
async function until(fn:()=>boolean, timeout=10000) { const end = Date.now()+timeout; while(!fn()) { if(Date.now()>end) throw Error('condition_timeout'); await new Promise(resolve=>setTimeout(resolve,25)); } }
test('replays live iframe/table UI with new parameters and zero model calls', async () => {
  const run = launch(); const result = await run.done;
  assert.equal(result.status,'success'); assert.equal(result.llmCalls,0);
  assert.deepEqual(result.outputs,{savingsBalance:'987.65',reviewStatus:'Ready for review'});
  assert.equal(run.control.owner,'closed');
  const log = readFileSync(join(run.evidence.dir,'events.jsonl'),'utf8') + readFileSync(join(run.evidence.dir,'result.json'),'utf8');
  for(const secret of ['S1002','Reserve','987.65']) assert.equal(log.includes(secret),false);
});
test('no such member is a business outcome; no subsequent clicks', async () => {
  const run = launch('normal',{memberId:'S9999',nickname:'Reserve'}); const result = await run.done;
  assert.equal(result.status,'business_outcome'); assert.equal(result.code,'not_found');
  assert.equal(result.handoffs,0); assert.equal(result.outputs.savingsBalance,undefined);
  const actions = run.evidence.events.filter(e=>e.type==='action_started'); assert.equal(actions.length,2);
});
test('UI validation and invocation contract errors remain distinct', async () => {
  const business = await launch('normal',{memberId:'invalid',nickname:'Reserve'}).done;
  assert.equal(business.status,'business_outcome'); assert.equal(business.code,'validation');
  assert.throws(()=>validateValues(inputFields,{memberId:42,nickname:'Reserve'}),/invalid_input/);
  assert.throws(()=>validateValues(inputFields,{memberId:'S1001',nickname:'Reserve',extra:'x'}),/invalid_input/);
});
for(const scenario of ['slow','interstitial']) test(`recovers ${scenario} deterministically`,async()=>{
  const result = await launch(scenario).done; assert.equal(result.status,'success'); assert.equal(result.recoveries,1); assert.equal(result.llmCalls,0);
});
for(const [scenario,reason] of [['permission','permission'],['app-error','app_error'],['unknown-dialog','unknown_dialog'],['timeout','checkpoint_timeout'],['drift','target_missing'],['duplicate','ambiguous_target']]) test(`routes ${scenario} to intervention with safe evidence`,async()=>{
  const run = launch(scenario); const result = await run.done;
  assert.equal(result.status,'failure'); assert.equal(result.llmCalls,0); assert.equal(result.handoffs,1);
  assert.ok(run.evidence.events.some(e=>e.type==='intervention_requested' && e.reason===reason));
  assert.ok(readdirSync(run.evidence.dir).some(name=>name.endsWith('.html')));
  const snapshots = readdirSync(run.evidence.dir).filter(name=>name.endsWith('.html')).map(name=>readFileSync(join(run.evidence.dir,name),'utf8'));
  assert.ok(snapshots.some(html=>html.includes('redacted-dom-v1') && html.includes('&quot;rect&quot;')), 'Failure evidence must contain real DOM geometry');
});
test('same-session human lease, fenced concurrent claims, repair and verified resume',async()=>{
  const run = launch('session-expired',undefined,10000);
  await until(()=>run.status==='blocked');
  const originalPage = run.surface.page; const originalSession = run.sessionId;
  const claims = await Promise.allSettled([run.claim(run.control.epoch),run.claim(run.control.epoch)]);
  const granted = claims.filter(r=>r.status==='fulfilled'); assert.equal(granted.length,1);
  const lease = (granted[0] as PromiseFulfilledResult<{token:string;epoch:number}>).value;
  await assert.rejects(run.resume(lease.token,lease.epoch),/resume_checkpoint_rejected/);
  await assert.rejects(run.humanAction('invalid',lease.epoch,{kind:'click',target:'unlock'},{}),/stale_control/);
  await assert.rejects(run.humanAction(lease.token,lease.epoch,{kind:'click',target:'confirm'},{}),/irreversible_blocked/);
  await run.humanAction(lease.token,lease.epoch,{kind:'click',target:'unlock'},{});
  await run.resume(lease.token,lease.epoch);
  await assert.rejects(run.humanAction(lease.token,lease.epoch,{kind:'click',target:'unlock'},{}),/stale_control/);
  const result = await run.done;
  assert.equal(result.status,'success'); assert.equal(result.handoffs,1);
  assert.equal(run.surface.page,originalPage); assert.equal(result.sessionId,originalSession);
  assert.ok(run.evidence.events.some(e=>e.type==='human_action_finished'));
  assert.equal(JSON.stringify(run.evidence.events).includes(lease.token),false);
});
test('emergency stop cancels a blocked run without another UI action',async()=>{
  const run = launch('session-expired',undefined,10000); await until(()=>run.status==='blocked');
  const count = run.evidence.events.filter(e=>e.type==='action_started').length;
  await run.stop(); const result = await run.done;
  assert.equal(result.status,'failure'); assert.equal(result.code,'cancelled');
  assert.equal(run.evidence.events.filter(e=>e.type==='action_started').length,count);
});
test('review screen must match invocation identity and typed outputs',async()=>{
  const wrong = await launch('wrong-member').done; assert.equal(wrong.status,'failure');assert.equal(wrong.code,'invocation_mismatch');
  const bad = await launch('bad-output').done; assert.equal(bad.status,'failure');assert.equal(bad.code,'invalid_output');
});
test('policy rejects arbitrary targets, risky actions, routes and tampered artifacts',()=>{
  const policy = new Policy(defaultPolicy(service.origin));
  for(const url of ['https://example.com/legacy',service.origin+'/legacy?token=abc',service.origin+'/operator/id',service.origin+'/legacy/../api/automation/runs','http://user:pass@127.0.0.1:4321/legacy']) assert.equal(policy.allowsUrl(url),false);
  assert.throws(()=>policy.action({kind:'click',target:'confirm'}),/irreversible_blocked/);
  assert.throws(()=>policy.action({kind:'click',target:'unlock'}),/human_required/);
  assert.throws(()=>policy.action({kind:'fill',target:'memberId',input:'nickname'}),/input_binding_invalid/);
  const tampered = structuredClone(artifact); tampered.targets.search.name = 'Submit account';
  assert.throws(()=>policy.artifact(tampered),/target_or_risk_mismatch/);
  const drift = structuredClone(artifact); drift.app.profileDigest = '0'.repeat(64); assert.throws(()=>policy.artifact(drift),/profile_mismatch/);
  assert.equal(CapabilitySchema.safeParse({...artifact,schemaVersion:'2.0'}).success,false);
  assert.equal(DecisionSchema.safeParse({kind:'click',target:'raw@example.com',input:'',output:'',reason:'advance'}).success,false);
});
test('control gate waits for inflight work before ceding ownership',async()=>{
  const control = new Control(); const seen:string[]=[];
  const action = control.gate(async()=>{seen.push('started');await new Promise(resolve=>setTimeout(resolve,30));seen.push('finished');});
  const pause = control.gate(()=>{control.cede();seen.push('ceded');});
  await Promise.all([action,pause]);assert.deepEqual(seen,['started','finished','ceded']);assert.throws(()=>control.assertAutomation(),/control_not_owned/);
});
test('local operator API rejects cross-origin writes and incorrect hosts',async()=>{
  const response = await fetch(service.origin+'/api/automation/runs',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:'{}'});assert.equal(response.status,403);
  const wrongHost = await new Promise<number|undefined>((resolve,reject)=>{ get(service.origin+'/api/automation/runs',{headers:{Host:'attacker.example'}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject); });assert.equal(wrongHost,403);
});
