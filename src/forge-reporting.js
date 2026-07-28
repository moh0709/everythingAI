import { request } from 'node:https';
import { sanitizeReport } from './forge-trigger.js';

function telegramRequest({ token, chatId, text }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true });
    const req = request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, statusCode: response.statusCode, response: raw.slice(0, 200) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

export async function sendForgeReport({ event, issue, contextPath, transport = telegramRequest, env = process.env } = {}) {
  const safe = sanitizeReport({ agent: 'Forge', event, issue: { number: issue?.number, title: issue?.title, url: issue?.url }, contextPath });
  const text = `[Forge] ${safe.event} issue #${safe.issue?.number ?? 'unknown'}${safe.contextPath ? `\nContext: ${safe.contextPath}` : ''}`;
  if (!env.FORGE_TELEGRAM_BOT_TOKEN || !env.FORGE_TELEGRAM_CHAT_ID) return { sent: false, reason: 'not-configured', safeEvent: safe.event };
  try {
    const result = await transport({ token: env.FORGE_TELEGRAM_BOT_TOKEN, chatId: env.FORGE_TELEGRAM_CHAT_ID, text });
    return { sent: Boolean(result?.ok), statusCode: result?.statusCode, safeEvent: safe.event };
  } catch (error) {
    return { sent: false, reason: 'transport-failed', error: error.message, safeEvent: safe.event };
  }
}
