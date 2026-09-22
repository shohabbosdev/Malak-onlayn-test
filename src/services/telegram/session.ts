import { Question, QuizSession, UserInfo, UserResult } from '../../types';
import { shuffleArray } from './formatters';

// MultiUserQuizManager klassi
export class MultiUserQuizManager {
  private questions: Question[] = [];
  private sessions: Map<string, QuizSession> = new Map();
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
      if (now - session.startTime.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        console.log(`Eski sessiya o'chirildi: ${sessionId}`);
      }
    }
  }
}
