import { randomUUID } from 'node:crypto';
import { RuntimeFault } from './schema.js';

/** Single-process fencing lease. Every action and ownership change shares this gate. */
export class Control {
  owner: 'automation' | 'unclaimed' | 'human' | 'closed' = 'automation';
  epoch = 0;
  private token: string | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  async gate<T>(fn: () => Promise<T> | T): Promise<T> {
    const work = this.tail.then(fn, fn);
    this.tail = work.catch(() => {});
    return work;
  }
  assertAutomation() { if (this.owner !== 'automation') throw new RuntimeFault('control_not_owned'); }
  cede() { this.assertAutomation(); this.owner = 'unclaimed'; this.epoch++; }
  claim(epoch: number) {
    if (this.owner !== 'unclaimed' || epoch !== this.epoch) throw new RuntimeFault('stale_control');
    this.owner = 'human'; this.epoch++; this.token = randomUUID();
    return { token: this.token, epoch: this.epoch };
  }
  assertHuman(token: string, epoch: number) {
    if (this.owner !== 'human' || this.token !== token || this.epoch !== epoch) throw new RuntimeFault('stale_control');
  }
  resume(token: string, epoch: number) {
    this.assertHuman(token, epoch); this.owner = 'automation'; this.epoch++; this.token = null;
  }
  close() { this.owner = 'closed'; this.epoch++; this.token = null; }
}
