import React from 'react';
import './searchResultContext.css';

type SearchBasis = 'keyword' | 'semantic' | 'keyword + semantic';

type SearchResultContextProps = {
  filename: string;
  snippet?: string | null;
  query: string;
  basis: SearchBasis;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function literalQueryTerms(query: string) {
  return [...new Set(query.trim().split(/\s+/).map((term) => term.trim()).filter(Boolean))];
}

function highlightLiteralTerms(text: string, query: string) {
  const terms = literalQueryTerms(query);
  if (!terms.length) return text;

  const termPattern = terms.map(escapeRegExp).join('|');
  const expression = new RegExp(`(?<![\\p{L}\\p{N}_])(${termPattern})(?![\\p{L}\\p{N}_])`, 'giu');
  const normalizedTerms = new Set(terms.map((term) => term.toLocaleLowerCase()));

  return text.split(expression).filter(Boolean).map((part, index) => (
    normalizedTerms.has(part.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
  ));
}

export function SearchResultContext({ filename, snippet, query, basis }: SearchResultContextProps) {
  const normalizedSnippet = snippet?.trim();
  const semanticOnly = basis === 'semantic';

  return (
    <div className="search-result-context" aria-label={`Search context for ${filename}`}>
      <div className="search-result-context-header">
        <strong>{semanticOnly ? 'Semantic context' : 'Keyword context'}</strong>
        {semanticOnly ? <small>Related context; exact query terms may not appear.</small> : <small>Context returned by indexed search evidence.</small>}
      </div>
      {normalizedSnippet
        ? <p>{highlightLiteralTerms(normalizedSnippet, query)}</p>
        : <p className="search-result-context-empty">No result snippet available.</p>}
    </div>
  );
}
