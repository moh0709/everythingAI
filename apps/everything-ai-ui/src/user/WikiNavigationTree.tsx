import { ReactNode, useMemo, useState } from 'react';

type WikiSource = {
  ref?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  evidence?: string;
};

type WikiPage = {
  id: string;
  title: string;
  slug: string;
  page_type: 'system' | 'category' | 'topic' | 'file' | string;
  category?: string;
  subcategory?: string;
  summary?: string;
  markdown?: string;
  sources?: WikiSource[];
};

type WikiTopicNode = {
  name: string;
  topicPage?: WikiPage;
  filePages: WikiPage[];
  otherPages: WikiPage[];
};

type WikiCategoryNode = {
  name: string;
  landingPage?: WikiPage;
  topics: WikiTopicNode[];
  loosePages: WikiPage[];
  totalPages: number;
  totalSources: number;
};

type WikiNavigationTreeProps = {
  pages: WikiPage[];
  selectedPageId?: string;
  onSelect: (pageId: string) => void;
};

type MatchField = 'title' | 'category' | 'topic' | 'summary' | 'source' | 'content';

type RankedWikiResult = {
  page: WikiPage;
  score: number;
  matchFields: MatchField[];
  snippet: string;
};

const MATCH_FIELD_LABELS: Record<MatchField, string> = {
  title: 'Title',
  category: 'Category',
  topic: 'Topic',
  summary: 'Summary',
  source: 'Source',
  content: 'Content',
};

function sourceCount(page: WikiPage) {
  return Array.isArray(page.sources) ? page.sources.length : 0;
}

function normalizeCategory(page: WikiPage) {
  if (page.page_type === 'system') return 'Workspace';
  return page.category || 'General Knowledge';
}

function normalizeTopic(page: WikiPage) {
  if (page.page_type === 'category') return 'Overview';
  return page.subcategory || page.title || 'General';
}

function normalizeText(value = '') {
  return value.toString().toLowerCase().replace(/[^a-z0-9æøåäöüéèêëáàâíìîóòôúùûñç\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function sourceText(page: WikiPage) {
  return (page.sources || [])
    .map((source) => [source.filename, source.absolute_path, source.relative_path, source.evidence].filter(Boolean).join(' '))
    .join(' ');
}

function searchCorpus(page: WikiPage) {
  return [page.title, page.category, page.subcategory, page.summary, page.markdown, sourceText(page)].filter(Boolean).join(' ');
}

function queryTerms(query: string) {
  return normalizeText(query).split(' ').filter((term) => term.length >= 2);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function literalTermPattern(terms: string[], capture = false) {
  const alternatives = terms.map(escapeRegExp).join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}])${capture ? `(${alternatives})` : `(?:${alternatives})`}(?![\\p{L}\\p{N}])`, 'giu');
}

function containsLiteralTerm(text: string, term: string) {
  return literalTermPattern([term]).test(text);
}

function findFirstLiteralTermIndex(text: string, terms: string[]) {
  if (!terms.length) return -1;
  const match = literalTermPattern(terms).exec(text);
  return match?.index ?? -1;
}

function makeSnippet(text = '', terms: string[]) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'No preview text available.';
  const literalIndex = findFirstLiteralTermIndex(compact, terms);
  if (literalIndex < 0) return compact.slice(0, 180);
  const index = Math.max(0, literalIndex - 70);
  return `${index > 0 ? '…' : ''}${compact.slice(index, index + 220)}${index + 220 < compact.length ? '…' : ''}`;
}

function snippetSourceForMatch(page: WikiPage, matchFields: MatchField[], terms: string[]) {
  const candidates: Array<{ field: MatchField; value: string }> = [
    { field: 'content', value: page.markdown || '' },
    { field: 'summary', value: page.summary || '' },
    { field: 'source', value: sourceText(page) },
    { field: 'title', value: page.title || '' },
    { field: 'topic', value: page.subcategory || '' },
    { field: 'category', value: page.category || '' },
  ];

  const literalMatch = candidates.find(({ field, value }) => (
    matchFields.includes(field) && terms.some((term) => containsLiteralTerm(value, term))
  ));
  return literalMatch?.value || page.markdown || page.summary || sourceText(page) || page.title;
}

function rankPage(page: WikiPage, query: string): RankedWikiResult | null {
  const terms = queryTerms(query);
  if (!terms.length) return null;

  const title = normalizeText(page.title);
  const category = normalizeText(page.category || '');
  const subcategory = normalizeText(page.subcategory || '');
  const summary = normalizeText(page.summary || '');
  const markdown = normalizeText(page.markdown || '');
  const sources = normalizeText(sourceText(page));

  let score = 0;
  const reasons = new Set<MatchField>();

  for (const term of terms) {
    if (title === term || title.includes(term)) { score += 60; reasons.add('title'); }
    if (category.includes(term)) { score += 30; reasons.add('category'); }
    if (subcategory.includes(term)) { score += 34; reasons.add('topic'); }
    if (summary.includes(term)) { score += 18; reasons.add('summary'); }
    if (sources.includes(term)) { score += 16; reasons.add('source'); }
    if (markdown.includes(term)) {
      const occurrences = Math.min(8, markdown.split(term).length - 1);
      score += 6 * occurrences;
      reasons.add('content');
    }
  }

  const exactPhrase = normalizeText(query);
  const fullCorpus = normalizeText(searchCorpus(page));
  if (fullCorpus.includes(exactPhrase)) score += 40;
  if (!score) return null;

  const matchFields = Array.from(reasons);
  return {
    page,
    score,
    matchFields,
    snippet: makeSnippet(snippetSourceForMatch(page, matchFields, terms), terms),
  };
}

function searchPages(pages: WikiPage[], query: string) {
  return pages
    .map((page) => rankPage(page, query))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score || a!.page.title.localeCompare(b!.page.title))
    .slice(0, 12) as RankedWikiResult[];
}

function highlightLiteralTerms(text: string, query: string): ReactNode {
  const terms = queryTerms(query).sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  const expression = literalTermPattern(terms, true);
  const parts = text.split(expression);
  return parts.map((part, index) => (
    terms.some((term) => part.toLocaleLowerCase() === term.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`} className="wiki-search-highlight">{part}</mark>
      : part
  ));
}

function sortPages(a: WikiPage, b: WikiPage) {
  const typeOrder: Record<string, number> = { system: 0, category: 1, topic: 2, file: 3 };
  return (typeOrder[a.page_type] ?? 9) - (typeOrder[b.page_type] ?? 9) || a.title.localeCompare(b.title);
}

function isSelectedWithinTopic(topic: WikiTopicNode, selectedPageId?: string) {
  if (!selectedPageId) return false;
  return topic.topicPage?.id === selectedPageId
    || topic.filePages.some((page) => page.id === selectedPageId)
    || topic.otherPages.some((page) => page.id === selectedPageId);
}

function isSelectedWithinCategory(category: WikiCategoryNode, selectedPageId?: string) {
  if (!selectedPageId) return false;
  return category.landingPage?.id === selectedPageId
    || category.loosePages.some((page) => page.id === selectedPageId)
    || category.topics.some((topic) => isSelectedWithinTopic(topic, selectedPageId));
}

function buildTree(pages: WikiPage[]) {
  const systemPages = pages.filter((page) => page.page_type === 'system').sort(sortPages);
  const categoryMap = new Map<string, { landingPage?: WikiPage; topics: Map<string, WikiTopicNode>; loosePages: WikiPage[] }>();

  for (const page of pages.filter((item) => item.page_type !== 'system').sort(sortPages)) {
    const categoryName = normalizeCategory(page);
    if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, { topics: new Map(), loosePages: [] });
    const category = categoryMap.get(categoryName)!;
    if (page.page_type === 'category') { category.landingPage = page; continue; }

    const topicName = normalizeTopic(page);
    if (!category.topics.has(topicName)) category.topics.set(topicName, { name: topicName, filePages: [], otherPages: [] });
    const topic = category.topics.get(topicName)!;
    if (page.page_type === 'topic') topic.topicPage = page;
    else if (page.page_type === 'file') topic.filePages.push(page);
    else topic.otherPages.push(page);
  }

  const categories: WikiCategoryNode[] = Array.from(categoryMap.entries()).map(([name, value]) => {
    const topics = Array.from(value.topics.values()).map((topic) => ({
      ...topic,
      filePages: topic.filePages.sort(sortPages),
      otherPages: topic.otherPages.sort(sortPages),
    })).sort((a, b) => {
      const aCount = (a.topicPage ? 1 : 0) + a.filePages.length + a.otherPages.length;
      const bCount = (b.topicPage ? 1 : 0) + b.filePages.length + b.otherPages.length;
      return bCount - aCount || a.name.localeCompare(b.name);
    });
    const categoryPages = [value.landingPage, ...topics.flatMap((topic) => [topic.topicPage, ...topic.filePages, ...topic.otherPages]), ...value.loosePages].filter(Boolean) as WikiPage[];
    return {
      name,
      landingPage: value.landingPage,
      topics,
      loosePages: value.loosePages.sort(sortPages),
      totalPages: categoryPages.length,
      totalSources: categoryPages.reduce((sum, page) => sum + sourceCount(page), 0),
    };
  }).sort((a, b) => b.totalPages - a.totalPages || a.name.localeCompare(b.name));

  return { systemPages, categories };
}

function PageButton({ page, selectedPageId, onSelect, compact = false }: { page: WikiPage; selectedPageId?: string; onSelect: (pageId: string) => void; compact?: boolean }) {
  return <button
    className={`wiki-tree-page ${compact ? 'compact' : ''} ${selectedPageId === page.id ? 'selected' : ''}`}
    onClick={() => onSelect(page.id)}
    title={page.summary || page.title}
  >
    <span className="wiki-tree-page-icon">{page.page_type === 'file' ? '📄' : page.page_type === 'topic' ? '📘' : page.page_type === 'category' ? '📁' : '🏠'}</span>
    <span className="wiki-tree-page-label"><strong>{page.title}</strong>{!compact && <small>{sourceCount(page)} source(s)</small>}</span>
  </button>;
}

function WikiSearchResults({ results, query, selectedPageId, onSelect }: { results: RankedWikiResult[]; query: string; selectedPageId?: string; onSelect: (pageId: string) => void }) {
  return <section className="wiki-search-results" aria-label="Knowledge Base search results">
    <div className="wiki-folder-section-title">Search results</div>
    {!results.length && <p className="muted">No wiki pages matched this search.</p>}
    {results.map((result) => <button
      key={result.page.id}
      className={`wiki-search-result ${selectedPageId === result.page.id ? 'selected' : ''}`}
      onClick={() => onSelect(result.page.id)}
      aria-label={`Open ${result.page.title}`}
    >
      <span className="wiki-search-result-type">{result.page.page_type} · Matched: {result.matchFields.map((field) => MATCH_FIELD_LABELS[field]).join(', ')}</span>
      <strong>{highlightLiteralTerms(result.page.title, query)}</strong>
      <small>{result.page.category || 'Knowledge'}{result.page.subcategory ? ` / ${result.page.subcategory}` : ''}</small>
      <p>{highlightLiteralTerms(result.snippet, query)}</p>
    </button>)}
  </section>;
}

export function WikiNavigationTree({ pages, selectedPageId, onSelect }: WikiNavigationTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const tree = useMemo(() => buildTree(pages), [pages]);
  const results = useMemo(() => searchPages(pages, searchQuery), [pages, searchQuery]);
  const searching = searchQuery.trim().length > 1;

  return <div className="wiki-folder-tree">
    <section className="wiki-search-panel">
      <label>
        <span>Search knowledge base</span>
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search titles, topics, document content, source files..." />
      </label>
      {searching && <button className="wiki-clear-search" onClick={() => setSearchQuery('')}>Clear</button>}
    </section>

    {searching ? <WikiSearchResults results={results} query={searchQuery} selectedPageId={selectedPageId} onSelect={onSelect} /> : <>
      {tree.systemPages.length > 0 && <section className="wiki-folder-section">
        <div className="wiki-folder-section-title">Home</div>
        <div className="wiki-folder-root-line">{tree.systemPages.map((page) => <PageButton key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}</div>
      </section>}

      <section className="wiki-folder-section">
        <div className="wiki-folder-section-title">Categories</div>
        {!tree.categories.length && <p className="muted">No categories generated yet.</p>}
        <div className="wiki-folder-root-line">
          {tree.categories.map((category) => {
            const selectedInCategory = isSelectedWithinCategory(category, selectedPageId);
            return <details key={category.name} className="wiki-folder-category" open={selectedInCategory || category.totalPages >= 3}>
              <summary><span className="wiki-folder-node-icon">📁</span><span className="wiki-folder-node-label"><strong>{category.name}</strong><small>{category.totalPages} page(s) · {category.totalSources} source(s)</small></span></summary>
              <div className="wiki-folder-children">
                {category.landingPage && <PageButton page={category.landingPage} selectedPageId={selectedPageId} onSelect={onSelect} />}
                {category.topics.map((topic) => {
                  const topicPageCount = (topic.topicPage ? 1 : 0) + topic.filePages.length + topic.otherPages.length;
                  const selectedInTopic = isSelectedWithinTopic(topic, selectedPageId);
                  return <details key={`${category.name}-${topic.name}`} className="wiki-folder-topic" open={selectedInTopic}>
                    <summary><span className="wiki-folder-node-icon">📂</span><span className="wiki-folder-node-label"><strong>{topic.name}</strong><small>{topicPageCount} page(s)</small></span></summary>
                    <div className="wiki-folder-children">
                      {topic.topicPage && <PageButton compact page={topic.topicPage} selectedPageId={selectedPageId} onSelect={onSelect} />}
                      {topic.otherPages.map((page) => <PageButton compact key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
                      {topic.filePages.length > 0 && <details className="wiki-folder-files" open={selectedInTopic}>
                        <summary><span className="wiki-folder-node-icon">🗂️</span><span className="wiki-folder-node-label"><strong>Source file pages</strong><small>{topic.filePages.length} file(s)</small></span></summary>
                        <div className="wiki-folder-children">{topic.filePages.map((page) => <PageButton compact key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}</div>
                      </details>}
                    </div>
                  </details>;
                })}
              </div>
            </details>;
          })}
        </div>
      </section>
    </>}
  </div>;
}

export default WikiNavigationTree;
