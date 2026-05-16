import { getSystemStatus, listExtractedFiles, listFileInsights, listIndexedFiles } from '../db/client.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg']);
const SPREADSHEET_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf']);

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
  const match = normalized.match(/^(.{40,240}?[.!?])\s/);
  return match?.[1] || normalized.slice(0, 240);
}

function evidenceSnippet(text = '', fallback = '') {
  const normalized = text.toString().replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback || '';
  return normalized.slice(0, 420);
}

function fileSource(file, index, evidence = '') {
  return {
    ref: `S${index + 1}`,
    file_id: file.fileId || file.file_id || file.id,
    filename: file.filename,
    absolute_path: file.absolutePath || file.absolute_path,
    relative_path: file.relative_path,
    location: 'file-level extracted text / insight summary',
    evidence,
  };
}

function markdownTable(headers, rows) {
  if (!rows.length) return '';
  const headerLine = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replaceAll('\n', ' ')).join(' | ')} |`);
  return [headerLine, divider, ...body].join('\n');
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

function buildPageHeader({ title, category, subcategory, summary, updatedAt }) {
  return [
    `# ${title}`,
    '',
    `> ${summary || 'Source-backed generated wiki article.'}`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Category | ${category || 'General Knowledge'} |`,
    `| Subcategory | ${subcategory || 'Unclassified'} |`,
    `| Generated | ${updatedAt} |`,
    '',
  ].join('\n');
}

function buildRelatedPagesBlock(relatedPages = []) {
  if (!relatedPages.length) return '';
  return ['## Related Pages', '', ...relatedPages.map((page) => `- [[${page.title || page}]]`), ''].join('\n');
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
  const fileTypes = files.reduce((acc, file) => {
    const key = file.extension || 'file';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const dominantTypesRows = Object.entries(fileTypes).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([type, count]) => [type, count]);
  const categories = insights.reduce((acc, insight) => {
    const key = insight.category || categoryFor(insight);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categoryRows = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([topic, count]) => [topic, `${count} insight(s)`]);
  const updatedAt = new Date().toISOString();
  return [
    buildPageHeader({ title: 'Workspace Overview', category: 'Filebase Intelligence', subcategory: 'Workspace Summary', summary: `Overview of ${status.total_files || files.length || 0} indexed file(s), processing status, dominant topics, and source-backed wiki pages.`, updatedAt }),
    buildTableOfContents(['Processing Status', 'File Type Distribution', 'Knowledge Categories', 'How to Read This Wiki', 'Sources']),
    '',
    '## Processing Status',
    '',
    markdownTable(['Metric', 'Count'], [['Indexed files', status.indexed_files || 0], ['Extracted files', status.extracted_files || 0], ['Embedded files', status.embedded_files || 0], ['Insight files', status.insight_files || 0], ['Suggestions', status.suggestions || 0]]),
    '',
    '## File Type Distribution',
    '',
    dominantTypesRows.length ? markdownTable(['File type', 'Files'], dominantTypesRows) : 'No file type data is available yet.',
    '',
    '## Knowledge Categories',
    '',
    categoryRows.length ? markdownTable(['Category', 'Evidence'], categoryRows) : 'No generated categories are available yet.',
    '',
    '## How to Read This Wiki',
    '',
    'Each article is generated from indexed local files, extracted content, file insights, and filebase metadata. Source markers such as **[S1]** point to original source files listed at the bottom of each page.',
    '',
    sourceFootnotes(sources),
  ].join('\n');
}

function buildCategoryMarkdown(category, topicInsights, sources, relatedPages) {
  const subcategoryRows = Object.entries(topicInsights.reduce((acc, insight) => {
    const key = insight.subcategory || subcategoryFor(insight);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([subcategory, count]) => [subcategory, count]);
  const keyPointRows = topicInsights.slice(0, 14).map((insight, index) => {
    const source = sources[index];
    return [firstSentence(insight.summary) || 'No summary available yet.', `[${source.ref}] ${insight.filename}`];
  });
  const updatedAt = new Date().toISOString();
  return [
    buildPageHeader({ title: category, category: 'Knowledge Category', subcategory: 'Category Landing Page', summary: `This category page organizes ${topicInsights.length} source-backed document insight(s) into subtopics and related pages.`, updatedAt }),
    buildTableOfContents(['Subcategories', 'Key Findings', 'Related Pages', 'Sources']),
    '',
    '## Subcategories',
    '',
    subcategoryRows.length ? markdownTable(['Subcategory', 'Source documents'], subcategoryRows) : 'No subcategories available yet.',
    '',
    '## Key Findings',
    '',
    keyPointRows.length ? markdownTable(['Finding', 'Source'], keyPointRows) : 'No key findings available yet.',
    '',
    buildRelatedPagesBlock(relatedPages),
    sourceFootnotes(sources),
  ].join('\n');
}

function buildTopicMarkdown(topic, category, topicInsights, sources, relatedPages, allFiles) {
  const keyPoints = topicInsights.map((insight, index) => {
    const source = sources[index];
    return `- ${firstSentence(insight.summary) || 'No summary available.'} **[${source.ref}]**`;
  }).join('\n');
  const sourceRows = sources.map((source) => [source.ref, source.filename, source.location]);
  const relatedFiles = allFiles.filter((file) => topicInsights.some((insight) => insight.file_id === file.id));
  const updatedAt = new Date().toISOString();
  return [
    buildPageHeader({ title: topic, category, subcategory: topic, summary: `This topic page is generated from ${topicInsights.length} source document(s). Claims and summaries are linked to file-level source references.`, updatedAt }),
    buildTableOfContents(['Overview', 'Key Points', 'Source Document Table', 'Media References', 'Related Pages', 'Sources']),
    '',
    '## Overview',
    '',
    `The topic **${topic}** appears in ${topicInsights.length} document insight(s). The page combines extracted file text, generated summaries, metadata, and source references.`,
    '',
    '## Key Points',
    '',
    keyPoints || '- No key points available yet.',
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
  const evidence = evidenceSnippet(extractedFile?.extracted_text, insight.summary);
  const source = fileSource(insight, 0, evidence);
  const entities = parseEntities(insight.entities_json);
  const entityRows = Object.entries(entities).filter(([, values]) => Array.isArray(values) && values.length).flatMap(([group, values]) => values.slice(0, 12).map((value) => [group, value]));
  const category = insight.category || categoryFor(insight);
  const subcategory = insight.subcategory || subcategoryFor(insight);
  const updatedAt = insight.generated_at || new Date().toISOString();
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
      buildPageHeader({ title: insight.filename, category, subcategory, summary: insight.summary || `Source-backed page for ${insight.filename}.`, updatedAt }),
      buildTableOfContents(['Overview', 'Classification', 'Extracted Entities', 'Source Location', 'Related Pages', 'Sources']),
      '',
      '## Overview',
      '',
      `${insight.summary || 'No generated summary is available yet.'} **[${source.ref}]**`,
      '',
      '## Classification',
      '',
      markdownTable(['Field', 'Value'], [['Category', category], ['Subcategory', subcategory], ['AI classification', insight.classification || 'Unclassified'], ['Provider', insight.provider || 'local']]),
      '',
      '## Extracted Entities',
      '',
      entityRows.length ? markdownTable(['Entity group', 'Value'], entityRows) : 'No entities extracted yet.',
      '',
      '## Source Location',
      '',
      `- File path: ${insight.absolute_path}`,
      `- Reference level: ${source.location}`,
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
    return { ...insight, extension, category: categoryFor({ classification: insight.classification, filename: insight.filename, summary: insight.summary, extension }), subcategory: subcategoryFor({ classification: insight.classification, filename: insight.filename, extension }) };
  });
  const pages = [];
  const workspaceSources = enrichedInsights.slice(0, 10).map((insight, index) => fileSource(insight, index, evidenceSnippet(insight.summary)));
  pages.push({ id: 'workspace-overview', title: 'Workspace Overview', slug: 'workspace-overview', page_type: 'system', category: 'Filebase Intelligence', subcategory: 'Workspace Summary', summary: `Overview of ${status.total_files || files.length || 0} indexed file(s), processing status, dominant topics, and filebase structure.`, source_file_ids: workspaceSources.map((source) => source.file_id).filter(Boolean), related_topics: ['Filebase Intelligence', 'Processing Status'], related_pages: [], sources: workspaceSources, markdown: buildWorkspaceMarkdown({ status, files, insights: enrichedInsights, sources: workspaceSources }), updated_at: new Date().toISOString() });
  const byCategory = new Map();
  for (const insight of enrichedInsights) {
    if (!byCategory.has(insight.category)) byCategory.set(insight.category, []);
    byCategory.get(insight.category).push(insight);
  }
  const categoryPageRefs = Array.from(byCategory.keys()).map((category) => ({ id: `category-${safeSlug(category)}`, title: category, slug: `category-${safeSlug(category)}` }));
  for (const [category, categoryInsights] of byCategory.entries()) {
    const categorySources = categoryInsights.slice(0, 14).map((insight, index) => fileSource(insight, index, evidenceSnippet(extractedByFileId.get(insight.file_id)?.extracted_text, insight.summary)));
    const relatedPages = categoryPageRefs.filter((page) => page.title !== category).slice(0, 8);
    pages.push({ id: `category-${safeSlug(category)}`, title: category, slug: `category-${safeSlug(category)}`, page_type: 'category', category, subcategory: 'Category Landing Page', summary: `Category landing page with ${categoryInsights.length} source-backed document insight(s).`, source_file_ids: categorySources.map((source) => source.file_id).filter(Boolean), related_topics: categoryInsights.map((insight) => insight.subcategory).filter(Boolean).slice(0, 12), related_pages: relatedPages, sources: categorySources, markdown: buildCategoryMarkdown(category, categoryInsights, categorySources, relatedPages), updated_at: new Date().toISOString() });
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
    pages.push({ id: `topic-${safeSlug(category)}-${safeSlug(topic)}`, title: topic, slug: `topic-${safeSlug(category)}-${safeSlug(topic)}`, page_type: 'topic', category, subcategory: topic, summary: `Source-backed topic article generated from ${topicInsights.length} file insight(s).`, source_file_ids: topicSources.map((source) => source.file_id).filter(Boolean), related_topics: relatedPages.map((page) => page.title), related_pages: relatedPages, sources: topicSources, markdown: buildTopicMarkdown(topic, category, topicInsights.slice(0, 14), topicSources, relatedPages, files), updated_at: new Date().toISOString() });
  }
  for (const insight of enrichedInsights.slice(0, filePageLimit)) {
    const relatedPages = [{ id: `category-${safeSlug(insight.category)}`, title: insight.category, slug: `category-${safeSlug(insight.category)}` }, { id: `topic-${safeSlug(insight.category)}-${safeSlug(insight.subcategory)}`, title: insight.subcategory, slug: `topic-${safeSlug(insight.category)}-${safeSlug(insight.subcategory)}` }];
    pages.push(buildFileMarkdown(insight, extractedByFileId.get(insight.file_id), relatedPages));
  }
  return { generated_at: new Date().toISOString(), page_count: pages.length, categories: categoryPageRefs, pages };
}
