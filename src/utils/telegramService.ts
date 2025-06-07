import { Question, TelegramConfig, TestResult } from '../types';

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
interface UserResult extends TestResult {
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
interface PollInfo {
  pollId: string;
  questionIndex: number;
  correctOptionId: number;
  rowNumber: number; // Excel qator raqami
}

// PollResultsCollector klassi
class PollResultsCollector {
  private polls: Map<string, PollInfo> = new Map(); // pollId -> PollInfo
  private results: Map<string, Map<number, boolean>> = new Map(); // userId -> (questionIndex -> isCorrect)

  constructor(private telegramAPI: TelegramAPI) {}

  // Poll ma'lumotlarini saqlash
  addPoll(pollId: string, questionIndex: number, correctOptionId: number, rowNumber: number): void {
    this.polls.set(pollId, { pollId, questionIndex, correctOptionId, rowNumber });
  }

  // Poll natijalarini yig'ish va validatsiya qilish
  async collectPollResults(
    userIds: string[],
    pollCount: number,
    timeoutSeconds: number,
    questions: Question[]
  ): Promise<Map<string, Map<number, boolean>>> {
    console.log(`Poll natijalarini yig'ish: ${userIds.length} foydalanuvchi, ${pollCount} ta poll`);

    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let offset: number | undefined = undefined;

    // Har bir foydalanuvchi uchun bo'sh natijalar map’ini yaratish
    for (const userId of userIds) {
      this.results.set(userId, new Map());
    }

    while (Date.now() - startTime < timeoutMs) {
      try {
        const updates = await this.telegramAPI.getUpdates(offset, ['poll_answer']);
        for (const update of updates) {
          if (update.poll_answer) {
            const { user, poll_id, option_ids } = update.poll_answer;
            const userId = user.id.toString();
            const pollInfo = this.polls.get(poll_id);

            if (pollInfo && this.results.has(userId)) {
              const isCorrect = option_ids.includes(pollInfo.correctOptionId);
              this.results.get(userId)!.set(pollInfo.questionIndex, isCorrect);

              // Validatsiya: Excel’dagi to'g'ri javob bilan solishtirish
              const question = questions[pollInfo.questionIndex];
              const expectedCorrectAnswer = question.correctAnswer?.trim();
              const selectedOption = question.options[pollInfo.correctOptionId]?.trim();
              if (isCorrect && selectedOption !== expectedCorrectAnswer) {
                console.warn(
                  `Validatsiya xatosi: Foydalanuvchi ${userId}, savol ${pollInfo.questionIndex + 1} (qator ${pollInfo.rowNumber}). ` +
                  `Tanlangan javob (${selectedOption}) Excel’dagi to'g'ri javob (${expectedCorrectAnswer}) bilan mos kelmaydi.`
                );
                await this.telegramAPI.sendMessage(
                  userIds[0], // Admin foydalanuvchi
                  `⚠️ Validatsiya xatosi: Foydalanuvchi ${userId}, ${pollInfo.questionIndex + 1}-savol (qator ${pollInfo.rowNumber}).`
                );
              }
            }

            // Offset'ni yangilash
            offset = update.update_id + 1;
          }
        }

        // Agar barcha foydalanuvchilar barcha savollarga javob bergan bo'lsa, tugatish
        let allAnswered = true;
        for (const userId of userIds) {
          const userResults = this.results.get(userId)!;
          if (userResults.size < pollCount) {
            allAnswered = false;
            break;
          }
        }
        if (allAnswered) break;

        await delay(1000);
      } catch (error) {
        console.warn('getUpdates xatosi:', error);
        await delay(2000);
      }
    }

    // Javob bermagan foydalanuvchilar uchun noto'g'ri deb hisoblash
    for (const userId of userIds) {
      const userResults = this.results.get(userId)!;
      for (let i = 0; i < pollCount; i++) {
        if (!userResults.has(i)) {
          userResults.set(i, false);
        }
      }
    }

    return this.results;
  }
}

// RateLimiter klassi
class RateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number = 3) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      await delay(this.minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
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

  async sendPoll(
    chatId: string,
    question: string,
    options: string[],
    correctOptionId: number,
    openPeriod: number = 20,
    rowNumber: number
  ): Promise<string> {
    await this.rateLimiter.waitIfNeeded();

    // Uzun savolni xabar sifatida yuborish
    if (question.length > 255) {
      await this.sendMessage(
        chatId,
        `<b>Savol: ${question}</b>\n\nJavob variantlarini quyidagi poll’da tanlang.`,
        'HTML'
      );
    }

    // Savolni 255 belgigacha cheklash
    const sanitizedQuestion = this.sanitizePollQuestion(question);
    const sanitizedOptions = this.sanitizePollOptions(options);

    if (sanitizedOptions.length < 2 || sanitizedOptions.length > 10) {
      throw new Error(`Poll variantlari soni 2-10 orasida bo'lishi kerak. Hozir: ${sanitizedOptions.length}`);
    }

    if (correctOptionId < 0 || correctOptionId >= sanitizedOptions.length) {
      throw new Error(`To'g'ri javob indeksi noto'g'ri: ${correctOptionId}`);
    }

    // Uzun javoblar uchun xabar yuborish
    if (sanitizedOptions.some(opt => opt.length > 100)) {
      const optionsMessage = sanitizedOptions
        .map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`)
        .join('\n');
      await this.sendMessage(
        chatId,
        `<b>Javob variantlari:</b>\n${optionsMessage}`,
        'HTML'
      );
    }

    const payload = {
      chat_id: chatId,
      question: sanitizedQuestion,
      options: sanitizedOptions,
      type: 'quiz',
      correct_option_id: correctOptionId,
      is_anonymous: false,
      protect_content: true,
      open_period: Math.min(Math.max(openPeriod, 5), 200),
      explanation: `Bu savol Excel faylining ${rowNumber}-qatorida joylashgan.`,
      explanation_parse_mode: 'HTML',
    };

    const response = await this.makeRequestWithRetry('sendPoll', payload);
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

  async getUpdates(offset?: number, allowedUpdates?: string[]): Promise<any[]> {
    await this.rateLimiter.waitIfNeeded();
    const payload: any = {
      timeout: 30,
      allowed_updates: allowedUpdates || ['poll_answer'],
    };
    if (offset) {
      payload.offset = offset;
    }
    const response = await this.makeRequestWithRetry('getUpdates', payload);
    return response.result;
  }

  private async makeRequestWithRetry(method: string, payload: any): Promise<any> {
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

        const data = await response.json();
        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = data.parameters?.retry_after || Math.pow(2, attempt);
            await delay(retryAfter * 1000);
            continue;
          }
          throw new Error(data.description || `HTTP ${response.status}`);
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

  private sanitizePollQuestion(question: string): string {
    return question.substring(0, 255).trim();
  }

  private sanitizePollOptions(options: string[]): string[] {
    return options
      .filter((option) => option !== null && option !== undefined)
      .map((option) => String(option).substring(0, 100).trim())
      .filter((option) => option.length > 0);
  }
}

// MultiUserQuizManager klassi
export class MultiUserQuizManager {
  private questions: Question[] = [];
  private sessions: Map<string, QuizSession> = new Map();

  constructor(questions: Question[]) {
    this.questions = this.validateAndCleanQuestions(questions);
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
        userInfo: { ...userInfo, endTime: new Date(), isActive: false },
        completionTime,
      };
      session.results.set(userId, userResult);
    };

    this.calculateRankings(sessionId);
    session.isActive = false;
    session.endTime = new Date();
  }

  private calculateRankings(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sortedResults = Array.from(session.results.values()).sort((a, b) => {
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
}

// Utility functions
const shuffleArray = <T extends any[]>(arr: T): T => {
  const array = arr.slice() as T;
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const getUserDisplayName = (userInfo: UserInfo): string => {
  if (userInfo.firstName && userInfo.lastName) return `${userInfo.firstName} ${userInfo.lastName}`;
  if (userInfo.firstName) return userInfo.firstName;
  if (userInfo.username) return `@${userInfo.username}`;
  return `User${userInfo.userId.slice(-4)}`;
};

const generateRankingMessage = (rankings: UserResult[]): string => {
  let message = `
🏆 <b>TEST NATIJALARI VA REYTING</b>
📊 <b>Ishtirokchilar reytingi:</b>
`.trim();

  rankings.forEach((result, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const name = getUserDisplayName(result.userInfo);
    const completionTimeMin = Math.floor(result.completionTime / 60);
    const completionTimeSec = result.completionTime % 60;

    message += `
${emoji} <b>${name}</b>
   💯 ${result.percentage.toFixed(1)}% (${result.correct}/${result.total})
   ⏱ ${completionTimeMin}:${completionTimeSec.toString().padStart(2, '0')}
`;
  });

  const averagePercentage = rankings.length > 0 ? (rankings.reduce((sum, r) => sum + r.percentage, 0) / rankings.length).toFixed(1) : '0';
  const minCompletionTime = rankings.length > 0 ? Math.min(...rankings.map((r) => r.completionTime)) : 0;

  message += `
📈 <b>Statistika:</b>
• Eng yuqori natija: ${rankings[0]?.percentage.toFixed(1) || 0}%
• O'rtacha natija: ${averagePercentage}%
• Eng tez tugatgan: ${minCompletionTime}s
🎉 Barcha ishtirokchilarga tabriklar!
👨‍💻 @testoakbot | 📚 Bilimingizni oshirishda davom eting!
`.trim();

  return message;
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
  const safeInterval = Math.max(intervalSeconds, 15);

  try {
    // Session yaratish
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Foydalanuvchini qo‘shish
    const userInfo = await telegramAPI.getUserInfo(config.userId);
    await quizManager.addParticipant(sessionId, userInfo);

    // Boshlang‘ich xabar
    await telegramAPI.sendMessage(
      config.userId,
      `📝 <b>Test boshlanmoqda!</b>\n` +
        `🔢 Savollar soni: ${requestedCount}\n` +
        `⏱ Har bir savol uchun: ${safeInterval} soniya\n` +
        `✅ Tayyor bo‘lsangiz, birinchi savol kelyapti!`
    );
    await delay(2000);

    // Savollarni yuborish
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
      pollCollector.addPoll(pollId, i, shuffledData.correctIndex, rowNumber);

      await delay(safeInterval * 1000);
    }

    // Natijalarni yig‘ish
    const results = await pollCollector.collectPollResults(
      [config.userId],
      session.questions.length,
      safeInterval,
      session.questions
    );
    quizManager.setSessionResults(sessionId, results);

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
    await telegramAPI.sendMessage(
      config.userId,
      `🏆 <b>Test natijalari:</b>\n\n` +
        `✅ To‘g‘ri javoblar: ${testResult.correct} ta\n` +
        `❌ Noto‘g‘ri javoblar: ${testResult.incorrect} ta\n` +
        `📊 Jami: ${testResult.total} ta\n` +
        `📈 Foiz: ${testResult.percentage.toFixed(1)}%\n\n` +
        `🎉 Test yakunlandi!`
    );

    return testResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma‘lum xato';
    await telegramAPI.sendMessage(
      config.userId,
      `❌ <b>Xato yuz berdi:</b>\n\n${errorMessage}\n\n💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Quiz yuborishda xato: ${errorMessage}`);
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
  const safeInterval = Math.max(intervalSeconds, 15);

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

    // Boshlang‘ich xabar
    const startMessage = `
🧑‍💻 <b>Guruh test boshlanadi!</b>
👥 Ishtirokchilar: <b>${validUserIds.length}</b> kishi
📝 Savollar soni: <b>${session.questions.length}</b> ta
⏱ Har savol uchun vaqt: <b>${safeInterval}</b> soniya
🔄 Jami vaqt: <b>${Math.ceil((session.questions.length * safeInterval) / 60)}</b> daqiqa
🏆 Oxirida reytingga ko‘ra natijalar e‘lon qilinadi!
🚀 Tayyor bo‘lsangiz, birinchi savol yuboriladi...
`.trim();

    await sendMessageToAllUsers(telegramAPI, validUserIds, startMessage);
    await delay(2000);

    // Savollarni yuborish
    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const batchSize = 5;
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
            pollCollector.addPoll(pollId, i, shuffledData.correctIndex, rowNumber);
          } catch (error) {
            console.warn(`Savol ${i + 1} foydalanuvchi ${userId}ga yuborilmadi:`, error);
          }
        });
        await Promise.allSettled(pollPromises);
        await delay(1000);
      }

      if ((i + 1) % 5 === 0 && i < session.questions.length - 1) {
        await sendMessageToAllUsers(
          telegramAPI,
          validUserIds,
          `📊 <b>Holat:</b> ${i + 1}/${session.questions.length} savol yuborildi\n⏳ Keyingi savollar yuklanmoqda...`
        );
      }

      await delay(safeInterval * 1000);
    }

    // Natijalarni yig‘ish
    const results = await pollCollector.collectPollResults(
      validUserIds,
      session.questions.length,
      safeInterval,
      session.questions
    );
    quizManager.setSessionResults(sessionId, results);

    // Reytingni yuborish
    const rankings = quizManager.getRankings(sessionId);
    await sendMessageToAllUsers(telegramAPI, validUserIds, generateRankingMessage(rankings));

    return { sessionId, rankings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma‘lum xato';
    await sendMessageToAllUsers(
      telegramAPI,
      userIds,
      `❌ <b>Xato yuz berdi:</b>\n\n${errorMessage}\n\n💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
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