import { chromium, type Browser, type BrowserContext, type Frame, type Locator, type Page } from 'playwright';
import { RuntimeFault, type Action, type Observation, type Target } from './schema.js';
import { grants, invocationBindings, markers, targets, type TargetId } from './profile.js';
import { Policy } from './policy.js';

export interface Surface {
  readonly sessionId: string;
  observe(): Promise<Observation>;
  act(action: Action, inputs: Record<string, string>, human?: boolean): Promise<string | undefined>;
  verifyInputs(inputs: Record<string, string>): Promise<void>;
  snapshot(): Promise<unknown>;
  close(): Promise<void>;
}
export class WebSurface implements Surface {
  browser!: Browser; context!: BrowserContext; page!: Page;
  blocked: string | null = null;
  private nativeDialog = false;
  constructor(public sessionId: string, public policy: Policy) {}
  async launch(target: string, scenario: string, headed = false) {
    this.policy.url(target);
    if (headed) throw new RuntimeFault('use_operator_console');
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({ viewport: { width: 1200, height: 850 }, serviceWorkers: 'block', acceptDownloads: false });
    await this.context.route('**/*', async route => {
      const request = route.request();
      if (request.method() !== 'GET' || !this.policy.allowsUrl(request.url())) {
        this.blocked = 'network_policy_blocked'; await route.abort(); return;
      }
      await route.continue();
    });
    await this.context.routeWebSocket('**/*', socket => { this.blocked = 'network_policy_blocked'; socket.close(); });
    await this.context.addInitScript(({ scenario }) => {
      // Synthetic fixture configuration only; it never performs business actions.
      sessionStorage.setItem('trainingScenario', scenario);
    }, { scenario });
    this.page = await this.context.newPage();
    this.context.on('page', popup => { if (popup !== this.page) { this.blocked = 'popup_blocked'; void popup.close(); } });
    this.page.on('dialog', dialog => { this.nativeDialog = true; void dialog.dismiss(); });
    this.page.on('download', download => { this.blocked = 'download_blocked'; void download.cancel(); });
    this.page.setDefaultTimeout(1500);
    await this.page.goto(target, { waitUntil: 'load' });
  }
  private frame(target: Target): Frame {
    let frame = this.page.mainFrame();
    for (const name of target.frame) {
      const matches = frame.childFrames().filter(child => child.name() === name);
      if (matches.length !== 1) throw new RuntimeFault('frame_mismatch');
      frame = matches[0];
    }
    return frame;
  }
  locator(target: Target): Locator {
    const frame = this.frame(target);
    if (target.strategy === 'role') return frame.getByRole(target.role as 'button', { name: target.name, exact: true });
    // Legacy table labels have no for/id association. Scope to an exact label cell, then its adjacent value cell.
    const label = frame.locator('td').filter({ hasText: new RegExp(`^${target.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    const cell = label.locator('xpath=following-sibling::td[1]');
    return target.control === 'input' ? cell.locator('input') : cell;
  }
  private async unique(target: Target): Promise<Locator> {
    const locator = this.locator(target);
    const count = await locator.count();
    if (count !== 1) throw new RuntimeFault(count > 1 ? 'ambiguous_target' : 'target_missing');
    if (!await locator.isVisible()) throw new RuntimeFault('target_hidden');
    return locator;
  }
  async observe(): Promise<Observation> {
    this.policy.url(this.page.url());
    for (const frame of this.page.frames()) this.policy.url(frame.url());
    const seen: string[] = [];
    for (const [id, text] of Object.entries(markers)) {
      for (const frame of this.page.frames()) {
        const match = frame.getByText(text, { exact: true });
        if (await match.count() === 1 && await match.isVisible()) { seen.push(id); break; }
      }
    }
    if (this.nativeDialog) seen.push('unknown_dialog');
    const controls: Observation['controls'] = [];
    for (const [id, target] of Object.entries(targets)) {
      try {
        const locator = this.locator(target);
        const count = await locator.count();
        if (count > 1) { this.blocked = 'ambiguous_target'; continue; }
        if (count === 1 && await locator.isVisible()) controls.push({ id, name: target.name, actions: grants[id as TargetId].actions });
      } catch (error) { if (!(error instanceof RuntimeFault)) throw error; }
    }
    return { markers: seen, controls, blocked: this.blocked };
  }
  async act(action: Action, inputs: Record<string, string>, human = false) {
    this.policy.action(action, human);
    this.policy.url(this.page.url());
    if (this.blocked) throw new RuntimeFault(this.blocked);
    const target = targets[action.target as TargetId];
    this.policy.url(this.frame(target).url());
    const locator = await this.unique(target);
    if (action.kind === 'fill') { await locator.fill(inputs[action.input]); return; }
    if (action.kind === 'read') {
      const text = (await locator.innerText()).trim();
      return action.target === 'balance' ? text.replace(/[$,]/g, '') : text;
    }
    // Trial performs all actionability checks before the commit boundary; no click is retried after this line.
    await locator.click({ trial: true });
    await locator.click({ noWaitAfter: true });
  }
  async verifyInputs(inputs: Record<string, string>) {
    for (const [key, target] of Object.entries(invocationBindings)) {
      if ((await (await this.unique(target)).innerText()).trim() !== inputs[key]) throw new RuntimeFault('invocation_mismatch', [key]);
    }
  }
  async snapshot() {
    const vocabulary = [...Object.values(markers), ...Object.values(targets).map(target => target.name)];
    const frames = [];
    for (const [index, frame] of this.page.frames().entries()) {
      this.policy.url(frame.url());
      // Static JS string avoids transpiler-injected function-name helpers crossing the browser boundary.
      const capture = String.raw`({ vocabulary }) => {
        const allowed = new Set(vocabulary);
        const tags = new Set(['BODY','MAIN','HEADER','DIV','SECTION','ASIDE','H1','H2','H3','TABLE','TBODY','TR','TD','TH','BUTTON','INPUT','P','SPAN','STRONG','IFRAME']);
        let budget = 300;
        function visit(node, depth) {
          if (--budget < 0 || depth > 14) return { omitted: true };
          if (node.nodeType === Node.TEXT_NODE) {
            const value = node.textContent?.trim(); return value ? { text: allowed.has(value) ? value : '[REDACTED]' } : null;
          }
          if (!(node instanceof HTMLElement) || ['SCRIPT','STYLE','NOSCRIPT'].includes(node.tagName)) return null;
          const rect = node.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return null;
          return { tag: tags.has(node.tagName) ? node.tagName.toLowerCase() : 'element',
            rect: { x:Math.round(rect.x), y:Math.round(rect.y), width:Math.round(rect.width), height:Math.round(rect.height) },
            ...(node instanceof HTMLInputElement ? { value: '[REDACTED]' } : {}),
            children: Array.from(node.childNodes).map(child => visit(child, depth+1)).filter(Boolean),
          };
        }
        return visit(document.body, 0);
      }`;
      const tree = await frame.evaluate(`(${capture})(${JSON.stringify({ vocabulary })})`);
      frames.push({ frameIndex: index, tree });
    }
    return { format:'redacted-dom-v1', frames };
  }
  async close() { await this.context?.close(); await this.browser?.close(); }
}
