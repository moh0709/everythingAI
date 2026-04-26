const TYPE_CATEGORIES = new Map([
  ['pdf', 'documents'],
  ['doc', 'documents'],
  ['docx', 'documents'],
  ['odt', 'documents'],
  ['rtf', 'documents'],
  ['txt', 'notes'],
  ['md', 'notes'],
  ['xlsx', 'spreadsheets'],
  ['xls', 'spreadsheets'],
  ['ods', 'spreadsheets'],
  ['csv', 'spreadsheets'],
  ['ppt', 'presentations'],
  ['pptx', 'presentations'],
  ['jpg', 'images'],
  ['jpeg', 'images'],
  ['png', 'images'],
  ['gif', 'images'],
  ['svg', 'images'],
  ['mp3', 'audio'],
  ['wav', 'audio'],
  ['mp4', 'video'],
  ['mov', 'video'],
  ['zip', 'archives'],
  ['rar', 'archives'],
  ['7z', 'archives'],
  ['json', 'development'],
  ['xml', 'development'],
  ['html', 'development'],
  ['css', 'development'],
  ['js', 'development'],
  ['ts', 'development'],
  ['py', 'development'],
  ['sqlite', 'databases'],
  ['db', 'databases'],
]);

const CONTENT_RULES = [
  {
    folder: 'contracts',
    category: 'legal',
    tags: ['contract', 'legal'],
    confidence: 0.9,
    patterns: ['contract', 'agreement', 'terms and conditions', 'supplier agreement'],
  },
  {
    folder: 'finance',
    category: 'financial',
    tags: ['financial'],
    confidence: 0.86,
    patterns: ['invoice', 'receipt', 'payment', 'cost', 'budget', 'purchase order'],
  },
  {
    folder: 'meetings',
    category: 'administrative',
    tags: ['meeting'],
    confidence: 0.8,
    patterns: ['meeting minutes', 'agenda', 'attendees', 'action items'],
  },
  {
    folder: 'projects',
    category: 'project',
    tags: ['project'],
    confidence: 0.78,
    patterns: ['project', 'milestone', 'roadmap', 'launch', 'deliverable'],
  },
  {
    folder: 'reports',
    category: 'report',
    tags: ['report'],
    confidence: 0.76,
    patterns: ['report', 'summary', 'analysis', 'quarterly', 'annual'],
  },
  {
    folder: 'communication',
    category: 'correspondence',
    tags: ['communication'],
    confidence: 0.7,
    patterns: ['email', '@', 'dear ', 'regards', 'follow up'],
  },
];

function wordsFromText(text) {
  return (text || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getExtension(file) {
  return (file.extension || '').replace('.', '').toLowerCase();
}

function detectContentRule(text) {
  const normalized = text.toLowerCase();
  return CONTENT_RULES.find((rule) => rule.patterns.some((pattern) => normalized.includes(pattern)));
}

function extractImportantTerms(file, text) {
  const words = wordsFromText(`${file.filename} ${text}`);
  const blocked = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'before', 'after', 'file',
    'notes', 'document', 'project', 'requires', 'contract', 'terms',
  ]);
  const counts = new Map();

  for (const word of words) {
    if (word.length < 4 || blocked.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([word]) => word);
}

export function analyzeFileForOrganization(file) {
  const extension = getExtension(file);
  const text = `${file.extracted_text || ''} ${file.filename || ''}`;
  const contentRule = detectContentRule(text);
  const typeCategory = TYPE_CATEGORIES.get(extension) || 'other';
  const importantTerms = extractImportantTerms(file, text);
  const tags = new Set([extension || 'unknown-type', typeCategory]);

  if (contentRule) {
    for (const tag of contentRule.tags) tags.add(tag);
    tags.add(contentRule.category);
  }

  for (const term of importantTerms) tags.add(term);

  const folder = contentRule?.folder || typeCategory;
  const category = contentRule?.category || typeCategory;
  const confidence = contentRule?.confidence || (typeCategory === 'other' ? 0.35 : 0.72);
  const baseName = [category, ...importantTerms].filter(Boolean).slice(0, 4).join('-');
  const suggestedBaseName = slugify(baseName) || slugify(file.filename.replace(/\.[^.]+$/, ''));

  return {
    source: 'organizor2-adapted-rules',
    folder,
    category,
    tags: Array.from(tags).slice(0, 8),
    confidence,
    suggestedBaseName,
    reason: contentRule
      ? `Matched Organizor2-inspired content rule for ${contentRule.category}.`
      : `Matched Organizor2-inspired type category for .${extension || 'unknown'} files.`,
  };
}
