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
    index_error_message?: string | null;
    extraction_error_message?: string | null;
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

export type WikiPageSection = {
  id: string;
  section_key: string;
  heading: string;
  heading_level: number;
  body_markdown: string;
  order_index: number;
  content_hash?: string;
};

export type WikiSourceChunk = {
  id?: string;
  ref: string;
  chunk_ref?: string;
  source_ref?: string;
  chunk_number?: number;
  stable_chunk_key?: string;
  line_start?: number;
  line_end?: number;
  char_start?: number;
  char_end?: number;
  page_number?: number;
  location?: string;
  heading?: boolean;
  text?: string;
  evidence?: string;
};

export type WikiSource = {
  id?: string;
  ref: string;
  source_ref?: string;
  file_id?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  location?: string;
  evidence?: string;
  source_hash?: string;
  chunks?: WikiSourceChunk[];
};

export type WikiRelatedPage = {
  id?: string;
  title: string;
  slug?: string;
  relation_type?: string;
  score?: number | null;
  evidence?: unknown[];
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
  sections?: WikiPageSection[];
  sources: WikiSource[];
  citation_coverage_score?: number | null;
  weak_source_warning?: boolean;
  content_hash?: string;
  source_fingerprint?: string;
  updated_at: string;
};

export type WikiPageEvidence = {
  page: Pick<WikiPage, 'id' | 'slug' | 'title' | 'page_type' | 'category' | 'subcategory' | 'citation_coverage_score' | 'weak_source_warning' | 'updated_at'>;
  sections: WikiPageSection[];
  sources: Array<WikiSource & { source_ref: string }>;
  chunks: Array<WikiSourceChunk & {
    page_id?: string;
    page_source_id?: string;
    file_id?: string;
    chunk_ref: string;
    stable_chunk_key: string;
    content_hash?: string;
  }>;
  relations: WikiRelatedPage[];
};

export type WikiSourceChunkDetail = WikiSourceChunk & {
  page_id?: string;
  page_source_id?: string;
  file_id?: string;
  chunk_ref: string;
  stable_chunk_key: string;
  content_hash?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
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
