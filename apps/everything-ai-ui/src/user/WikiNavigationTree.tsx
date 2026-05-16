type WikiPage = {
  id: string;
  title: string;
  slug: string;
  page_type: 'system' | 'category' | 'topic' | 'file' | string;
  category?: string;
  subcategory?: string;
  summary?: string;
  sources?: unknown[];
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

function sortPages(a: WikiPage, b: WikiPage) {
  const typeOrder: Record<string, number> = {
    system: 0,
    category: 1,
    topic: 2,
    file: 3,
  };
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
  const categoryMap = new Map<string, {
    landingPage?: WikiPage;
    topics: Map<string, WikiTopicNode>;
    loosePages: WikiPage[];
  }>();

  for (const page of pages.filter((item) => item.page_type !== 'system').sort(sortPages)) {
    const categoryName = normalizeCategory(page);
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        topics: new Map(),
        loosePages: [],
      });
    }

    const category = categoryMap.get(categoryName)!;

    if (page.page_type === 'category') {
      category.landingPage = page;
      continue;
    }

    const topicName = normalizeTopic(page);
    if (!category.topics.has(topicName)) {
      category.topics.set(topicName, {
        name: topicName,
        filePages: [],
        otherPages: [],
      });
    }

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

    const categoryPages = [
      value.landingPage,
      ...topics.flatMap((topic) => [topic.topicPage, ...topic.filePages, ...topic.otherPages]),
      ...value.loosePages,
    ].filter(Boolean) as WikiPage[];

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

function PageButton({ page, selectedPageId, onSelect, compact = false }: {
  page: WikiPage;
  selectedPageId?: string;
  onSelect: (pageId: string) => void;
  compact?: boolean;
}) {
  return <button
    className={`wiki-tree-page ${compact ? 'compact' : ''} ${selectedPageId === page.id ? 'selected' : ''}`}
    onClick={() => onSelect(page.id)}
    title={page.summary || page.title}
  >
    <span className="wiki-tree-page-icon">{page.page_type === 'file' ? '📄' : page.page_type === 'topic' ? '📘' : page.page_type === 'category' ? '📁' : '🏠'}</span>
    <span className="wiki-tree-page-label">
      <strong>{page.title}</strong>
      {!compact && <small>{sourceCount(page)} source(s)</small>}
    </span>
  </button>;
}

export function WikiNavigationTree({ pages, selectedPageId, onSelect }: WikiNavigationTreeProps) {
  const tree = buildTree(pages);

  return <div className="wiki-folder-tree">
    {tree.systemPages.length > 0 && <section className="wiki-folder-section">
      <div className="wiki-folder-section-title">Home</div>
      <div className="wiki-folder-root-line">
        {tree.systemPages.map((page) => <PageButton key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
      </div>
    </section>}

    <section className="wiki-folder-section">
      <div className="wiki-folder-section-title">Categories</div>
      {!tree.categories.length && <p className="muted">No categories generated yet.</p>}
      <div className="wiki-folder-root-line">
        {tree.categories.map((category) => {
          const selectedInCategory = isSelectedWithinCategory(category, selectedPageId);
          return <details key={category.name} className="wiki-folder-category" open={selectedInCategory || category.totalPages >= 3}>
            <summary>
              <span className="wiki-folder-node-icon">📁</span>
              <span className="wiki-folder-node-label">
                <strong>{category.name}</strong>
                <small>{category.totalPages} page(s) · {category.totalSources} source(s)</small>
              </span>
            </summary>

            <div className="wiki-folder-children">
              {category.landingPage && <PageButton page={category.landingPage} selectedPageId={selectedPageId} onSelect={onSelect} />}

              {category.topics.map((topic) => {
                const topicPageCount = (topic.topicPage ? 1 : 0) + topic.filePages.length + topic.otherPages.length;
                const selectedInTopic = isSelectedWithinTopic(topic, selectedPageId);
                return <details key={`${category.name}-${topic.name}`} className="wiki-folder-topic" open={selectedInTopic}>
                  <summary>
                    <span className="wiki-folder-node-icon">📂</span>
                    <span className="wiki-folder-node-label">
                      <strong>{topic.name}</strong>
                      <small>{topicPageCount} page(s)</small>
                    </span>
                  </summary>

                  <div className="wiki-folder-children">
                    {topic.topicPage && <PageButton compact page={topic.topicPage} selectedPageId={selectedPageId} onSelect={onSelect} />}
                    {topic.otherPages.map((page) => <PageButton compact key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
                    {topic.filePages.length > 0 && <details className="wiki-folder-files" open={selectedInTopic}>
                      <summary>
                        <span className="wiki-folder-node-icon">🗂️</span>
                        <span className="wiki-folder-node-label">
                          <strong>Source file pages</strong>
                          <small>{topic.filePages.length} file(s)</small>
                        </span>
                      </summary>
                      <div className="wiki-folder-children">
                        {topic.filePages.map((page) => <PageButton compact key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
                      </div>
                    </details>}
                  </div>
                </details>;
              })}
            </div>
          </details>;
        })}
      </div>
    </section>
  </div>;
}

export default WikiNavigationTree;
