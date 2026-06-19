import type { SetupStep } from './types';
export { formatSize } from '../shared/formatSize';

export const DEFAULT_API = 'http://127.0.0.1:4100';
export const DEFAULT_TOKEN = 'replace-with-your-local-development-token';

export const EXAMPLE_PROMPTS = [
  'Summarize the latest indexed documents.',
  'What are the most important files in this workspace?',
  'Which files mention planning, invoices, customers, or projects?',
];

export const INITIAL_SETUP_STEPS: SetupStep[] = [
  { id: 'folder', label: 'Select folder', status: 'waiting' },
  { id: 'index', label: 'Index local files', status: 'waiting' },
  { id: 'extract', label: 'Extract readable content', status: 'waiting' },
  { id: 'insights', label: 'Generate source insights', status: 'waiting' },
  { id: 'ready', label: 'Workspace ready', status: 'waiting' },
];

export function filePathHref(filePath = '') {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${encodeURI(prefixed)}`;
}

export function updateStep(steps: SetupStep[], id: string, status: SetupStep['status']) {
  return steps.map((step) => step.id === id ? { ...step, status } : step);
}
