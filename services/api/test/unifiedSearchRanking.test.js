import test from 'node:test';
import assert from 'node:assert/strict';
import { rankUnifiedFileResults } from '../src/search/unifiedSearchService.js';

function file(id, filename) {
  return {
    id,
    filename,
    absolute_path: `/workspace/${filename}`,
    relative_path: filename,
    extension: 'txt',
    recovery_status: 'active',
  };
}

test('ranked unified search fuses duplicate keyword and semantic rows with an honest explanation', () => {
  const keyword = [file('a', 'alpha.txt'), file('b', 'beta.txt')];
  const semantic = [
    { ...file('b', 'beta.txt'), score: 0.91, snippet: 'semantic beta context' },
    { ...file('c', 'gamma.txt'), score: 0.82, snippet: 'semantic gamma context' },
  ];

  const ranked = rankUnifiedFileResults(keyword, semantic, 10);

  assert.deepEqual(ranked.map((row) => row.id), ['b', 'a', 'c']);
  assert.equal(ranked.filter((row) => row.id === 'b').length, 1);
  assert.deepEqual(ranked[0].search_match, {
    basis: 'keyword + semantic',
    keyword_rank: 2,
    semantic_rank: 1,
    semantic_score: 0.91,
    explanation: 'Matched indexed text and semantic similarity.',
  });
  assert.equal(ranked[1].search_match.basis, 'keyword');
  assert.equal(ranked[1].search_match.semantic_score, null);
  assert.equal(ranked[2].search_match.basis, 'semantic');
  assert.equal(ranked[2].search_match.keyword_rank, null);
  assert.equal(ranked[2].snippet, 'semantic gamma context');
});

test('ranked unified search orders semantic-only matches by score with deterministic tie breaking', () => {
  const semantic = [
    { ...file('z', 'zeta.txt'), score: 0.5 },
    { ...file('a', 'alpha.txt'), score: 0.7 },
    { ...file('b', 'beta.txt'), score: 0.7 },
  ];

  const ranked = rankUnifiedFileResults([], semantic, 10);

  assert.deepEqual(ranked.map((row) => row.filename), ['alpha.txt', 'beta.txt', 'zeta.txt']);
  assert.deepEqual(ranked.map((row) => row.search_match.basis), ['semantic', 'semantic', 'semantic']);
});

test('ranked unified search respects the result limit after fusion', () => {
  const keyword = [file('a', 'alpha.txt'), file('b', 'beta.txt')];
  const semantic = [{ ...file('c', 'gamma.txt'), score: 0.99 }];

  const ranked = rankUnifiedFileResults(keyword, semantic, 2);

  assert.equal(ranked.length, 2);
  assert.deepEqual(ranked.map((row) => row.id), ['a', 'b']);
});
