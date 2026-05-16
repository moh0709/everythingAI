import { getSystemStatus, listExtractedFiles, listFileInsights, listIndexedFiles } from '../db/client.js';

function safeSlug(value = 'page') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'page';
}

function parseEntities(entitiesJson) {
  try {
    return JSON.parse(entitiesJson || '{}');
  } catch {
    return {};
  }
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
  return normalized.slice(0, 320);
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

function sourceLine(source) {
  return `- [${source.ref}] ${source.filename} — ${source.location}`;
}

function sourceFootnotes(sources) {
  if (!sources.length) return '';
  return [
    '## Source References',
    '',
    ...sources.map(sourceLine),
    '',
    '## Evidence Snippets',
    '',
    ...sources.map((source) => `**[${source.ref}] ${source.filename}**\n\n> ${source.evidence || 'No evidence snippet available.'}`),
  ].join('\n');
}

function buildWorkspaceMarkdown({ status, files, insights, sources }) {
  const fileTypes = files.reduce((acc, file) => {
    const key = file.extension || 'file';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const dominantTypes = Object.entries(fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type, count]) => `- ${type}: ${count}`)
    .join('\n') || '- No file types available yet.';

  const classifications = insights.reduce((acc, insight) => {
    const key = insight.classification || 'Unclassified';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topicLines = Object.entries(classifications)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => `- ${topic}: ${count} insight(s)`)
    .join('\n') || '- No generated topics available yet.';

  return [
    '# Workspace Overview',
    '',
    '## Overview',
    '',
    `This workspace contains ${status.total_files || files.length || 0} indexed file(s), ${status.extracted_files || 0} extracted file(s), and ${status.insight_files || insights.length || 0} generated insight(s).`,
    '',
    '## Processing Status',
    '',
    `- Indexed files: ${status.indexed_files || 0}`,
    `- Extracted files: ${status.extracted_files || 0}`,
    `- Embedded files: ${status.embedded_files || 0}`,
    `- Insight files: ${status.insight_files || 0}`,
    `- Suggestions: ${status.suggestions || 0}`,
    '',
    '## Main File Types',
    '',
    dominantTypes,
    '',
    '## Dominant Topics',
    '',
    topicLines,
    '',
    sourceFootnotes(sources),
  ].join('\n');
}

function buildTopicMarkdown(topic, topicInsights, sources) {
  const summaries = topicInsights
    .map((insight, index) => {
      const source = sources[index];
      const sentence = firstSentence(insight.summary) || 'No summary available.';
      return `- ${sentence} [${source.ref}]`;
    })
    .join('\n');

  const sourceDocs = sources.map((source) => `- ${source.filename} [${source.ref}]`).join('\n');

  return [
    `# ${topic}`,
    '',
    '## Overview',
    '',
    `This page summarizes knowledge classified as **${topic}** from ${topicInsights.length} source document(s). Every claim below is connected to source references.`,
    '',
    '## Key Points',
    '',
    summaries || '- No key points available yet.',
    '',
    '## Source Documents',
    '',
    sourceDocs || '- No source documents available yet.',
    '',
    sourceFootnotes(sources),
  ].join('\n');
}

function buildFileMarkdown(insight, extractedFile) {
  const evidence = evidenceSnippet(extractedFile?.extracted_text, insight.summary);
  const source = fileSource(insight, 0, evidence);
  const entities = parseEntities(insight.entities_json);
  const entityLines = Object.entries(entities)
    .filter(([, values]) => Array.isArray(values) && values.length)
    .flatMap(([group, values]) => values.slice(0, 8).map((value) => `- ${group}: ${value}`))
    .join('\n');

  return {
    id: `file-${insight.file_id}`,
    title: insight.filename,
    slug: `file-${safeSlug(insight.filename)}-${insight.file_id.slice(0, 8)}`,
    page_type: 'file',
    summary: insight.summary || `Source-backed page for ${insight.filename}.`,
    source_file_ids: [insight.file_id],
    related_topics: [insight.classification || 'Unclassified'],
    sources: [source],
    markdown: [
      `# ${insight.filename}`,
      '',
      '## Overview',
      '',
      `${insight.summary || 'No generated summary is available yet.'} [${source.ref}]`,
      '',
      '## Classification',
      '',
      `- ${insight.classification || 'Unclassified'} [${source.ref}]`,
      '',
      '## Extracted Entities',
      '',
      entityLines || '- No entities extracted yet.',
      '',
      '## Source Location',
      '',
      `- File path: ${insight.absolute_path}`,
      `- Reference level: ${source.location}`,
      '',
      sourceFootnotes([source]),
    ].join('\n'),
    updated_at: insight.generated_at || new Date().toISOString(),
  };
}

export function buildKnowledgeIndex(db, { limit = 500 } = {}) {
  const insights = listFileInsights(db, { limit });
  const entities = new Map();
  const classifications = new Map();

  for (const insight of insights) {
    const parsedEntities = JSON.parse(insight.entities_json || '{}');
    const names = parsedEntities.names || [];

    if (!classifications.has(insight.classification)) {
      classifications.set(insight.classification, []);
    }
    classifications.get(insight.classification).push({
      fileId: insight.file_id,
      filename: insight.filename,
      absolutePath: insight.absolute_path,
      summary: insight.summary,
    });

    for (const name of names) {
      if (!entities.has(name)) {
        entities.set(name, []);
      }
      entities.get(name).push({
        fileId: insight.file_id,
        filename: insight.filename,
        absolutePath: insight.absolute_path,
        classification: insight.classification,
      });
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

  const pages = [];
  const workspaceSources = insights.slice(0, 8).map((insight, index) => fileSource(insight, index, evidenceSnippet(insight.summary)));

  pages.push({
    id: 'workspace-overview',
    title: 'Workspace Overview',
    slug: 'workspace-overview',
    page_type: 'system',
    summary: `Overview of ${status.total_files || files.length || 0} indexed file(s), processing status, dominant topics, and filebase structure.`,
    source_file_ids: workspaceSources.map((source) => source.file_id).filter(Boolean),
    related_topics: ['Filebase Intelligence', 'Processing Status'],
    sources: workspaceSources,
    markdown: buildWorkspaceMarkdown({ status, files, insights, sources: workspaceSources }),
    updated_at: new Date().toISOString(),
  });

  const byTopic = new Map();
  for (const insight of insights) {
    const topic = insight.classification || 'Unclassified';
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push(insight);
  }

  for (const [topic, topicInsights] of byTopic.entries()) {
    const topicSources = topicInsights.slice(0, 12).map((insight, index) => {
      const extractedFile = extractedByFileId.get(insight.file_id);
      return fileSource(insight, index, evidenceSnippet(extractedFile?.extracted_text, insight.summary));
    });

    pages.push({
      id: `topic-${safeSlug(topic)}`,
      title: topic,
      slug: safeSlug(topic),
      page_type: 'topic',
      summary: `Source-backed topic page generated from ${topicInsights.length} file insight(s).`,
      source_file_ids: topicSources.map((source) => source.file_id).filter(Boolean),
      related_topics: Array.from(byTopic.keys()).filter((name) => name !== topic).slice(0, 6),
      sources: topicSources,
      markdown: buildTopicMarkdown(topic, topicInsights.slice(0, 12), topicSources),
      updated_at: new Date().toISOString(),
    });
  }

  for (const insight of insights.slice(0, filePageLimit)) {
    pages.push(buildFileMarkdown(insight, extractedByFileId.get(insight.file_id)));
  }

  return {
    generated_at: new Date().toISOString(),
    page_count: pages.length,
    pages,
  };
}
