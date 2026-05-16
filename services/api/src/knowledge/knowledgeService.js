import { getSystemStatus, listExtractedFiles, listFileInsights, listIndexedFiles } from '../db/client.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg']);
const SPREADSHEET_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf']);
const DEFAULT_FILE_CONTENT_LIMIT = Number.parseInt(process.env.EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT || '', 10) || 50000;
const DEFAULT_TOPIC_CONTENT_LIMIT = Number.parseInt(process.env.EVERYTHINGAI_WIKI_TOPIC_CONTENT_LIMIT || '', 10) || 4000;

const CATEGORY_RULES = [
  { category: 'Finance', terms: ['finance', 'financial', 'invoice', 'payment', 'price', 'quote', 'budget', 'bank', 'accounting', 'value'] },
  { category: 'Legal & Compliance', terms: ['legal', 'contract', 'agreement', 'gdpr', 'policy', 'terms', 'court', 'domstol', 'compliance'] },
  { category: 'Customers & Communication', terms: ['customer', 'client', 'communication', 'correspondence', 'email', 'message', 'support'] },
  { category: 'Projects & Planning', terms: ['project', 'planning', 'roadmap', 'phase', 'task', 'mvp', 'requirement'] },
  { category: 'Technical Documentation', terms: ['technical', 'api', 'code', 'system', 'server', 'database', 'architecture', 'software'] },
  { category: 'Operations', terms: ['operation', 'process', 'workflow', 'procedure', 'manual', 'warehouse', 'logistics'] },
  { category: 'Media & Visuals', terms: ['image', 'photo', 'picture', 'screenshot', 'banner', 'design', 'visual'] },
];

function safeSlug(value = 'page') {
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
}

function parseEntities(entitiesJson) {
  try { return JSON.parse(entitiesJson || '{}'); } catch { return {}; }
}

function normalizedText(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function categoryFor({ classification = '', filename = '', summary = '', extension = '' } = {}) {
  const text = normalizedText(classification, filename, summary);
  const matched = CATEGORY_RULES.find((rule) => rule.terms.some((term) => text.includes(term)));
  if (matched) return matched.category;
  if (IMAGE_EXTENSIONS.has(extension)) return 'Media & Visuals';
  if (SPREADSHEET_EXTENSIONS.has(extension)) return 'Finance';
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'Documents';
  return 'General Knowledge';
}

function subcategoryFor({ classification = '', filename = '', extension = '' } = {}) {
  const cleanClassification = classification && classification !== 'Unclassified' ? classification : '';
  if (cleanClassification) return cleanClassification;
  if (IMAGE_EXTENSIONS.has(extension)) return 'Images';
  if (SPREADSHEET_EXTENSIONS.has(extension)) return 'Tables & Spreadsheets';
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'Documents';
  const fromFilename = filename.split(/[._-]+/).filter(Boolean).slice(0, 2).join(' ');
  return fromFilename || 'Unclassified';
}

function firstSentence(text = '') {
  const normalized = text.toString().replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const match = normalized.match(/^(.{40,260}?[.!?])\s/);
  return match?.[1] || normalized.slice(0, 260);
}

function evidenceSnippet(text = '', fallback = '') {
  const normalized = text.toString().replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback || '';
  return normalized.slice(0, 420);
}

function limitText(text = '', limit = DEFAULT_FILE_CONTENT_LIMIT) {
  const raw = text.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) return '';
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, limit)}\n\n[Content truncated in this MVP view. Increase EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT to render more extracted content.]`;
}

function escapeTableCell(value = '') {
  return String(value ?? '').replaceAll('\n', ' ').replaceAll('|', '\|').trim();
}

function markdownTable(headers, rows) {
  if (!rows.length) return '';
  const headerLine = `| ${headers.map(escapeTableCell).join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(escapeTableCell).join(' | ')} |`);
  return [headerLine, divider, ...body].join('\n');
}

function fileSource(file, index, evidence = '') {
  return {
    ref: `S${index + 1}`,
    file_id: file.fileId || file.file_id || file.id,
    filename: file.filename,
    absolute_path: file.absolutePath || file.absolute_path,
    relative_path: file.relative_path,
    location: 'extracted document content',
    evidence,
  };
}

function sourceFootnotes(sources) {
  if (!sources.length) return '';
  return [
    '## Sources',
    '',
    ...sources.map((source) => `- [${source.ref}] **${source.filename}** — ${source.location}`),
    '',
    '## Evidence Snippets',
    '',
    ...sources.map((source) => `### [${source.ref}] ${source.filename}\n\n> ${source.evidence || 'No evidence snippet available yet.'}`),
  ].join('\n');
}

function buildTableOfContents(sections) {
  return ['## Contents', '', ...sections.map((section) => `- [[${section}]]`)].join('\n');
}

function buildPageHeader({ title, summary }) {
  return [`# ${title}`, '', `> ${summary || 'Source-backed knowledge page generated from extracted document content.'}`, ''].join('\n');
}

function buildRelatedPagesBlock(relatedPages = []) {
  if (!relatedPages.length) return '';
  return ['## Related Pages', '', ...relatedPages.map((page) => `- [[${page.title || page}]]`), ''].join('\n');
}

function looksLikeHeading(line) {
  const clean = line.trim();
  if (!clean || clean.length > 90) return false;
  if (/^\d+(\.\d+)*\s+\S+/.test(clean)) return true;
  if (/^[A-ZÆØÅ0-9][A-ZÆØÅ0-9\s:()/-]{5,}$/.test(clean)) return true;
  if (!/[.!?]$/.test(clean) && clean.split(/\s+/).length <= 8 && clean.length >= 4) return true;
  return false;
}

function normalizeDocumentContent(text = '', { limit = DEFAULT_FILE_CONTENT_LIMIT, sourceRef = 'S1' } = {}) {
  const limited = limitText(text, limit);
  if (!limited) return 'No extracted document content is available yet.';

  const lines = limited
    .split('\n')
    .map((line) => line.trim())
    .filter((line, index, arr) => line || arr[index - 1]);

  const result = [];
  let blankCount = 0;

  for (const line of lines) {
    if (!line) {
      blankCount += 1;
      if (blankCount <= 1) result.push('');
      continue;
    }
    blankCount = 0;

    if (/^#{1,6}\s/.test(line)) {
      result.push(line);
    } else if (/^[-*•]\s+/.test(line)) {
      result.push(`- ${line.replace(/^[-*•]\s+/, '')} **[${sourceRef}]**`);
    } else if (/^\d+[.)]\s+/.test(line)) {
      result.push(`- ${line} **[${sourceRef}]**`);
    } else if (looksLikeHeading(line)) {
      result.push(`### ${line}`);
    } else {
      result.push(`${line} **[${sourceRef}]**`);
    }
  }

  return result.join('\n');
}

function contentOverviewFromInsights(insights, sources) {
  const rows = insights.slice(0, 12).map((insight, index) => {
    const source = sources[index];
    return [insight.filename, firstSentence(insight.summary) || 'No summary available yet.', source ? `[${source.ref}]` : ''];
  });
  return rows.length ? markdownTable(['Document', 'Content summary', 'Source'], rows) : 'No document summaries are available yet.';
}

function buildMediaBlock(files) {
  const media = files.filter((file) => IMAGE_EXTENSIONS.has(file.extension));
  if (!media.length) return '';
  return [
    '## Media References',
    '',
    'This topic contains image or visual files. Media preview rendering will be connected through secure source preview routes instead of raw filesystem links.',
    '',
    ...media.slice(0, 12).map((file) => `- ${file.filename}`),
    '',
  ].join('\n');
}

function buildWorkspaceMarkdown({ status, files, insights, sources }) {
  const categoryRows = Object.entries(insights.reduce((acc, insight) => {
    const key = insight.category || categoryFor(insight);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([topic, count]) => [topic, `${count} document(s)`]);

  const recentDocuments = insights.slice(0, 10).map((insight, index) => [insight.filename, insight.category || 'General Knowledge', sources[index] ? `[${sources[index].ref}]` : '']);

  return [
    buildPageHeader({
      title: 'Workspace Overview',
      summary: `This wiki contains source-backed pages generated from ${status.total_files || files.length || 0} indexed file(s).`,
    }),
    buildTableOfContents(['Knowledge Categories', 'Document Overview', 'How to Use This Wiki', 'Sources']),
    '',
    '## Knowledge Categories',
    '',
    categoryRows.length ? markdownTable(['Category', 'Documents'], categoryRows) : 'No categories have been generated yet.',
    '',
    '## Document Overview',
    '',
    recentDocuments.length ? markdownTable(['Document', 'Category', 'Source'], recentDocuments) : 'No document overview is available yet.',
    '',
    '## How to Use This Wiki',
    '',
    'Open a category, then a topic, then a source-backed file page. File pages prioritize the extracted content from the original document. Source markers such as **[S1]** connect text back to the original source file.',
    '',
    sourceFootnotes(sources),
  ].join('\n');
}

function buildCategoryMarkdown(category, categoryInsights, sources, relatedPages) {
  const subcategoryRows = Object.entries(categoryInsights.reduce((acc, insight) => {
    const key = insight.subcategory || subcategoryFor(insight);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).map(([subcategory, count]) => [subcategory, `${count} document(s)`]);

  return [
    buildPageHeader({
      title: category,
      summary: `This category groups ${categoryInsights.length} related source document(s).`,
    }),
    buildTableOfContents(['Subtopics', 'Documents in This Category', 'Related Pages', 'Sources']),
    '',
    '## Subtopics',
    '',
    subcategoryRows.length ? markdownTable(['Subtopic', 'Documents'], subcategoryRows) : 'No subtopics are available yet.',
    '',
    '## Documents in This Category',
    '',
    contentOverviewFromInsights(categoryInsights, sources),
    '',
    buildRelatedPagesBlock(relatedPages),
    sourceFootnotes(sources),
  ].join('\n');
}

function buildTopicMarkdown(topic, category, topicInsights, sources, relatedPages, allFiles, extractedByFileId) {
  const sourceRows = sources.map((source) => [source.ref, source.filename, source.location]);
  const relatedFiles = allFiles.filter((file) => topicInsights.some((insight) => insight.file_id === file.id));
  const contentSections = topicInsights.slice(0, 6).map((insight, index) => {
    const source = sources[index];
    const extractedText = extractedByFileId.get(insight.file_id)?.extracted_text || insight.summary || '';
    return [
      `### ${insight.filename} **[${source.ref}]**`,
      '',
      normalizeDocumentContent(extractedText, { limit: DEFAULT_TOPIC_CONTENT_LIMIT, sourceRef: source.ref }),
    ].join('\n');
  }).join('\n\n');

  return [
    buildPageHeader({
      title: topic,
      summary: `This topic combines content from ${topicInsights.length} related document(s) in ${category}.`,
    }),
    buildTableOfContents(['Topic Overview', 'Source Content', 'Source Document Table', 'Media References', 'Related Pages', 'Sources']),
    '',
    '## Topic Overview',
    '',
    contentOverviewFromInsights(topicInsights, sources),
    '',
    '## Source Content',
    '',
    contentSections || 'No extracted source content is available yet.',
    '',
    '## Source Document Table',
    '',
    sourceRows.length ? markdownTable(['Ref', 'Document', 'Location'], sourceRows) : 'No source documents available yet.',
    '',
    buildMediaBlock(relatedFiles),
    buildRelatedPagesBlock(relatedPages),
    sourceFootnotes(sources),
  ].join('\n');
}

function buildFileMarkdown(insight, extractedFile, relatedPages) {
  const extractedContent = extractedFile?.extracted_text || '';
  const evidence = evidenceSnippet(extractedContent, insight.summary);
  const source = fileSource(insight, 0, evidence);
  const entities = parseEntities(insight.entities_json);
  const entityRows = Object.entries(entities).filter(([, values]) => Array.isArray(values) && values.length).flatMap(([group, values]) => values.slice(0, 12).map((value) => [group, value]));
  const category = insight.category || categoryFor(insight);
  const subcategory = insight.subcategory || subcategoryFor(insight);
  const updatedAt = insight.generated_at || new Date().toISOString();
  const documentContent = normalizeDocumentContent(extractedContent || insight.summary || '', { limit: DEFAULT_FILE_CONTENT_LIMIT, sourceRef: source.ref });

  return {
    id: `file-${insight.file_id}`,
    title: insight.filename,
    slug: `file-${safeSlug(insight.filename)}-${insight.file_id.slice(0, 8)}`,
    page_type: 'file',
    category,
    subcategory,
    summary: insight.summary || `Source-backed page for ${insight.filename}.`,
    source_file_ids: [insight.file_id],
    related_topics: [insight.classification || 'Unclassified', category],
    related_pages: relatedPages,
    sources: [source],
    markdown: [
      buildPageHeader({
        title: insight.filename,
        summary: insight.summary || `Extracted content from ${insight.filename}.`,
      }),
      buildTableOfContents(['Document Content', 'About This Document', 'Extracted Entities', 'Related Pages', 'Sources']),
      '',
      '## Document Content',
      '',
      documentContent,
      '',
      '## About This Document',
      '',
      markdownTable(['Field', 'Value'], [
        ['Category', category],
        ['Subcategory', subcategory],
        ['AI classification', insight.classification || 'Unclassified'],
        ['Generated', updatedAt],
      ]),
      '',
      '## Extracted Entities',
      '',
      entityRows.length ? markdownTable(['Entity group', 'Value'], entityRows) : 'No entities extracted yet.',
      '',
      buildRelatedPagesBlock(relatedPages),
      sourceFootnotes([source]),
    ].join('\n'),
    updated_at: updatedAt,
  };
}

export function buildKnowledgeIndex(db, { limit = 500 } = {}) {
  const insights = listFileInsights(db, { limit });
  const entities = new Map();
  const classifications = new Map();
  for (const insight of insights) {
    const parsedEntities = JSON.parse(insight.entities_json || '{}');
    const names = parsedEntities.names || [];
    if (!classifications.has(insight.classification)) classifications.set(insight.classification, []);
    classifications.get(insight.classification).push({ fileId: insight.file_id, filename: insight.filename, absolutePath: insight.absolute_path, summary: insight.summary });
    for (const name of names) {
      if (!entities.has(name)) entities.set(name, []);
      entities.get(name).push({ fileId: insight.file_id, filename: insight.filename, absolutePath: insight.absolute_path, classification: insight.classification });
    }
  }
  return {
    entity_count: entities.size,
    classification_count: classifications.size,
    entities: Array.from(entities.entries()).map(([name, files]) => ({ name, files })),
    classifications: Array.from(classifications.entries()).map(([name, files]) => ({ name, files })),
  };
}

export function buildWikiPages(db, { limit = 500, filePageLimit = 50 } = {}) {
  const status = getSystemStatus(db);
  const files = listIndexedFiles(db, { limit });
  const insights = listFileInsights(db, { limit });
  const extractedFiles = listExtractedFiles(db, { limit });
  const extractedByFileId = new Map(extractedFiles.map((file) => [file.id, file]));
  const fileById = new Map(files.map((file) => [file.id, file]));

  const enrichedInsights = insights.map((insight) => {
    const file = fileById.get(insight.file_id);
    const extension = file?.extension || '';
    return {
      ...insight,
      extension,
      category: categoryFor({ classification: insight.classification, filename: insight.filename, summary: insight.summary, extension }),
      subcategory: subcategoryFor({ classification: insight.classification, filename: insight.filename, extension }),
    };
  });

  const pages = [];
  const workspaceSources = enrichedInsights.slice(0, 10).map((insight, index) => fileSource(insight, index, evidenceSnippet(extractedByFileId.get(insight.file_id)?.extracted_text, insight.summary)));

  pages.push({
    id: 'workspace-overview',
    title: 'Workspace Overview',
    slug: 'workspace-overview',
    page_type: 'system',
    category: 'Filebase Intelligence',
    subcategory: 'Workspace Summary',
    summary: `Overview of ${status.total_files || files.length || 0} indexed file(s), focused on content discovery.`,
    source_file_ids: workspaceSources.map((source) => source.file_id).filter(Boolean),
    related_topics: ['Filebase Intelligence', 'Content Discovery'],
    related_pages: [],
    sources: workspaceSources,
    markdown: buildWorkspaceMarkdown({ status, files, insights: enrichedInsights, sources: workspaceSources }),
    updated_at: new Date().toISOString(),
  });

  const byCategory = new Map();
  for (const insight of enrichedInsights) {
    if (!byCategory.has(insight.category)) byCategory.set(insight.category, []);
    byCategory.get(insight.category).push(insight);
  }

  const categoryPageRefs = Array.from(byCategory.keys()).map((category) => ({ id: `category-${safeSlug(category)}`, title: category, slug: `category-${safeSlug(category)}` }));

  for (const [category, categoryInsights] of byCategory.entries()) {
    const categorySources = categoryInsights.slice(0, 14).map((insight, index) => fileSource(insight, index, evidenceSnippet(extractedByFileId.get(insight.file_id)?.extracted_text, insight.summary)));
    const relatedPages = categoryPageRefs.filter((page) => page.title !== category).slice(0, 8);
    pages.push({
      id: `category-${safeSlug(category)}`,
      title: category,
      slug: `category-${safeSlug(category)}`,
      page_type: 'category',
      category,
      subcategory: 'Category Landing Page',
      summary: `Category page for ${categoryInsights.length} related document(s).`,
      source_file_ids: categorySources.map((source) => source.file_id).filter(Boolean),
      related_topics: categoryInsights.map((insight) => insight.subcategory).filter(Boolean).slice(0, 12),
      related_pages: relatedPages,
      sources: categorySources,
      markdown: buildCategoryMarkdown(category, categoryInsights, categorySources, relatedPages),
      updated_at: new Date().toISOString(),
    });
  }

  const byTopic = new Map();
  for (const insight of enrichedInsights) {
    const topicKey = `${insight.category}::${insight.subcategory}`;
    if (!byTopic.has(topicKey)) byTopic.set(topicKey, []);
    byTopic.get(topicKey).push(insight);
  }

  const topicPageRefs = Array.from(byTopic.entries()).map(([key]) => {
    const [category, topic] = key.split('::');
    return { id: `topic-${safeSlug(category)}-${safeSlug(topic)}`, title: topic, slug: `topic-${safeSlug(category)}-${safeSlug(topic)}`, category };
  });

  for (const [topicKey, topicInsights] of byTopic.entries()) {
    const [category, topic] = topicKey.split('::');
    const topicSources = topicInsights.slice(0, 14).map((insight, index) => fileSource(insight, index, evidenceSnippet(extractedByFileId.get(insight.file_id)?.extracted_text, insight.summary)));
    const relatedPages = [{ id: `category-${safeSlug(category)}`, title: category, slug: `category-${safeSlug(category)}` }, ...topicPageRefs.filter((page) => page.category === category && page.title !== topic).slice(0, 6)];
    pages.push({
      id: `topic-${safeSlug(category)}-${safeSlug(topic)}`,
      title: topic,
      slug: `topic-${safeSlug(category)}-${safeSlug(topic)}`,
      page_type: 'topic',
      category,
      subcategory: topic,
      summary: `Topic page built from ${topicInsights.length} related document(s).`,
      source_file_ids: topicSources.map((source) => source.file_id).filter(Boolean),
      related_topics: relatedPages.map((page) => page.title),
      related_pages: relatedPages,
      sources: topicSources,
      markdown: buildTopicMarkdown(topic, category, topicInsights.slice(0, 14), topicSources, relatedPages, files, extractedByFileId),
      updated_at: new Date().toISOString(),
    });
  }

  for (const insight of enrichedInsights.slice(0, filePageLimit)) {
    const relatedPages = [
      { id: `category-${safeSlug(insight.category)}`, title: insight.category, slug: `category-${safeSlug(insight.category)}` },
      { id: `topic-${safeSlug(insight.category)}-${safeSlug(insight.subcategory)}`, title: insight.subcategory, slug: `topic-${safeSlug(insight.category)}-${safeSlug(insight.subcategory)}` },
    ];
    pages.push(buildFileMarkdown(insight, extractedByFileId.get(insight.file_id), relatedPages));
  }

  return { generated_at: new Date().toISOString(), page_count: pages.length, categories: categoryPageRefs, pages };
}
