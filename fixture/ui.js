// Training app with an iframe, tables and unlabeled inputs. It has no test IDs or business API.
// Every person and account is synthetic. No production DaOS data is imported.
const scenario = sessionStorage.getItem('trainingScenario') || 'normal';
const content = document.getElementById('content');
let member = ''; let nickname = ''; let stage = 'search'; let interrupted = false;
const escapeHtml = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const balance = () => scenario === 'bad-output' ? 'Unavailable' : member === 'S1002' ? '$987.65' : '$2,450.75';
const rows = entries => '<table><tbody>' + entries.map(([a,b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('') + '</tbody></table>';
function render() {
  const idInput = '<input autocomplete="off" maxlength="64">';
  if (stage === 'search') content.innerHTML = '<h1>Member search</h1>' + rows([['Member number', idInput]]) + '<button>Find member</button>';
  if (stage === 'results') content.innerHTML = '<h1>Search results</h1>' + rows([['Member reference', escapeHtml(member)], ['Display name','Synthetic Member']]) + '<button>Open member</button>';
  if (stage === 'detail') content.innerHTML = '<h1>Member overview</h1>' + rows([['Member reference', escapeHtml(member)],['Current savings balance', balance()]]) + '<button>New savings sub-account</button>';
  if (stage === 'form') content.innerHTML = '<h1>Account setup</h1>' + rows([['Product','Savings'],['Account nickname',idInput]]) + '<button>Review request</button>';
  if (stage === 'review') content.innerHTML = '<h1>Account review</h1>' + rows([['Member reference',escapeHtml(member)],['Account nickname',escapeHtml(nickname)],['Current savings balance', balance()],['Request status','Ready for review']]) + '<p>Review only. No new account exists yet.</p><button class="danger">Submit account</button>';
  if (stage === 'submitted') content.innerHTML = '<h1>Account submitted</h1>';
}
function banner(message, button) {
  const aside = document.createElement('aside');
  aside.innerHTML = `<h2>${message}</h2>${button ? `<button>${button}</button>` : ''}`;
  content.prepend(aside);
}
function result() {
  if (!/^S\d{4}$/.test(member)) { banner('Validation failed'); return; }
  if (!['S1001','S1002'].includes(member)) { banner('No member found'); return; }
  if (scenario === 'permission') { banner('Permission denied'); return; }
  if (scenario === 'app-error') { banner('Application unavailable'); return; }
  if (scenario === 'unknown-dialog') { banner('Supervisor confirmation required'); return; }
  stage = 'results'; render();
  if (scenario === 'interstitial') banner('Scheduled maintenance notice', 'Continue working');
}
content.addEventListener('click', event => {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const action = event.target.textContent;
  if (action === 'Continue working') { event.target.closest('aside').remove(); return; }
  if (action === 'Restore training session') { event.target.closest('aside').remove(); return; }
  if (content.querySelector('aside')) return;
  if (action === 'Find member') {
    member = content.querySelector('input').value;
    if (scenario === 'slow' || scenario === 'timeout') {
      content.innerHTML = '<h1>Loading records</h1>';
      if (scenario === 'slow') setTimeout(result, 900);
    } else result();
  }
  if (action === 'Open member') { stage = 'detail'; render(); }
  if (action === 'New savings sub-account') {
    stage = 'form'; render();
    if (scenario === 'session-expired' && !interrupted) { interrupted = true; banner('Session expired', 'Restore training session'); }
  }
  if (action === 'Review request') {
    nickname = content.querySelector('input').value;
    if (nickname.length < 2 || nickname.length > 24) { banner('Validation failed'); return; }
    if (scenario === 'wrong-member') member = 'S7777';
    stage = 'review'; render();
  }
  if (action === 'Submit account') { stage = 'submitted'; render(); }
});
render();
if (scenario === 'drift') document.querySelector('button').textContent = 'Search directory';
if (scenario === 'duplicate') content.append(document.querySelector('button').cloneNode(true));
