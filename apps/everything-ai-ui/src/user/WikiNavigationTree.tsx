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
    <span>{page.page_type}</span>
    <strong>{page.title}</strong>
    {!compact && <small>{sourceCount(page)} source(s)</small>}
  </button>;
}

export function WikiNavigationTree({ pages, selectedPageId, onSelect }: WikiNavigationTreeProps) {
  const tree = buildTree(pages);

  return <div className="wiki-tree">
    {tree.systemPages.length > 0 && <section className="wiki-tree-section">
      <h3>Workspace</h3>
      {tree.systemPages.map((page) => <PageButton key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
    </section>}

    <section className="wiki-tree-section">
      <h3>Categories</h3>
      {!tree.categories.length && <p className="muted">No categories generated yet.</p>}
      {tree.categories.map((category) => <details key={category.name} className="wiki-tree-category" open>
        <summary>
          <span>
            <strong>{category.name}</strong>
            <small>{category.totalPages} page(s) · {category.totalSources} source(s)</small>
          </span>
        </summary>

        {category.landingPage && <PageButton page={category.landingPage} selectedPageId={selectedPageId} onSelect={onSelect} />}

        <div className="wiki-tree-topics">
          {category.topics.map((topic) => <details key={`${category.name}-${topic.name}`} className="wiki-tree-topic" open={Boolean(topic.topicPage && selectedPageId === topic.topicPage.id)}>
            <summary>
              <span>{topic.name}</span>
              <small>{(topic.topicPage ? 1 : 0) + topic.filePages.length + topic.otherPages.length}</small>
            </summary>

            {topic.topicPage && <PageButton compact page={topic.topicPage} selectedPageId={selectedPageId} onSelect={onSelect} />}
            {topic.otherPages.map((page) => <PageButton compact key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
            {topic.filePages.length > 0 && <details className="wiki-tree-files">
              <summary>Source file pages <small>{topic.filePages.length}</small></summary>
              {topic.filePages.map((page) => <PageButton compact key={page.id} page={page} selectedPageId={selectedPageId} onSelect={onSelect} />)}
            </details>}
          </details>)}
        </div>
      </details>)}
    </section>
  </div>;
}

export default WikiNavigationTree;
