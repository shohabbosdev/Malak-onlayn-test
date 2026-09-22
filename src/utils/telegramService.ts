import { Question, TelegramConfig, TestResult } from '../types';

// Telegram API response interface
interface TelegramAPIResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  parameters?: { retry_after?: number };
}

// Telegram API payload interface
interface TelegramAPIPayload {
  chat_id?: string;
  text?: string;
  parse_mode?: string;
  disable_web_page_preview?: boolean;
  question?: string;
  options?: string[];
  type?: string;
  correct_option_id?: number;
  is_anonymous?: boolean;
  protect_content?: boolean;
  open_period?: number;
  explanation?: string;
  explanation_parse_mode?: string;
  timeout?: number;
  allowed_updates?: string[];
  offset?: number;
}

// Foydalanuvchi ma'lumotlari uchun interface
interface UserInfo {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

// Foydalanuvchi natijasi uchun interface
export interface UserResult extends TestResult {
  userInfo: UserInfo;
  completionTime: number; // sekundlarda
  rank?: number;
}

// Quiz sessiyasi uchun interface
interface QuizSession {
  sessionId: string;
  questions: Question[];
  participants: Map<string, UserInfo>;
  results: Map<string, UserResult>;
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
}

// Poll ma'lumotlari uchun interface
// interface PollInfo {
//   pollId: string;
//   questionIndex: number;
//   correctOptionId: number;
//   rowNumber: number; // Excel qator raqami
// }

// PollResultsCollector klassi
// Har bir foydalanuvchi uchun alohida poll IDlarni kuzatish
interface UserPollState {
  expectedPollId: string;
  questionIndex: number;
  correctOptionId: number;
  isAnswered: boolean;
  createdAt: number; // State yaratilgan vaqt
}

class PollResultsCollector {
  private userStates: Map<string, UserPollState> = new Map(); // userId -> UserPollState
  private results: Map<string, Map<number, boolean>> = new Map(); // userId -> (questionIndex -> isCorrect)
  private readonly maxStateAge = 300000; // 5 minutes in milliseconds

  constructor(private telegramAPI: TelegramAPI) {
    // Clean up old states periodically
    setInterval(() => this.cleanupOldStates(), 60000); // Every minute
  }

  // Foydalanuvchi uchun kutish holatini o'rnatish
  setUserPollState(userId: string, pollId: string, questionIndex: number, correctOptionId: number): void {
    this.userStates.set(userId, {
      expectedPollId: pollId,
      questionIndex,
      correctOptionId,
      isAnswered: false,
      createdAt: Date.now()
    });
    
    // Foydalanuvchi uchun natijalar mapini yaratish (agar mavjud bo'lmasa)
    if (!this.results.has(userId)) {
      this.results.set(userId, new Map());
    }
  }

  // Bitta poll uchun foydalanuvchi javobini kutish
  async waitForSinglePollResult(
    userIds: string[],
    timeoutSeconds: number
  ): Promise<boolean> {
    console.log(`Bitta poll uchun javob kutish: ${userIds.length} foydalanuvchi`);

    const startTime = Date.now();
    const timeoutMs = Math.min(timeoutSeconds * 1000, 300000); // Max 5 minutes
    let offset: number | undefined = undefined;

    // Barcha foydalanuvchilar javob berganligini tekshirish
    const allUsersAnswered = () => {
      for (const userId of userIds) {
        const state = this.userStates.get(userId);
        if (!state || !state.isAnswered) {
          return false;
        }
      }
      return true;
    };

    while (Date.now() - startTime < timeoutMs && !allUsersAnswered()) {
      try {
        const updates = await this.telegramAPI.getUpdates(offset, ['poll_answer']);
        for (const update of updates) {
          if (update.poll_answer) {
            const { user, poll_id, option_ids } = update.poll_answer;
            const userId = user.id.toString();
            const state = this.userStates.get(userId);

            // Agar bu foydalanuvchi kutayotgan poll bo'lsa
            if (state && state.expectedPollId === poll_id && !state.isAnswered) {
              // To'g'ri javobni tekshirish
              const isCorrect = option_ids.includes(state.correctOptionId);
              this.results.get(userId)!.set(state.questionIndex, isCorrect);
              
              // Foydalanuvchi javob bergan deb belgilash
              state.isAnswered = true;
              
              console.log(`Foydalanuvchi ${userId} javob berdi`);
            }

            // Offset'ni yangilash
            offset = update.update_id + 1;
          }
        }

        // Agar hamma javob bermagan bo'lsa, biroz kutamiz
        if (!allUsersAnswered()) {
          await delay(1000);
        }
      } catch (error) {
        console.warn('getUpdates xatosi:', error);
        await delay(2000);
      }
    }

    // Vaqt tugagan yoki hamma javob bergan
    return allUsersAnswered();
  }

  // Barcha natijalarni olish
  getResults(): Map<string, Map<number, boolean>> {
    return this.results;
  }

  // Foydalanuvchi uchun kutish holatini tozalash
  clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  // Guruhdagi poll uchun a'zolarning javoblarini yig'ish (qat'iy taymer asosida)
  async waitForGroupPollAnswers(
    pollId: string,
    questionIndex: number,
    correctOptionId: number,
    timeoutSeconds: number,
    sessionId: string,
    quizManager: MultiUserQuizManager
  ): Promise<number> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let offset: number | undefined = undefined;
    let answersCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const remainingMs = timeoutMs - (Date.now() - startTime);
        if (remainingMs <= 0) break;

        // Long-polling kutishini maksimal 1 soniya qilamiz (tezkor aylanib, vaqtida chiqishi uchun)
        const pollTimeout = Math.min(1, Math.max(1, Math.ceil(remainingMs / 1000)));
        const updates = await this.telegramAPI.getUpdates(offset, ['poll_answer'], pollTimeout);

        for (const update of updates) {
          if (update.poll_answer) {
            const { user, poll_id, option_ids } = update.poll_answer;
            if (poll_id === pollId) {
              const userId = user.id.toString();
              const isCorrect = option_ids.includes(correctOptionId);

              const userInfo: UserInfo = {
                userId,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                startTime: new Date(),
                isActive: true,
              };

              quizManager.recordUserAnswer(sessionId, userInfo, questionIndex, isCorrect);
              answersCount++;
              console.log(`Guruh a'zosi ${user.first_name || userId} javob berdi (${isCorrect ? 'to‘g‘ri' : 'noto‘g‘ri'})`);
            }
          }
          offset = update.update_id + 1;
        }

        if (Date.now() - startTime < timeoutMs) {
          await delay(200);
        }
      } catch (error) {
        console.warn('getUpdates xatosi:', error);
        await delay(500);
      }
    }

    return answersCount;
  }

  // Eski holatlarni tozalash
  private cleanupOldStates(): void {
    const now = Date.now();
    for (const [userId, state] of this.userStates.entries()) {
      if (now - state.createdAt > this.maxStateAge) {
        this.userStates.delete(userId);
        console.log(`Eski poll holati o'chirildi: foydalanuvchi ${userId}`);
      }
    }
  }
}

// RateLimiter klassi
class RateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly windowSize = 60000; // 1 minute window
  private readonly maxRequestsPerWindow = 1500; // 1500 requests per minute

  constructor(requestsPerSecond: number = 3) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.windowSize) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    // Check if we've exceeded rate limits
    if (this.requestCount >= this.maxRequestsPerWindow) {
      const timeToWait = this.windowSize - (now - this.windowStart);
      if (timeToWait > 0) {
        console.warn(`Rate limit exceeded. Waiting ${timeToWait}ms`);
        await delay(timeToWait);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
    
    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await delay(this.minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}

// TelegramAPI klassi
class TelegramAPI {
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;
  private readonly maxRetries: number = 3;

  constructor(private readonly token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.rateLimiter = new RateLimiter();
  }

  async sendMessage(chatId: string, text: string, parseMode: string = 'HTML'): Promise<void> {
    await this.rateLimiter.waitIfNeeded();
    const payload = {
      chat_id: chatId,
      text: this.sanitizeText(text),
      parse_mode: parseMode,
      disable_web_page_preview: true,
    };
    await this.makeRequestWithRetry('sendMessage', payload);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async sendPoll(
    chatId: string,
    question: string,
    options: string[],
    correctOptionId: number,
    openPeriod: number = 20,
    rowNumber: number,
    isAnonymous: boolean = false
  ): Promise<string> {
    await this.rateLimiter.waitIfNeeded();

    // 1. Variantlar va savol uzunligini tekshirish
    // Telegram API: question max 300 ta belgi, har bir poll option max 100 ta belgi
    const isLongQuestion = question.length > 280;
    const hasLongOptions = options.some((opt) => String(opt || '').trim().length > 90);

    // 2. Agar savol yoki variantlar uzun bo'lsa, to'liq matnni avval xabar sifatida yuborish
    if (isLongQuestion || hasLongOptions) {
      let fullMessage = `📋 <b>Savol va variantlar:</b>\n\n<b>Savol:</b>\n${this.escapeHtml(question)}\n\n<b>Javob variantlari:</b>\n`;

      options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx); // A, B, C, D...
        fullMessage += `<b>${letter})</b> ${this.escapeHtml(opt)}\n\n`;
      });

      fullMessage += `<i>Javobingizni quyidagi so‘rovnomada tanlang 👇</i>`;

      // Telegram xabari uzunlik chegarasi (4096 belgi)
      if (fullMessage.length > 4000) {
        await this.sendMessage(chatId, `📝 <b>Savol:</b>\n${this.escapeHtml(question)}`, 'HTML');
        let optionsMsg = `<b>Javob variantlari:</b>\n\n`;
        options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          optionsMsg += `<b>${letter})</b> ${this.escapeHtml(opt)}\n\n`;
        });
        await this.sendMessage(chatId, optionsMsg, 'HTML');
      } else {
        await this.sendMessage(chatId, fullMessage, 'HTML');
      }
    }

    // 3. Poll uchun savolni tayyorlash (maksimal 300 belgi)
    let sanitizedQuestion = question.trim();
    if (sanitizedQuestion.length > 300) {
      sanitizedQuestion = sanitizedQuestion.substring(0, 297) + '...';
    }

    // 4. Poll uchun variantlarni tayyorlash (har biri maksimal 100 belgi)
    let sanitizedOptions = options.map((opt, idx) => {
      const cleanOpt = String(opt || '').trim();
      const letter = String.fromCharCode(65 + idx);

      if (hasLongOptions) {
        const alreadyHasLetter = /^[A-Z][\.\)\-]/i.test(cleanOpt);
        const prefix = alreadyHasLetter ? '' : `${letter}) `;
        const maxLen = 100 - prefix.length;

        if (cleanOpt.length > maxLen) {
          return `${prefix}${cleanOpt.substring(0, maxLen - 3)}...`;
        }
        return `${prefix}${cleanOpt}`;
      } else {
        return cleanOpt.length > 100 ? cleanOpt.substring(0, 97) + '...' : cleanOpt;
      }
    });

    if (sanitizedOptions.length < 2) {
      throw new Error(`Poll variantlari soni kamida 2 ta bo'lishi kerak. Hozir: ${sanitizedOptions.length}`);
    }

    if (sanitizedOptions.length > 10) {
      sanitizedOptions = sanitizedOptions.slice(0, 10);
    }

    if (correctOptionId < 0 || correctOptionId >= sanitizedOptions.length) {
      throw new Error(`To'g'ri javob indeksi noto'g'ri: ${correctOptionId}`);
    }

    // Kanallarda faqat anonim poll bo'lishi mumkin (Telegram cheklovi). Guruh va foydalanuvchilar uchun esa ochiq poll!
    const isChannel = chatId.startsWith('@');
    const finalIsAnonymous = isAnonymous || isChannel;

    const payload = {
      chat_id: chatId,
      question: sanitizedQuestion,
      options: sanitizedOptions,
      type: 'quiz',
      correct_option_id: correctOptionId,
      is_anonymous: finalIsAnonymous,
      protect_content: true,
      open_period: Math.min(Math.max(openPeriod, 5), 200),
      explanation: `Bu savol Excel faylining ${rowNumber}-qatorida joylashgan.`,
      explanation_parse_mode: 'HTML',
    };

    const response = await this.makeRequestWithRetry<{ poll: { id: string } }>('sendPoll', payload);
    return response.result.poll.id;
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    try {
      await this.rateLimiter.waitIfNeeded();
      const response = await fetch(`${this.baseUrl}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userId }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.description || 'Foydalanuvchi ma\'lumotlari topilmadi');
      }

      return {
        userId,
        username: data.result.username,
        firstName: data.result.first_name,
        lastName: data.result.last_name,
        startTime: new Date(),
        isActive: true,
      };
    } catch (error) {
      throw new Error(`Foydalanuvchi ${userId} ma'lumotlari olishda xato: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`);
    }
  }

  async getUpdates(
    offset?: number,
    allowedUpdates?: string[],
    timeoutSeconds: number = 1
  ): Promise<Array<{
    update_id: number;
    poll_answer?: {
      user: { id: number; first_name?: string; last_name?: string; username?: string };
      poll_id: string;
      option_ids: number[];
    };
  }>> {
    await this.rateLimiter.waitIfNeeded();
    const payload: TelegramAPIPayload = {
      timeout: timeoutSeconds,
      allowed_updates: allowedUpdates || ['poll_answer'],
    };
    if (offset) {
      payload.offset = offset;
    }
    const response = await this.makeRequestWithRetry<Array<{
      update_id: number;
      poll_answer?: {
        user: { id: number; first_name?: string; last_name?: string; username?: string };
        poll_id: string;
        option_ids: number[];
      };
    }>>('getUpdates', payload);
    return response.result;
  }

  private async makeRequestWithRetry<T>(method: string, payload: TelegramAPIPayload): Promise<TelegramAPIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/${method}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TelegramBot/1.0',
          },
          body: JSON.stringify(payload),
        });

        const data: TelegramAPIResponse<T> = await response.json();
        if (!response.ok) {
          if (response.status === 429) {
            // Handle rate limiting
            const retryAfter = data.parameters?.retry_after || Math.pow(2, attempt);
            console.warn(`Rate limit exceeded. Waiting ${retryAfter} seconds before retry.`);
            await delay(retryAfter * 1000);
            continue;
          } else if (response.status >= 500) {
            // Server errors - retry
            console.warn(`Server error (${response.status}). Retrying...`);
            await delay(Math.pow(2, attempt) * 1000);
            continue;
          }
          // Client errors - don't retry
          throw new Error(`Telegram API Error: ${data.description || `HTTP ${response.status}`}`);
        }
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Noma\'lum xato');
        console.warn(`${method} urinish ${attempt}/${this.maxRetries} muvaffaqiyatsiz:`, lastError.message);
        if (attempt < this.maxRetries) {
          await delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    throw lastError || new Error('So\'rov muvaffaqiyatsiz');
  }

  private sanitizeText(text: string): string {
    return text.replace(/<(?!\/?(b|i|u|s|a|code|pre)\b)[^>]*>/gi, '').substring(0, 4096).trim();
  }

  private sanitizePollQuestion(question: string, maxLength: number = 400): string {
    return question.substring(0, maxLength).trim();
  }

  private sanitizePollOptions(options: string[], maxLength: number = 150): string[] {
    return options
      .filter((option) => option !== null && option !== undefined)
      .map((option) => String(option).substring(0, maxLength).trim())
      .filter((option) => option.length > 0);
  }
}

// MultiUserQuizManager klassi
export class MultiUserQuizManager {
  private questions: Question[] = [];
  private sessions: Map<string, QuizSession> = new Map();
  private readonly maxSessions = 100; // Maximum number of sessions to keep
  private readonly sessionTimeout = 3600000; // 1 hour in milliseconds

  constructor(questions: Question[]) {
    this.questions = this.validateAndCleanQuestions(questions);
    // Clean up old sessions periodically
    setInterval(() => this.cleanupOldSessions(), 300000); // Every 5 minutes
  }

  private validateAndCleanQuestions(questions: Question[]): Question[] {
    return questions.filter((q) => this.isValidQuestion(q)).map((q) => this.cleanQuestion(q));
  }

  private isValidQuestion(question: Question): boolean {
    if (!question || typeof question !== 'object') return false;
    if (!question.question || typeof question.question !== 'string') return false;
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 10) return false;
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') return false;
    if (!question.options.every((opt) => typeof opt === 'string' && opt.trim().length > 0)) return false;
    if (!question.options.includes(question.correctAnswer)) return false;
    if (typeof question.rowNumber !== 'number') return false;
    return true;
  }

  private cleanQuestion(question: Question): Question {
    return {
      question: String(question.question || '').trim(),
      options: question.options
        .map((opt) => String(opt || '').trim())
        .filter((opt) => opt.length > 0),
      correctAnswer: String(question.correctAnswer || '').trim(),
      rowNumber: question.rowNumber,
    };
  }

  createSession(requestedCount: number): string {
    if (this.questions.length === 0) {
      throw new Error('Yaroqli savollar topilmadi');
    }

    // Limit the number of sessions
    if (this.sessions.size >= this.maxSessions) {
      // Remove the oldest session
      const oldestSessionId = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].startTime.getTime() - b[1].startTime.getTime())[0][0];
      this.sessions.delete(oldestSessionId);
    }

    const sessionId = crypto.randomUUID();
    const count = Math.min(requestedCount, this.questions.length);
    const selectedQuestions = shuffleArray([...this.questions]).slice(0, count);

    const session: QuizSession = {
      sessionId,
      questions: selectedQuestions,
      participants: new Map(),
      results: new Map(),
      isActive: true,
      startTime: new Date(),
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  async addParticipant(sessionId: string, userInfo: UserInfo): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Sessiya topilmadi');
    }
    if (!session.isActive) {
      throw new Error('Sessiya allaqachon tugagan');
    }
    session.participants.set(userInfo.userId, userInfo);
  }

  getSession(sessionId: string): QuizSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Guruh a'zolarining individual javoblarini saqlash
  recordUserAnswer(sessionId: string, userInfo: UserInfo, questionIndex: number, isCorrect: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.participants.has(userInfo.userId)) {
      session.participants.set(userInfo.userId, userInfo);
    }

    if (!session.results.has(userInfo.userId)) {
      const userResult: UserResult = {
        correct: 0,
        incorrect: 0,
        total: session.questions.length,
        percentage: 0,
        userInfo: { ...userInfo },
        completionTime: 0,
      };
      session.results.set(userInfo.userId, userResult);
    }

    const currentResult = session.results.get(userInfo.userId)!;
    if (isCorrect) {
      currentResult.correct += 1;
    } else {
      currentResult.incorrect += 1;
    }
    currentResult.percentage = session.questions.length > 0
      ? (currentResult.correct / session.questions.length) * 100
      : 0;
    currentResult.completionTime = Math.floor((Date.now() - userInfo.startTime.getTime()) / 1000);
  }

  setSessionResults(sessionId: string, results: Map<string, Map<number, boolean>>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const [userId, userPollResults] of results.entries()) {
      const userInfo = session.participants.get(userId);
      if (!userInfo) continue;

      const correct = Array.from(userPollResults.values()).filter((result) => result).length;
      const total = session.questions.length;
      const completionTime = Math.floor((Date.now() - userInfo.startTime.getTime()) / 1000);

      const userResult: UserResult = {
        correct,
        incorrect: total - correct,
        total,
        percentage: total > 0 ? (correct / total) * 100 : 0,
        userInfo: { ...userInfo, endTime: new Date(), isActive: true },
        completionTime,
      };
      session.results.set(userId, userResult);
    }

    this.calculateRankings(sessionId);
  }

  // Sessiyani to'liq yakunlash va reytingni chiqarish
  finalizeSession(sessionId: string): UserResult[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const totalQuestions = session.questions.length;
    for (const [, result] of session.results.entries()) {
      result.total = totalQuestions;
      result.incorrect = totalQuestions - result.correct;
      result.percentage = totalQuestions > 0 ? (result.correct / totalQuestions) * 100 : 0;
      result.userInfo.endTime = new Date();
      result.userInfo.isActive = false;
    }

    this.calculateRankings(sessionId);
    session.isActive = false;
    session.endTime = new Date();

    return this.getRankings(sessionId);
  }

  private calculateRankings(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sortedResults = Array.from(session.results.values()).sort((a: UserResult, b: UserResult) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      return a.completionTime - b.completionTime;
    });

    sortedResults.forEach((result, index) => {
      result.rank = index + 1;
      session.results.set(result.userInfo.userId, result);
    });
  }

  getRankings(sessionId: string): UserResult[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.results.values()).sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }

  getQuestionsCount(): number {
    return this.questions.length;
  }

  // Clean up old sessions
  private cleanupOldSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      // Faqat sessionTimeout (1 soat) dan oshgan sessiyalarni tozalash
      if (now - session.startTime.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        console.log(`Eski sessiya o'chirildi: ${sessionId}`);
      }
    }
  }
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const generateProgressBar = (percentage: number, totalBlocks: number = 10): string => {
  const filled = Math.min(totalBlocks, Math.max(0, Math.round((percentage / 100) * totalBlocks)));
  const empty = totalBlocks - filled;
  const fillChar = percentage >= 75 ? '🟩' : percentage >= 50 ? '🟨' : '🟥';
  return `${fillChar.repeat(filled)}${'⬜'.repeat(empty)}`;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getUserDisplayName = (userInfo: UserInfo): string => {
  if (userInfo.firstName && userInfo.lastName) return `${userInfo.firstName} ${userInfo.lastName}`;
  if (userInfo.firstName) return userInfo.firstName;
  if (userInfo.username) return `@${userInfo.username}`;
  return `User${userInfo.userId.slice(-4)}`;
};

const generateRankingMessage = (rankings: UserResult[]): string => {
  if (!rankings || rankings.length === 0) {
    return '📊 <b>Ishtirokchilar natijalari mavjud emas.</b>';
  }

  let message = `🏆 <b>TEST NATIJALARI VA YAKUNIY REYTING</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Top 3 g'oliblar uchun kengaytirilgan vizual kartochkalar
  const topThree = rankings.slice(0, 3);
  topThree.forEach((result, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
    const rankTitle = `${index + 1}-o‘rin`;
    const name = getUserDisplayName(result.userInfo);
    const progressBar = generateProgressBar(result.percentage);
    const timeStr = formatTime(result.completionTime);

    message += `${medal} <b>${rankTitle}: ${name}</b>\n`;
    message += `┣ 🎯 Natija: <b>${result.correct} / ${result.total}</b> (${result.percentage.toFixed(1)}%)\n`;
    message += `┣ ⏱ Vaqt: <b>${timeStr}</b>\n`;
    message += `┗ 📊 ${progressBar}\n\n`;
  });

  // 4-o'rindan keyingi ishtirokchilar (agar bo'lsa)
  const others = rankings.slice(3, 20);
  if (others.length > 0) {
    message += `📋 <b>Boshqa ishtirokchilar:</b>\n`;
    others.forEach((result, idx) => {
      const rankNum = idx + 4;
      const name = getUserDisplayName(result.userInfo);
      const timeStr = formatTime(result.completionTime);
      message += `${rankNum}. <b>${name}</b> — ${result.correct}/${result.total} (${result.percentage.toFixed(1)}%) | ⏱ ${timeStr}\n`;
    });
    if (rankings.length > 20) {
      message += `<i>...va yana ${rankings.length - 20} nafar ishtirokchi</i>\n`;
    }
    message += `\n`;
  }

  // Guruh bo'yicha tahliliy statistika
  const totalUsers = rankings.length;
  const avgPercentage = (rankings.reduce((sum, r) => sum + r.percentage, 0) / totalUsers).toFixed(1);
  const bestResult = rankings[0];
  const minTimeSec = Math.min(...rankings.map((r) => r.completionTime));

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 <b>Umumiy statistika:</b>\n`;
  message += `• Jami ishtirokchilar: <b>${totalUsers} kishi</b>\n`;
  message += `• O‘rtacha o‘zlashtirish: <b>${avgPercentage}%</b>\n`;
  message += `• Eng yuqori natija: <b>${bestResult.percentage.toFixed(1)}%</b> (${bestResult.correct}/${bestResult.total})\n`;
  message += `• Eng tez ishlangan vaqt: <b>${formatTime(minTimeSec)}</b>\n\n`;
  message += `🎉 <i>Barcha ishtirokchilarga rahmat! Bilimingiz ziyoda bo‘lsin!</i>\n`;
  message += `👨‍💻 @testoakbot`;

  return message.trim();
};

const shuffleWithCorrectIndex = (
  options: string[],
  correctAnswer: string
): { options: string[]; correctIndex: number } => {
  const cleanOptions = options
    .map((opt) => String(opt || '').trim())
    .filter((opt) => opt.length > 0);
  const cleanCorrectAnswer = String(correctAnswer).trim();

  if (cleanOptions.length < 2) throw new Error('Kamida 2 ta javob variantlari kerak');
  if (!cleanOptions.includes(cleanCorrectAnswer)) throw new Error('To\'g\'ri javob variantlar orasida topilmadi');

  const shuffled = shuffleArray(cleanOptions);
  const correctIndex = shuffled.indexOf(cleanCorrectAnswer);

  return { options: shuffled, correctIndex };
};

// Bitta foydalanuvchili quiz uchun funksiya
export const sendQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  requestedCount: number,
  intervalSeconds: number = 45
): Promise<TestResult> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!config.userId) throw new Error('Foydalanuvchi ID majburiy');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Quiz yuborilmoqda:', {
    userId: config.userId,
    questionCount: requestedCount,
    intervalSeconds,
  });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  const pollCollector = new PollResultsCollector(telegramAPI);
  // Use the intervalSeconds value directly without enforcing a minimum
  const safeInterval = Math.max(1, Math.min(intervalSeconds, 300));

  try {
    // Session yaratish
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Foydalanuvchini qo‘shish
    const userInfo = await telegramAPI.getUserInfo(config.userId);
    await quizManager.addParticipant(sessionId, userInfo);

    // Boshlang‘ich xabar (sozlamalar bilan)
    await telegramAPI.sendMessage(
      config.userId,
      `📝 <b>Test boshlanmoqda!</b>\n\n` +
      `🔢 Savollar soni: <b>${requestedCount}</b>\n` +
      `⏱ Har bir savol uchun vaqt: <b>${safeInterval}</b> soniya\n` +
      `📊 Jami test vaqti: <b>${Math.ceil((requestedCount * safeInterval) / 60)}</b> daqiqa\n\n` +
      `✅ Tayyor bo‘lsangiz, birinchi savol kelyapti!`
    );
    await delay(2000);

    // Savollarni yuborish - har bir savol foydalanuvchi javob bergandan keyin
    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const pollId = await telegramAPI.sendPoll(
        config.userId,
        `${i + 1}/${session.questions.length}. ${question}`,
        shuffledData.options,
        shuffledData.correctIndex,
        safeInterval,
        rowNumber
      );
      // Foydalanuvchi uchun kutish holatini o'rnatish
      pollCollector.setUserPollState(config.userId, pollId, i, shuffledData.correctIndex);

      // Har bir savol uchun foydalanuvchi javobini kutish
      await pollCollector.waitForSinglePollResult(
        [config.userId],
        safeInterval
      );
      
      // Natijalarni olish
      const results = pollCollector.getResults();
      
      // Natijalarni saqlash
      quizManager.setSessionResults(sessionId, results);
    }

    // Barcha savollar tugadi, yakuniy natijalarni olish
    // Natijalar har bir savol uchun allaqachon saqlangan

    // Natijalarni tayyorlash
    const userResult = quizManager.getRankings(sessionId)[0];
    if (!userResult) throw new Error('Natijalar topilmadi');

    const testResult: TestResult = {
      correct: userResult.correct,
      incorrect: userResult.incorrect,
      total: userResult.total,
      percentage: userResult.percentage,
    };

    // Natijalarni yuborish
    const progressBar = generateProgressBar(testResult.percentage);
    const timeStr = formatTime(userResult.completionTime || 0);
    const participantName = getUserDisplayName(userInfo);

    await telegramAPI.sendMessage(
      config.userId,
      `🏆 <b>TEST NATIJALARI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Ishtirokchi: <b>${participantName}</b>\n` +
      `✅ To‘g‘ri javoblar: <b>${testResult.correct} ta</b>\n` +
      `❌ Noto‘g‘ri javoblar: <b>${testResult.incorrect} ta</b>\n` +
      `📊 Jami savollar: <b>${testResult.total} ta</b>\n` +
      `📈 O‘zlashtirish: <b>${testResult.percentage.toFixed(1)}%</b>\n` +
      `⏱ Sarflangan vaqt: <b>${timeStr}</b>\n` +
      `📊 ${progressBar}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 <i>Test muvaffaqiyatli yakunlandi!</i>\n` +
      `👨‍💻 @testoakbot`
    );

    return testResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma‘lum xato';
    await telegramAPI.sendMessage(
      config.userId,
      `❌ <b>Xato yuz berdi:</b>

${errorMessage}

💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Quiz yuborishda xato: ${errorMessage}`);
  }
};

// Kanalga quiz yuborish uchun funksiya
export const sendChannelQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  channelId: string,
  requestedCount: number,
  intervalSeconds: number = 45
): Promise<TestResult> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!channelId) throw new Error('Kanal ID majburiy');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Kanalga quiz yuborilmoqda:', { channelId, questionCount: requestedCount, intervalSeconds });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  // Kanallarda foydalanuvchi javoblarini qayta ishlash qiyin, shu sababli oddiy xabar yuboramiz

  try {
    // Session yaratish
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Kanalga boshlang‘ich xabar (sozlamalar bilan)
    await telegramAPI.sendMessage(
      channelId,
      `📝 <b>Test boshlanmoqda!</b>\n\n` +
      `🔢 Savollar soni: <b>${requestedCount}</b>\n` +
      `⏱ Har bir savol uchun vaqt: <b>${intervalSeconds}</b> soniya\n` +
      `📊 Jami test vaqti: <b>${Math.ceil((requestedCount * intervalSeconds) / 60)}</b> daqiqa\n\n` +
      `✅ Tayyor bo‘lsangiz, birinchi savol kelyapti!`
    );
    await delay(2000);

    // Savollarni yuborish - har bir savol kanalga yuboriladi
    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      await telegramAPI.sendPoll(
        channelId,
        `${i + 1}/${session.questions.length}. ${question}`,
        shuffledData.options,
        shuffledData.correctIndex,
        intervalSeconds,
        rowNumber,
        true // Kanal uchun anonim poll
      );
      
      // Har bir savol orasida biroz vaqt kutamiz
      await delay(1000);
    }

    // Kanalga yakuniy xabar
    await telegramAPI.sendMessage(
      channelId,
      `🏆 <b>Test yakunlandi!</b>\n\n` +
        `Savollar tugadi. To'g'ri javoblarni o'zingiz tekshiring.`
    );

    // Oddiy natija qaytaramiz
    return {
      correct: 0,
      incorrect: 0,
      total: session.questions.length,
      percentage: 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma‘lum xato';
    await telegramAPI.sendMessage(
      channelId,
      `❌ <b>Xato yuz berdi:</b>

${errorMessage}

💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Kanalga quiz yuborishda xato: ${errorMessage}`);
  }
};

// Guruhga quiz yuborish uchun funksiya
export const sendGroupQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  groupId: string,
  requestedCount: number,
  intervalSeconds: number = 45
): Promise<TestResult> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!groupId) throw new Error('Guruh ID majburiy');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Guruhga quiz yuborilmoqda:', { groupId, questionCount: requestedCount, intervalSeconds });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  const pollCollector = new PollResultsCollector(telegramAPI);
  // Use the intervalSeconds value directly without enforcing a minimum
  const safeInterval = Math.max(1, Math.min(intervalSeconds, 300));

  try {
    // Session yaratish
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Guruhga boshlang‘ich xabar (sozlamalar bilan)
    await telegramAPI.sendMessage(
      groupId,
      `📝 <b>Test boshlanmoqda!</b>\n\n` +
      `🔢 Savollar soni: <b>${requestedCount}</b>\n` +
      `⏱ Har bir savol uchun vaqt: <b>${safeInterval}</b> soniya\n` +
      `📊 Jami test vaqti: <b>${Math.ceil((requestedCount * safeInterval) / 60)}</b> daqiqa\n\n` +
      `✅ Tayyor bo‘lsangiz, birinchi savol kelyapti!`
    );
    await delay(2000);

    // Savollarni yuborish
    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const pollId = await telegramAPI.sendPoll(
        groupId,
        `${i + 1}/${session.questions.length}. ${question}`,
        shuffledData.options,
        shuffledData.correctIndex,
        safeInterval,
        rowNumber,
        false // Guruhda ochiq (anonim bo'lmagan) poll
      );

      // Belgilangan vaqt davomida javoblarni yig'ish (vaqt tugashi bilan darhol keyingi savolga o'tadi)
      await pollCollector.waitForGroupPollAnswers(
        pollId,
        i,
        shuffledData.correctIndex,
        safeInterval,
        sessionId,
        quizManager
      );
    }

    // Barcha savollar tugadi, yakuniy natijalarni hisoblash
    const rankings = quizManager.finalizeSession(sessionId);

    // Natijalarni yuborish
    if (rankings.length > 0) {
      await telegramAPI.sendMessage(groupId, generateRankingMessage(rankings));
    } else {
      await telegramAPI.sendMessage(
        groupId,
        `🏁 <b>Test yakunlandi!</b>\n\n` +
        `Ushbu testda hech kim javob bermadi.\n` +
        `Keyingi testlarda faolroq qatnashing! 😊`
      );
    }

    const topResult = rankings[0];
    const testResult: TestResult = {
      correct: topResult ? topResult.correct : 0,
      incorrect: topResult ? topResult.incorrect : 0,
      total: session.questions.length,
      percentage: topResult ? topResult.percentage : 0,
    };

    return testResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma‘lum xato';
    await telegramAPI.sendMessage(
      groupId,
      `❌ <b>Xato yuz berdi:</b>

${errorMessage}

💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Guruhga quiz yuborishda xato: ${errorMessage}`);
  }
};

// Ko‘p foydalanuvchili quiz uchun funksiya
export const sendMultiUserQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  userIds: string[],
  requestedCount: number,
  intervalSeconds: number = 45
): Promise<{ sessionId: string; rankings: UserResult[] }> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) throw new Error('Foydalanuvchilar ro‘yxati bo‘sh yoki noto‘g‘ri formatda');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Multi-user quiz yuborilmoqda:', { userIds, questionCount: requestedCount, intervalSeconds });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  const pollCollector = new PollResultsCollector(telegramAPI);
  // Use the intervalSeconds value directly without enforcing a minimum
  const safeInterval = Math.max(1, Math.min(intervalSeconds, 300));

  try {
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Foydalanuvchilarni validatsiya qilish va qo‘shish
    const validUserIds: string[] = [];
    for (const userId of userIds) {
      try {
        const userInfo = await telegramAPI.getUserInfo(userId);
        await quizManager.addParticipant(sessionId, userInfo);
        validUserIds.push(userId);
      } catch (error) {
        await telegramAPI.sendMessage(
          config.userId,
          `⚠️ Foydalanuvchi ${userId} qo‘shilmadi: ${error instanceof Error ? error.message : 'Noma‘lum xato'}`
        );
      }
    }

    if (validUserIds.length === 0) throw new Error('Hech bir foydalanuvchi topilmadi');

    // Boshlang‘ich xabar (sozlamalar bilan)
    const startMessage = `
🧑‍💻 <b>Guruh test boshlanadi!</b>
👥 Ishtirokchilar: <b>${validUserIds.length}</b> kishi
📝 Savollar soni: <b>${session.questions.length}</b> ta
⏱ Har savol uchun vaqt: <b>${safeInterval}</b> soniya
📊 Jami test vaqti: <b>${Math.ceil((session.questions.length * safeInterval) / 60)}</b> daqiqa
🏆 Oxirida reytingga ko‘ra natijalar e‘lon qilinadi!
🚀 Tayyor bo‘lsangiz, birinchi savol yuboriladi...
`.trim();

    await sendMessageToAllUsers(telegramAPI, validUserIds, startMessage);
    await delay(2000);

    // Savollarni yuborish - har bir savol foydalanuvchilar javob bergandan keyin
    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const batchSize = 10; // Batch hajmini oshirish orqali samaradorlikni yaxshilash
      for (let j = 0; j < validUserIds.length; j += batchSize) {
        const batch = validUserIds.slice(j, j + batchSize);
        const pollPromises = batch.map(async (userId) => {
          try {
            const pollId = await telegramAPI.sendPoll(
              userId,
              `${i + 1}/${session.questions.length}. ${question}`,
              shuffledData.options,
              shuffledData.correctIndex,
              safeInterval,
              rowNumber
            );
            // Har bir foydalanuvchi uchun kutish holatini o'rnatish
            pollCollector.setUserPollState(userId, pollId, i, shuffledData.correctIndex);
          } catch (error) {
            console.warn(`Savol ${i + 1} foydalanuvchi ${userId}ga yuborilmadi:`, error);
          }
        });
        await Promise.allSettled(pollPromises);
        await delay(1000);
      }

      // Har bir savol uchun foydalanuvchilar javobini kutish
      await pollCollector.waitForSinglePollResult(
        validUserIds,
        safeInterval
      );
      
      // Natijalarni olish
      const results = pollCollector.getResults();
      
      // Natijalarni saqlash
      quizManager.setSessionResults(sessionId, results);
    }

    // Barcha savollar tugadi, yakuniy natijalarni olish
    // Natijalar har bir savol uchun allaqachon saqlangan

    // Reytingni yuborish
    const rankings = quizManager.getRankings(sessionId);
    await sendMessageToAllUsers(telegramAPI, validUserIds, generateRankingMessage(rankings));

    return { sessionId, rankings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma‘lum xato';
    await sendMessageToAllUsers(
      telegramAPI,
      userIds,
      `❌ <b>Xato yuz berdi:</b>

${errorMessage}

💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Multi-user quiz yuborishda xato: ${errorMessage}`);
  }
};

async function sendMessageToAllUsers(api: TelegramAPI, userIds: string[], message: string): Promise<void> {
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (userId) => {
        try {
          await api.sendMessage(userId, message);
        } catch (error) {
          console.warn(`Foydalanuvchi ${userId}ga xabar yuborilmadi:`, error);
        }
      })
    );
    await delay(1000);
  }
}
