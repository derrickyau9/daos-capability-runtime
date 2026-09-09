import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../runtime/server.js';
import { Run } from '../runtime/engine.js';
import { CapabilitySchema } from '../runtime/schema.js';
import { Policy, defaultPolicy } from '../runtime/policy.js';

// Offline, repeatable verification. The artifact comes from the separately recorded live LLM discovery.
const service = createServer(4318); await service.listen();
const artifact = CapabilitySchema.parse(JSON.parse(readFileSync('evidence/capability.json','utf8')));
const results: unknown[] = [];
try {
  for (const [label, scenario, memberId] of [
    ['replay','normal','S1002'],['not-found','normal','S9999'],['validation','normal','bad-input'],
    ['slow','slow','S1002'],['interstitial','interstitial','S1002'],['handoff','session-expired','S1002'],
    ['permission','permission','S1002'],['timeout','timeout','S1002'],['unknown-dialog','unknown-dialog','S1002'],
  ]) {
    const config = defaultPolicy(service.origin); config.handoffTimeoutMs = label === 'handoff' ? 10000 : 600;
    const run = new Run({ mode:'replay',target:service.origin+'/legacy',inputs:{memberId,nickname:'Reserve'},scenario,artifact,policy:new Policy(config),evidenceRoot:`var/demo/${label}` });
    service.runs.set(run.id,run); run.start();
    if (label === 'handoff') {
      const until = Date.now()+10000;
      while (run.status !== 'blocked' && !run.result) { if(Date.now()>until) throw Error('handoff_not_reached'); await new Promise(resolve=>setTimeout(resolve,25)); }
      assert.equal(run.intervention?.reason,'session_expired');
      run.evidence.event('demo_operator', { implementation:'scripted_operator', purpose:'repeatable_handoff_test' });
      const lease = await run.claim(run.control.epoch);
      await run.humanAction(lease.token,lease.epoch,{kind:'click',target:'unlock'},{});
      await run.resume(lease.token,lease.epoch);
    }
    const result = await run.done;
    assert.equal(result.llmCalls,0);
    const expectedStatus = ['not-found','validation'].includes(label) ? 'business_outcome' : ['permission','timeout','unknown-dialog'].includes(label) ? 'failure' : 'success';
    assert.equal(result.status,expectedStatus);
    if (result.status==='success') assert.equal(result.outputs.savingsBalance,'987.65');
    results.push({ label, status:result.status, code:result.code, llmCalls:result.llmCalls, recoveries:result.recoveries, handoffs:result.handoffs, evidence:run.evidence.dir });
    console.log(`${label}: ${result.status} (${result.code}); model calls=${result.llmCalls}`);
  }
  mkdirSync('var/demo',{recursive:true}); writeFileSync(join('var/demo','summary.json'),JSON.stringify(results,null,2)+'\n');
} finally { await service.close(); }
