import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hash } from '../runtime/evidence.js';
import { CapabilitySchema } from '../runtime/schema.js';
const artifact = CapabilitySchema.parse(JSON.parse(readFileSync('evidence/capability.json','utf8')));
let count=0; let discovery=false; let replay=false; let handoff=false;
for(const dir of readdirSync('evidence',{withFileTypes:true}).filter(x=>x.isDirectory())) {
  const files = readdirSync(join('evidence',dir.name)); if(!files.includes('events.jsonl')) continue;
  const content = readFileSync(join('evidence',dir.name,'events.jsonl'),'utf8');
  const events = content.trim().split('\n').map(line=>JSON.parse(line)); let previousHash='0'.repeat(64);
  for(const [index,event] of events.entries()) {
    const {eventHash,...body}=event; assert.equal(event.seq,index+1); assert.equal(event.previousHash,previousHash); assert.equal(hash(body),eventHash); previousHash=eventHash;
    if (event.type==='failure_evidence') {
      const html=readFileSync(join('evidence',dir.name,event.file),'utf8'); assert.equal(hash(html),event.contentHash);
      assert.ok(html.includes('redacted-dom-v1') && html.includes('&quot;rect&quot;'),'Missing live DOM snapshot');
    }
  }
  const result = JSON.parse(readFileSync(join('evidence',dir.name,'result.json'),'utf8'));
  if(result.mode==='discovery' && result.status==='success') {
    discovery=true; assert.equal(result.runId,artifact.provenance.discoveryRunId);
    assert.equal(events.filter(e=>e.type==='model_decision').length,result.llmCalls);
    assert.ok(events.filter(e=>e.type==='model_decision').every(e=>e.receipt.requestId && e.receipt.inputTokens>0));
    assert.deepEqual(events.filter(e=>e.type==='observation').map(e=>e.observationHash),artifact.provenance.observationHashes);
  }
  if(result.mode==='replay') { replay=true; assert.equal(result.llmCalls,0); assert.equal(events.some(e=>e.type==='model_decision'),false); }
  if(events.some(e=>e.type==='control_resumed')) { handoff=true; assert.equal(new Set(events.map(e=>e.sessionId)).size,1); assert.ok(events.some(e=>e.type==='human_action_finished')); }
  for(const sensitive of ['2450.75','987.65','S1001','S1002','S9999','Rainy day','Reserve','Authorization','Bearer ','access_token','refresh_token']) assert.equal(content.includes(sensitive),false,`${dir.name} persisted ${sensitive}`);
  assert.ok(Object.values(result.outputs).every(value=>value==='[REDACTED]' || value==='Ready for review'));
  count++;
}
assert.ok(discovery && replay && handoff,'Missing discovery, replay or handoff evidence');
console.log(`Verified ${count} event chains, live LLM receipts, zero-LLM replay, same-session handoff and synthetic-value redaction.`);
