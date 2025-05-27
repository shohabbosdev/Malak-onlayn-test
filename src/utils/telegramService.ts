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

// Rate limiting va retry mexanizmi uchun klass
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
      const waitTime = this.minInterval - timeSinceLastRequest;
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Telegram API bilan ishlash uchun klass
class TelegramAPI {
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;
  private readonly maxRetries: number = 3;
  
  constructor(private readonly token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.rateLimiter = new RateLimiter(3);
  }

  async sendMessage(
    chatId: string, 
    text: string, 
    parseMode: string = 'HTML'
  ): Promise<void> {
    await this.rateLimiter.waitIfNeeded();
    
    const payload = {
      chat_id: chatId,
      text: this.sanitizeText(text),
      parse_mode: parseMode,
      disable_web_page_preview: true
    };

    await this.makeRequestWithRetry('sendMessage', payload);
  }

  async sendPoll(
    chatId: string,
    question: string,
    options: string[],
    correctOptionIndex: number,
    openPeriod: number = 20
  ): Promise<void> {
    await this.rateLimiter.waitIfNeeded();

    const sanitizedQuestion = this.sanitizePollQuestion(question);
    const sanitizedOptions = this.sanitizePollOptions(options);
    
    if (sanitizedOptions.length < 2 || sanitizedOptions.length > 10) {
      throw new Error(`Poll variantlari soni 2-10 orasida bo'lishi kerak. Hozir: ${sanitizedOptions.length}`);
    }

    if (correctOptionIndex < 0 || correctOptionIndex >= sanitizedOptions.length) {
      throw new Error(`To'g'ri javob indeksi noto'g'ri: ${correctOptionIndex}`);
    }

    const payload = {
      chat_id: chatId,
      question: sanitizedQuestion,
      options: sanitizedOptions,
      type: 'quiz',
      correct_option_id: correctOptionIndex,
      is_anonymous: false,
      protect_content: true,
      open_period: Math.min(Math.max(openPeriod, 5), 200),
      explanation_parse_mode: 'HTML'
    };

    await this.makeRequestWithRetry('sendPoll', payload);
  }

  // Foydalanuvchi ma'lumotlarini olish
  async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      await this.rateLimiter.waitIfNeeded();
      
      const response = await fetch(`${this.baseUrl}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userId }),
      });

      const data = await response.json();
      
      if (data.ok && data.result) {
        return {
          userId: userId,
          username: data.result.username,
          firstName: data.result.first_name,
          lastName: data.result.last_name,
          startTime: new Date(),
          isActive: true
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`Foydalanuvchi ${userId} ma'lumotlarini olishda xato:`, error);
      return {
        userId: userId,
        startTime: new Date(),
        isActive: true
      };
    }
  }

  private async makeRequestWithRetry(method: string, payload: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/${method}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'TelegramBot/1.0'
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.description || `HTTP ${response.status}`;
          throw new Error(`Telegram API xatosi: ${errorMsg}`);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Noma\'lum xato');
        
        console.warn(`${method} urinish ${attempt}/${this.maxRetries} muvaffaqiyatsiz:`, lastError.message);
        
        if (attempt < this.maxRetries) {
          const backoffTime = Math.pow(2, attempt) * 1000;
          await this.delay(backoffTime);
        }
      }
    }

    throw lastError;
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/<(?!\/?(b|i|u|s|a|code|pre)\b)[^>]*>/gi, '')
      .substring(0, 4096)
      .trim();
  }

  private sanitizePollQuestion(question: string): string {
    return question
      .replace(/[<>&]/g, '')
      .substring(0, 150)
      .trim();
  }

  private sanitizePollOptions(options: string[]): string[] {
    if (!Array.isArray(options)) {
      return [];
    }

    return options
      .filter(option => option !== null && option !== undefined)
      .map(option => String(option))
      .filter(option => option.trim().length > 0)
      .map(option => option
        .replace(/[<>&]/g, '')
        .substring(0, 100)
        .trim()
      )
      .filter(option => option.length > 0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Poll natijalarini yig'ish uchun klass
class PollResultsCollector {
  private results: Map<string, Map<number, boolean>> = new Map(); // userId -> (pollIndex -> isCorrect)
  
  async collectPollResults(
    api: TelegramAPI, 
    userIds: string[], 
    pollCount: number,
    timeoutSeconds: number,
  ): Promise<Map<string, Map<number, boolean>>> {
    console.log(`Poll natijalarini yig'ish: ${userIds.length} foydalanuvchi, ${pollCount} ta poll`);
    
    // VAQTINCHA: Random natijalar
    const allResults = new Map<string, Map<number, boolean>>();
    
    for (const userId of userIds) {
      const userResults = new Map<number, boolean>();
      for (let i = 0; i < pollCount; i++) {
        // Random natija (70-95% orasida to'g'ri javoblar)
        const correctProbability = 0.7 + Math.random() * 0.25;
        userResults.set(i, Math.random() < correctProbability);
      }
      allResults.set(userId, userResults);
    }
    
    return allResults;
  }
}

// Multi-user quiz manager
export class MultiUserQuizManager {
  private questions: Question[] = [];
  private sessions: Map<string, QuizSession> = new Map();
  
  constructor(questions: Question[]) {
    this.questions = this.validateAndCleanQuestions(questions);
  }

  private validateAndCleanQuestions(questions: Question[]): Question[] {
    return questions
      .filter(q => this.isValidQuestion(q))
      .map(q => this.cleanQuestion(q));
  }

  private isValidQuestion(question: Question): boolean {
    if (!question || typeof question !== 'object') return false;
    if (!question.question || typeof question.question !== 'string') return false;
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 10) return false;
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') return false;
    
    const validOptions = question.options.every(opt => 
      opt !== null && opt !== undefined && typeof opt === 'string'
    );
    
    if (!validOptions) return false;
    if (!question.options.includes(question.correctAnswer)) return false;
    
    return true;
  }

  private cleanQuestion(question: Question): Question {
    return {
      ...question,
      question: String(question.question || '').trim(),
      options: (question.options || [])
        .map(opt => String(opt || '').trim())
        .filter(opt => opt.length > 0),
      correctAnswer: String(question.correctAnswer || '').trim()
    };
  }

  // Yangi sessiya yaratish
  createSession(requestedCount: number): string {
    if (this.questions.length === 0) {
      throw new Error('Yaroqli savollar topilmadi');
    }

    const sessionId = this.generateSessionId();
    const count = Math.min(requestedCount, this.questions.length);
    const selectedQuestions = this.shuffleArray([...this.questions]).slice(0, count);

    const session: QuizSession = {
      sessionId,
      questions: selectedQuestions,
      participants: new Map(),
      results: new Map(),
      isActive: true,
      startTime: new Date()
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  // Foydalanuvchini sessiyaga qo'shish
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

  // Sessiya ma'lumotlarini olish
  getSession(sessionId: string): QuizSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Sessiya natijalarini o'rnatish
  setSessionResults(sessionId: string, results: Map<string, Map<number, boolean>>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const [userId, userPollResults] of results.entries()) {
      const userInfo = session.participants.get(userId);
      if (!userInfo) continue;

      const correct = Array.from(userPollResults.values()).filter(result => result).length;
      const total = session.questions.length;
      const completionTime = Math.floor((Date.now() - userInfo.startTime.getTime()) / 1000);

      const userResult: UserResult = {
        correct,
        incorrect: total - correct,
        total,
        percentage: total > 0 ? (correct / total) * 100 : 0,
        userInfo: {
          ...userInfo,
          endTime: new Date(),
          isActive: false
        },
        completionTime
      };

      session.results.set(userId, userResult);
    }

    // Reytingni hisoblash
    this.calculateRankings(sessionId);
    
    // Sessiyani tugatish
    session.isActive = false;
    session.endTime = new Date();
  }

  // Reytingni hisoblash
  private calculateRankings(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sortedResults = Array.from(session.results.values()).sort((a, b) => {
      // Avval to'g'ri javoblar soni bo'yicha
      if (b.correct !== a.correct) {
        return b.correct - a.correct;
      }
      // Keyin vaqt bo'yicha (tezroq bo'lgan yaxshi)
      return a.completionTime - b.completionTime;
    });

    // Ranglarni o'rnatish
    sortedResults.forEach((result, index) => {
      result.rank = index + 1;
      session.results.set(result.userInfo.userId, result);
    });
  }

  // Reytingni olish
  getRankings(sessionId: string): UserResult[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.results.values()).sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getQuestionsCount(): number {
    return this.questions.length;
  }
}

// Asosiy funksiya - bir nechta foydalanuvchi uchun
export const sendMultiUserQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  userIds: string[], // Foydalanuvchilar ro'yxati
  requestedCount: number,
  intervalSeconds: number = 45
): Promise<{ sessionId: string; rankings: UserResult[] }> => {
  // Validatsiya
  if (!config.botToken) {
    throw new Error('Bot token majburiy');
  }

  if (!userIds || userIds.length === 0) {
    throw new Error('Foydalanuvchilar ro\'yxati bo\'sh');
  }

  if (!questions || questions.length === 0) {
    throw new Error('Savollar ro\'yxati bo\'sh yoki mavjud emas');
  }

  if (requestedCount <= 0 || requestedCount > 100) {
    throw new Error('Savollar soni 1-100 orasida bo\'lishi kerak');
  }

  const safeInterval = Math.max(intervalSeconds, 15);
  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  
  try {
    // Sessiya yaratish
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Foydalanuvchilar ma'lumotlarini olish va sessiyaga qo'shish
    const validUserIds: string[] = [];
    for (const userId of userIds) {
      try {
        const userInfo = await telegramAPI.getUserInfo(userId);
        if (userInfo) {
          await quizManager.addParticipant(sessionId, userInfo);
          validUserIds.push(userId);
        }
      } catch (error) {
        console.warn(`Foydalanuvchi ${userId} qo'shilmadi:`, error);
      }
    }

    if (validUserIds.length === 0) {
      throw new Error('Hech bir foydalanuvchi topilmadi');
    }

    // Hamma foydalanuvchilarga boshlang'ich xabar yuborish
    const startMessage = `
🧑‍💻 <b>Guruh test boshlanadi!</b>

👥 Ishtirokchilar: <b>${validUserIds.length}</b> kishi
📝 Savollar soni: <b>${session.questions.length}</b> ta
⏱ Har savol uchun vaqt: <b>${safeInterval}</b> soniya
🔄 Jami vaqt: <b>${Math.ceil((session.questions.length * safeInterval) / 60)}</b> daqiqa

🏆 Oxirida reytingga ko'ra natijalar e'lon qilinadi!

🚀 Tayyor bo'lsangiz, birinchi savol yuboriladi...
    `.trim();

    await sendMessageToAllUsers(telegramAPI, validUserIds, startMessage);
    await delay(2000);

    // Savollarni hamma foydalanuvchilarga yuborish
    await sendQuestionsToAllUsers(
      telegramAPI,
      validUserIds,
      session.questions,
      safeInterval
    );

    // Poll natijalarini yig'ish
    const pollCollector = new PollResultsCollector();
    const allResults = await pollCollector.collectPollResults(
      telegramAPI,
      validUserIds,
      session.questions.length,
      safeInterval
    );

    // Natijalarni saqlash
    quizManager.setSessionResults(sessionId, allResults);

    // Oxirgi poll tugashini kutish
    await delay(safeInterval * 1000);

    // Reytingni olish va yuborish
    const rankings = quizManager.getRankings(sessionId);
    await sendRankingsToAllUsers(telegramAPI, validUserIds, rankings);

    return { sessionId, rankings };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Noma\'lum xato yuz berdi';
    
    // Hamma foydalanuvchilarga xato haqida xabar yuborish
    try {
      await sendMessageToAllUsers(
        telegramAPI,
        userIds,
        `❌ <b>Xato yuz berdi:</b>\n\n${errorMessage}\n\n💡 <i>Iltimos, qaytadan urinib ko'ring.</i>`
      );
    } catch (sendError) {
      console.error('Xato xabarini yuborishda muammo:', sendError);
    }
    
    throw new Error(`Multi-user quiz yuborishda xato: ${errorMessage}`);
  }
};

// Hamma foydalanuvchilarga xabar yuborish
async function sendMessageToAllUsers(
  api: TelegramAPI,
  userIds: string[],
  message: string
): Promise<void> {
  const promises = userIds.map(async (userId) => {
    try {
      await api.sendMessage(userId, message);
    } catch (error) {
      console.warn(`Foydalanuvchi ${userId}ga xabar yuborilmadi:`, error);
    }
  });

  await Promise.allSettled(promises);
}

// Hamma foydalanuvchilarga savollarni yuborish
async function sendQuestionsToAllUsers(
  api: TelegramAPI,
  userIds: string[],
  questions: Question[],
  intervalSeconds: number
): Promise<void> {
  for (let i = 0; i < questions.length; i++) {
    const { question, options, correctAnswer } = questions[i];
    const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

    // Hamma foydalanuvchilarga bir vaqtda yuborish
    const promises = userIds.map(async (userId) => {
      try {
        await api.sendPoll(
          userId,
          `${i + 1}/${questions.length}. ${question}`,
          shuffledData.options,
          shuffledData.correctIndex,
          intervalSeconds
        );
      } catch (error) {
        console.warn(`Savol ${i + 1} foydalanuvchi ${userId}ga yuborilmadi:`, error);
      }
    });

    await Promise.allSettled(promises);

    // Progress xabari
    if ((i + 1) % 5 === 0 && i < questions.length - 1) {
      await sendMessageToAllUsers(
        api,
        userIds,
        `📊 <b>Holat:</b> ${i + 1}/${questions.length} savol yuborildi\n⏳ Keyingi savollar yuklanmoqda...`
      );
    }

    // Keyingi savoldan oldin kutish
    await delay(intervalSeconds * 1000);
  }
}

// Reytingni hamma foydalanuvchilarga yuborish
async function sendRankingsToAllUsers(
  api: TelegramAPI,
  userIds: string[],
  rankings: UserResult[]
): Promise<void> {
  const rankingMessage = generateRankingMessage(rankings);
  await sendMessageToAllUsers(api, userIds, rankingMessage);
}

// Reytingi xabarini yaratish
function generateRankingMessage(rankings: UserResult[]): string {
  let message = `
🏆 <b>TEST NATIJALARI VA REYTINGI</b>

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

  message += `
📈 <b>Statistika:</b>
• Eng yuqori natija: ${rankings[0]?.percentage.toFixed(1)}%
• O'rtacha natija: ${(rankings.reduce((sum, r) => sum + r.percentage, 0) / rankings.length).toFixed(1)}%
• Eng tez tugatgan: ${Math.min(...rankings.map(r => r.completionTime))}s

🎉 Barcha ishtirokchilarga tabriklar!
👨‍💻 @testoakbot | 📚 Bilimingizni oshirishda davom eting!
  `.trim();

  return message;
}

// Foydalanuvchi nomini olish
function getUserDisplayName(userInfo: UserInfo): string {
  if (userInfo.firstName && userInfo.lastName) {
    return `${userInfo.firstName} ${userInfo.lastName}`;
  } else if (userInfo.firstName) {
    return userInfo.firstName;
  } else if (userInfo.username) {
    return `@${userInfo.username}`;
  } else {
    return `User${userInfo.userId.slice(-4)}`;
  }
}

// Javob variantlarini aralashtirib, to'g'ri javob indeksini qaytarish
function shuffleWithCorrectIndex(
  options: string[], 
  correctAnswer: string
): { options: string[]; correctIndex: number } {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('Javob variantlari mavjud emas');
  }

  if (!correctAnswer || typeof correctAnswer !== 'string') {
    throw new Error('To\'g\'ri javob ko\'rsatilmagan');
  }

  const cleanOptions = options
    .map(opt => String(opt || '').trim())
    .filter(opt => opt.length > 0);

  const cleanCorrectAnswer = String(correctAnswer).trim();

  if (cleanOptions.length === 0) {
    throw new Error('Yaroqli javob variantlari topilmadi');
  }

  if (!cleanOptions.includes(cleanCorrectAnswer)) {
    throw new Error('To\'g\'ri javob variantlar orasida topilmadi');
  }

  const shuffled = [...cleanOptions];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  const correctIndex = shuffled.indexOf(cleanCorrectAnswer);
  
  return { options: shuffled, correctIndex };
}

// Utility funksiya
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Bitta foydalanuvchi uchun asl funksiya (backward compatibility)
export const sendQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  requestedCount: number,
  intervalSeconds: number = 45
): Promise<TestResult> => {
  const result = await sendMultiUserQuizToTelegram(
    questions,
    config,
    [config.userId],
    requestedCount,
    intervalSeconds
  );
  
  const userResult = result.rankings[0];
  if (!userResult) {
    throw new Error('Foydalanuvchi natijasi topilmadi');
  }

  return {
    correct: userResult.correct,
    incorrect: userResult.incorrect,
    total: userResult.total,
    percentage: userResult.percentage
  };
};