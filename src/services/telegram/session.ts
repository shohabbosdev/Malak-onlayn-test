import { Question, QuizSession, UserInfo, UserResult } from '../../types';
import { shuffleArray } from './formatters';

// MultiUserQuizManager klassi
export class MultiUserQuizManager {
  private questions: Question[] = [];
  private sessions: Map<string, QuizSession> = new Map();
  // sessionId -> userId -> (questionIndex -> { isCorrect, responseTimeSeconds })
  private userQuestionAnswers: Map<string, Map<string, Map<number, { isCorrect: boolean; responseTimeSeconds: number }>>> = new Map();
  private readonly maxSessions = 100;
  private readonly sessionTimeout = 3600000; // 1 soat

  constructor(questions: Question[]) {
    this.questions = this.validateAndCleanQuestions(questions);
    setInterval(() => this.cleanupOldSessions(), 300000); // Har 5 daqiqada eski sessiyalarni tozalash
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

    if (this.sessions.size >= this.maxSessions) {
      const oldestSessionId = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].startTime.getTime() - b[1].startTime.getTime())[0][0];
      this.sessions.delete(oldestSessionId);
      this.userQuestionAnswers.delete(oldestSessionId);
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
    this.userQuestionAnswers.set(sessionId, new Map());
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

  // Guruh a'zolarining individual javoblarini saqlash (Anti-Cheat va aniq reaktsiya vaqti bilan)
  recordUserAnswer(
    sessionId: string,
    userInfo: UserInfo,
    questionIndex: number,
    isCorrect: boolean,
    responseTimeSeconds: number
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return false;

    // Ishtirokchini sessiya ro'yxatiga qo'shish
    if (!session.participants.has(userInfo.userId)) {
      session.participants.set(userInfo.userId, userInfo);
    }

    if (!this.userQuestionAnswers.has(sessionId)) {
      this.userQuestionAnswers.set(sessionId, new Map());
    }
    const sessionAnswers = this.userQuestionAnswers.get(sessionId)!;

    if (!sessionAnswers.has(userInfo.userId)) {
      sessionAnswers.set(userInfo.userId, new Map());
    }
    const userAnswers = sessionAnswers.get(userInfo.userId)!;

    // ANTI-CHEAT: Bir savolga faqat birinchi berilgan javob qabul qilinadi
    if (userAnswers.has(questionIndex)) {
      return false;
    }

    const safeResponseTime = Math.max(0.1, Math.round(responseTimeSeconds * 10) / 10);
    userAnswers.set(questionIndex, {
      isCorrect,
      responseTimeSeconds: safeResponseTime,
    });

    return true;
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

  // Sessiyani to'liq yakunlash va reytingni chiqarish (barcha savollar tekshirilib, jarimalar hisoblanadi)
  finalizeSession(sessionId: string, defaultTimeoutSeconds: number = 30): UserResult[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const totalQuestions = session.questions.length;
    const sessionAnswers = this.userQuestionAnswers.get(sessionId);

    for (const [userId, participantInfo] of session.participants.entries()) {
      const userAnswers = sessionAnswers?.get(userId);
      let correct = 0;
      let totalResponseTime = 0;

      for (let qIdx = 0; qIdx < totalQuestions; qIdx++) {
        if (userAnswers && userAnswers.has(qIdx)) {
          const ans = userAnswers.get(qIdx)!;
          if (ans.isCorrect) correct += 1;
          totalResponseTime += ans.responseTimeSeconds;
        } else {
          // Javob berilmagan (o'tkazib yuborilgan) savol uchun maksimal interval jarima qilinadi
          totalResponseTime += defaultTimeoutSeconds;
        }
      }

      const incorrect = totalQuestions - correct;
      const percentage = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
      const completionTime = Math.round(totalResponseTime * 10) / 10;

      const userResult: UserResult = {
        correct,
        incorrect,
        total: totalQuestions,
        percentage,
        userInfo: {
          ...participantInfo,
          endTime: new Date(),
          isActive: false,
        },
        completionTime,
      };

      session.results.set(userId, userResult);
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
      // 1. To'g'ri javoblar soni bo'yicha kamayish tartibida
      if (b.correct !== a.correct) return b.correct - a.correct;
      // 2. Ballar teng bo'lsa, sarflangan vaqt (reaktsiya tezligi) bo'yicha o'sish tartibida (kam vaqt sarflagan birinchi)
      if (a.completionTime !== b.completionTime) return a.completionTime - b.completionTime;
      // 3. Ikkalasi ham teng bo'lsa, barqaror tartib
      return a.userInfo.userId.localeCompare(b.userInfo.userId);
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
      if (now - session.startTime.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        this.userQuestionAnswers.delete(sessionId);
        console.log(`Eski sessiya o'chirildi: ${sessionId}`);
      }
    }
  }
}
