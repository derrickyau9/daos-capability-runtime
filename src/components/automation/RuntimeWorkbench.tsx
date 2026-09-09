import { useEffect, useState } from 'react';
import { Play, Sparkles, UserRound, ArrowUpRight, CircleStop } from 'lucide-react';
import { GlassPanel } from '../glass/GlassPanel';
import { GlassButton } from '../glass/GlassButton';
import type { RunResult } from '../../../runtime/schema';
import { runText } from '../../lib/runtimeText';
type View = { id:string; sessionId:string; mode:string; status:string; step:number; control:{owner:string;epoch:number}; llmCalls:number; handoffs:number; recoveries:number; result:RunResult|null; intervention:{reason:string}|null };
const goal = 'Find the member using memberId, prepare a new savings sub-account using nickname, and reach the account review screen. Return the current savings balance and the request status. Do not submit the account.';
export function RuntimeWorkbench() {
  const [runs,setRuns] = useState<View[]>([]); const [mode,setMode] = useState<'discovery'|'replay'>('replay');
  const [member,setMember] = useState('S1002'); const [nickname,setNickname] = useState('Rainy day');
  const [task,setTask] = useState(goal); const [scenario,setScenario] = useState('normal'); const [provider,setProvider] = useState('codex');
  const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  async function refresh() { const response = await fetch('/api/automation/runs'); if (response.ok) setRuns(await response.json()); }
  useEffect(() => { void refresh().catch(() => {}); const timer = setInterval(() => void refresh().catch(() => {}),1000); return () => clearInterval(timer); },[]);
  const active = runs.some(run => run.status !== 'done');
  async function start() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/automation/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,goal:task,inputs:{memberId:member,nickname},provider,scenario})});
      const data = await response.json(); if (!response.ok) throw Error(data.code); await refresh();
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Unable to start run'); } finally { setBusy(false); }
  }
  async function stop(id:string) { await fetch(`/api/automation/runs/${id}/stop`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); await refresh(); }
  return <section className="runtime-workbench">
    <div className="runtime-heading"><div><p className="eyebrow">Run a workflow</p><h2>Savings account review</h2></div><span className="training-label">LOCAL DEMO · SYNTHETIC RECORDS</span></div>
    <div className="runtime-columns"><GlassPanel className="runtime-form" padding="lg">
      <div className="runtime-mode"><button className={mode==='discovery'?'selected':''} onClick={() => setMode('discovery')}><Sparkles size={15}/>Discover</button><button className={mode==='replay'?'selected':''} onClick={() => setMode('replay')}><Play size={15}/>Replay capability</button></div>
      <label>Goal<textarea aria-label="Goal" value={task} onChange={event => setTask(event.target.value)} disabled={mode==='replay'} maxLength={1000}/></label>
      <div className="runtime-fields"><label>Member reference<input value={member} onChange={event => setMember(event.target.value)} maxLength={64}/></label><label>Account nickname<input value={nickname} onChange={event => setNickname(event.target.value)} maxLength={64}/></label></div>
      <label>Test case<select aria-label="Test case" value={scenario} onChange={event => setScenario(event.target.value)}><option value="normal">Normal operation</option><option value="session-expired">Expired session (operator help needed)</option><option value="interstitial">Maintenance notice</option><option value="slow">Slow loading</option><option value="permission">Permission denied</option><option value="unknown-dialog">Unexpected dialog</option><option value="timeout">Loading timeout</option><option value="drift">Renamed control</option></select></label>
      {mode==='discovery' && <label>Model connection<select aria-label="Model connection" value={provider} onChange={event => setProvider(event.target.value)}><option value="codex">Codex · existing login</option><option value="openai">OpenAI · API key</option></select></label>}
      <div className="runtime-submit"><GlassButton variant="primary" icon={mode==='discovery'?<Sparkles size={16}/>:<Play size={16}/>} onClick={() => void start()} disabled={active} loading={busy}>{mode==='discovery'?'Discover workflow':'Run capability'}</GlassButton><span>{mode==='replay'?'Uses the saved capability. No model calls.':'Uses a model to choose each step.'}</span></div>
      {message && <p className="runtime-error" role="alert" title={message}>{runText('messages',message)}</p>}
    </GlassPanel><GlassPanel className="runtime-sessions" padding="lg"><div className="panel-heading"><h3>Recent runs</h3><span>{runs.length} {runs.length===1?'run':'runs'}</span></div>
      {!runs.length && <div className="runtime-empty"><div className="runtime-orbit"><Play size={22}/></div><h3>No runs yet</h3><p>Start a run to see its progress and result here.</p><span>Search → Member → Setup → Review</span></div>}
      {runs.slice(0,4).map(run => <article className={`runtime-run ${run.status==='blocked'?'needs-human':''}`} key={run.id}><div className="runtime-run-title"><strong>{run.mode==='discovery'?'Workflow discovery':'Savings review'}</strong><span className={`run-badge status-${run.result?.status || run.status}`}>{runText('statuses',run.result?.status || run.status)}</span></div><p title={run.intervention?.reason || run.result?.code}>{run.intervention?.reason || run.result?.code ? runText('messages',run.intervention?.reason || run.result!.code) : `Working on step ${run.step + 1}`}</p><div className="runtime-run-meta"><span>{runText('owners',run.control.owner)}</span><span>{run.llmCalls} model calls</span><span>{run.recoveries} recoveries</span></div><code title={run.sessionId}>Session {run.sessionId.slice(0,18)}…</code><div className="runtime-run-actions"><a href={`/operator/${run.id}`} target="_blank" rel="noreferrer"><UserRound size={14}/>{run.status==='blocked'?'Take over session':'View session'}<ArrowUpRight size={13}/></a>{run.status!=='done' && <button onClick={() => void stop(run.id)}><CircleStop size={14}/>Stop</button>}{run.result?.status==='success' && run.mode==='discovery' && <a href={`/api/automation/runs/${run.id}/capability`} target="_blank" rel="noreferrer">View capability JSON<ArrowUpRight size={13}/></a>}</div></article>)}
    </GlassPanel></div>
  </section>;
}
