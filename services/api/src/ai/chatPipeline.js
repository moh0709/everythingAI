import { searchFiles } from '../search/searchService.js';
import { createConfiguredChatAnswer } from './providerRuntime.js';

export async function answerFromLocalFiles(db, { question, limit = 5, provider } = {}) {
  if (!question || !question.trim()) {
    throw new Error('question is required');
  }

  const sources = searchFiles(db, { query: question, limit });
  return createConfiguredChatAnswer({ question, sources, overrideProvider: provider });
}
