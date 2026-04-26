import { searchFiles } from '../search/searchService.js';
import { createLocalChatAnswer } from './localProvider.js';

export async function answerFromLocalFiles(db, { question, limit = 5, providerOptions } = {}) {
  if (!question || !question.trim()) {
    throw new Error('question is required');
  }

  const sources = searchFiles(db, { query: question, limit });
  return createLocalChatAnswer({ question, sources, providerOptions });
}
