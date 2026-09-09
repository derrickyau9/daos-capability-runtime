const id = location.pathname.split('/').pop(); const base = `/api/automation/runs/${id}`;
let lease = null; let run = null; let controlKey = '';
const el = id => document.getElementById(id);
const copy = await fetch('/operator-copy.json').then(response => response.json());
const text = (group, value) => copy[group]?.[value] || value.replaceAll('_', ' ');
async function request(path, body) {
  const response = await fetch(base + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const value = await response.json(); if (!response.ok) throw Error(value.code); return value;
}
async function perform(fn) { try { await fn(); el('message').textContent = ''; await refresh(); } catch(error) { el('message').textContent = text('messages', error.message); el('message').title = error.message; } }
el('claim').onclick = () => perform(async () => { lease = await request('/claim', { epoch: run.control.epoch }); });
el('resume').onclick = () => perform(async () => { await request('/resume', lease); lease = null; });
el('stop').onclick = () => perform(() => request('/stop', {}));
async function refresh() {
  run = await request('');
  el('session').textContent = run.sessionId;
  el('owner').textContent = text('owners',run.control.owner);
  el('owner').title = `Control epoch ${run.control.epoch}`;
  el('status').textContent = text('statuses',run.result?.status || run.status);
  const reason = run.intervention?.reason || run.result?.code;
  el('reason').textContent = reason ? text('messages',reason) : 'No operator help requested.';
  el('reason').title = reason || '';
  el('expected').textContent = run.intervention ? `Before returning control, reach: ${run.intervention.expected.join(', ') || 'a recognized screen'}.` : '';
  el('claim').disabled = run.control.owner !== 'unclaimed';
  el('resume').disabled = !lease || run.control.owner !== 'human';
  el('stop').disabled = run.status === 'done';
  el('markers').replaceChildren(...run.observation.markers.map(name => { const span = document.createElement('span'); span.textContent = name.replaceAll('_',' '); span.title = name; return span; }));
  const key = JSON.stringify([run.observation.controls, run.control.owner, Boolean(lease)]);
  if (key !== controlKey) {
    controlKey = key; el('controls').replaceChildren();
    for (const control of run.observation.controls) {
      if (control.actions.includes('read')) continue;
      const row = document.createElement('div'); const label = document.createElement('label'); label.textContent = control.name; row.append(label);
      const input = document.createElement('input'); input.autocomplete = 'off'; input.maxLength = 64;
      if (control.actions.includes('fill')) { input.type = 'text'; row.append(input); }
      const button = document.createElement('button'); button.textContent = control.actions.includes('fill') ? 'Enter value' : control.name;
      button.disabled = !lease || run.control.owner !== 'human' || control.id === 'confirm';
      button.onclick = () => perform(async () => {
        const action = control.actions.includes('fill') ? { kind:'fill', target: control.id, input: control.id } : { kind:'click', target:control.id };
        await request('/act', { ...lease, action, values: action.kind === 'fill' ? { [control.id]: input.value } : {} }); input.value = '';
      });
      row.append(button); el('controls').append(row);
    }
  }
  const events = await request('/events');
  el('events').replaceChildren(...events.slice(-18).reverse().map(event => { const div = document.createElement('div'); div.textContent = `${event.time.slice(11,19)}  ${text('events',event.type)}  ${event.actor ? text('owners',event.actor) : ''}  step ${event.step ?? '—'}`; div.title = event.type; return div; }));
}
refresh().catch(error => { el('message').textContent = text('messages',error.message); });
setInterval(() => refresh().catch(() => {}), 1000);
