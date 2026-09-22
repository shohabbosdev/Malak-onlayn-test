/**
 * Telegram Service Facade
 * Ushbu fayl orqa modullar (src/services/telegram/*) uchun shaffof fasad vazifasini bajaradi.
 * Loyihaning mavjud importlari va orqaga qaytuvchi mosligi (backward compatibility) to'liq saqlanadi.
 */

export * from '../types';
export { TelegramAPI, RateLimiter } from '../services/telegram/api';
export {
  delay,
  shuffleArray,
  shuffleWithCorrectIndex,
  escapeHtml,
  generateProgressBar,
  formatTime,
  getUserDisplayName,
  generateRankingMessage,
} from '../services/telegram/formatters';
export { runCountdown } from '../services/telegram/countdown';
export { MultiUserQuizManager } from '../services/telegram/session';
export { PollResultsCollector } from '../services/telegram/collector';
export {
  sendQuizToTelegram,
  sendGroupQuizToTelegram,
  sendChannelQuizToTelegram,
  sendMultiUserQuizToTelegram,
} from '../services/telegram/runner';
