import { Brain, Cloud, Code2, Database, Globe, Network, Search, Server, Sparkles, Terminal, Zap } from 'lucide-react';
import type { ProviderName } from './providerSettingsApi';

export const providerCatalog: Array<{
  id: ProviderName;
  label: string;
  description: string;
  local?: boolean;
  icon: any;
}> = [
  { id: 'ollama', label: 'Ollama', description: 'Local Ollama models', local: true, icon: Server },
  { id: 'openai', label: 'OpenAI', description: 'OpenAI models', icon: Sparkles },
  { id: 'anthropic', label: 'Anthropic', description: 'Claude models', icon: Brain },
  { id: 'openrouter', label: 'OpenRouter', description: 'Multi-model router', icon: Network },
  { id: 'cerebras', label: 'Cerebras', description: 'Cerebras inference', icon: Zap },
  { id: 'mistral', label: 'Mistral', description: 'Mistral models', icon: Cloud },
  { id: 'google', label: 'Google AI', description: 'Gemini models', icon: Globe },
  { id: 'deepseek', label: 'DeepSeek', description: 'DeepSeek models', icon: Search },
  { id: 'groq', label: 'Groq', description: 'Fast inference', icon: Zap },
  { id: 'xai', label: 'xAI', description: 'Grok models', icon: Brain },
  { id: 'moonshot', label: 'Moonshot / Kimi', description: 'Kimi models', icon: Cloud },
  { id: 'together', label: 'Together AI', description: 'Open model cloud', icon: Database },
  { id: 'fireworks', label: 'Fireworks AI', description: 'Inference platform', icon: Zap },
  { id: 'perplexity', label: 'Perplexity', description: 'Sonar models', icon: Search },
  { id: 'azureOpenAI', label: 'Azure OpenAI', description: 'Azure deployments', icon: Cloud },
  { id: 'lmStudio', label: 'LM Studio', description: 'Local OpenAI-compatible', local: true, icon: Terminal },
  { id: 'customOpenAI', label: 'Custom OpenAI', description: 'Any compatible endpoint', local: true, icon: Code2 },
];

export const agentCatalog = [
  { id: 'codex', label: 'Codex', description: 'OpenAI Codex app / CLI connector' },
  { id: 'kiloCode', label: 'Kilo Code', description: 'Kilo Code agent connector' },
  { id: 'openCode', label: 'OpenCode', description: 'OpenCode agent connector' },
  { id: 'claudeCode', label: 'Claude Code', description: 'Claude Code connector' },
  { id: 'aider', label: 'Aider', description: 'Aider local CLI connector' },
  { id: 'continue', label: 'Continue', description: 'Continue config bridge' },
  { id: 'cline', label: 'Cline', description: 'Cline config bridge' },
];

export function providerLabel(id: ProviderName) {
  return providerCatalog.find((provider) => provider.id === id)?.label || id;
}

export function isLocalProvider(id: ProviderName) {
  return Boolean(providerCatalog.find((provider) => provider.id === id)?.local);
}
