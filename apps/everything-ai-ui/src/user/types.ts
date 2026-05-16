import type { IndexedFile } from '../api';

export type UserView = 'onboarding' | 'explore' | 'wiki' | 'ask';

export type SourceReference = {
  file_id?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  source_type?: string;
  source_label?: string;
};

export type DocumentContext = {
  file?: IndexedFile & {
    relative_path?: string;
    recovery_status?: string;
    source_reference?: string;
  };
  previewText?: string;
  insight?: {
    summary?: string;
    classification?: string;
    provider?: string;
  } | null;
  source_reference?: SourceReference;
};

export type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: Array<{ filename?: string; absolute_path?: string; snippet?: string; score?: number }>;
};

export type WikiSource = {
  ref: string;
  file_id?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  location?: string;
  evidence?: string;
};

export type WikiRelatedPage = {
  id?: string;
  title: string;
  slug?: string;
};

export type WikiPage = {
  id: string;
  title: string;
  slug: string;
  page_type: 'system' | 'category' | 'topic' | 'file' | string;
  category?: string;
  subcategory?: string;
  summary: string;
  markdown: string;
  source_file_ids: string[];
  related_topics: string[];
  related_pages?: WikiRelatedPage[];
  sources: WikiSource[];
  updated_at: string;
};

export type WikiPayload = {
  generated_at: string;
  page_count: number;
  categories?: WikiRelatedPage[];
  pages: WikiPage[];
};

export type SetupStep = {
  id: string;
  label: string;
  status: 'waiting' | 'working' | 'done' | 'failed';
};
