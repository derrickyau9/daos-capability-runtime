import copy from '../../runtime/ui-text.json';

export function runText(group: keyof typeof copy, value: string): string {
  return (copy[group] as Record<string, string>)[value] || value.replaceAll('_', ' ');
}

export function logText(message: string): string {
  const [event, ...details] = message.split(' · ');
  return [runText('events', event), ...details].join(' · ');
}
