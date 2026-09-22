import { UserInfo, UserPollState } from '../../types';
import { TelegramAPI } from './api';
import { delay } from './formatters';
import { MultiUserQuizManager } from './session';

// PollResultsCollector klassi
export class PollResultsCollector {
  private userStates: Map<string, UserPollState> = new Map(); // userId -> UserPollState
  private results: Map<string, Map<number, boolean>> = new Map(); // userId -> (questionIndex -> isCorrect)
  private readonly maxStateAge = 300000; // 5 daqiqa

  constructor(private telegramAPI: TelegramAPI) {
    setInterval(() => this.cleanupOldStates(), 60000); // Har daqiqada eski holatlarni tozalash
  }

  setUserPollState(userId: string, pollId: string, questionIndex: number, correctOptionId: number): void {
    this.userStates.set(userId, {
      expectedPollId: pollId,
      questionIndex,
      correctOptionId,
      isAnswered: false,
      createdAt: Date.now(),
    });

    if (!this.results.has(userId)) {
      this.results.set(userId, new Map());
    }
  }

  // Bitta yoki ma'lum ro'yxatdagi foydalanuvchilar javobini kutish
  async waitForSinglePollResult(
    userIds: string[],
    timeoutSeconds: number
  ): Promise<boolean> {
    const startTime = Date.now();
    const timeoutMs = Math.min(timeoutSeconds * 1000, 300000);
    let offset: number | undefined = undefined;

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
        const remainingMs = timeoutMs - (Date.now() - startTime);
        if (remainingMs <= 0) break;

        const pollTimeout = Math.min(1, Math.max(1, Math.ceil(remainingMs / 1000)));
        const updates = await this.telegramAPI.getUpdates(offset, ['poll_answer'], pollTimeout);

        for (const update of updates) {
          if (update.poll_answer) {
            const { user, poll_id, option_ids } = update.poll_answer;
            const userId = user.id.toString();
            const state = this.userStates.get(userId);

            if (state && state.expectedPollId === poll_id && !state.isAnswered) {
              const isCorrect = option_ids.includes(state.correctOptionId);
              this.results.get(userId)!.set(state.questionIndex, isCorrect);
              state.isAnswered = true;
              console.log(`Foydalanuvchi ${userId} javob berdi (${isCorrect ? 'to‘g‘ri' : 'noto‘g‘ri'})`);
            }
          }
          offset = update.update_id + 1;
        }

        if (!allUsersAnswered() && Date.now() - startTime < timeoutMs) {
          await delay(200);
        }
      } catch (error) {
        console.warn('getUpdates xatosi:', error);
        await delay(500);
      }
    }

    return allUsersAnswered();
  }

  // Guruhdagi poll uchun a'zolarning javoblarini yig'ish (Queue Draining & Real-time Progress)
  async waitForGroupPollAnswers(
    pollId: string,
    questionIndex: number,
    correctOptionId: number,
    timeoutSeconds: number,
    sessionId: string,
    quizManager: MultiUserQuizManager,
    onAnswerReceived?: (answersCount: number) => void
  ): Promise<number> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let offset: number | undefined = undefined;
    let answersCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const remainingMs = timeoutMs - (Date.now() - startTime);
        if (remainingMs <= 0) break;

        const pollTimeout = Math.min(1, Math.max(1, Math.ceil(remainingMs / 1000)));
        const updates = await this.telegramAPI.getUpdates(offset, ['poll_answer'], pollTimeout);

        for (const update of updates) {
          if (update.poll_answer) {
            const { user, poll_id, option_ids } = update.poll_answer;
            if (poll_id === pollId) {
              // Agar foydalanuvchi ovozini bekor qilgan bo'lsa (bo'sh option_ids), e'tiborga olinmaydi
              if (!option_ids || option_ids.length === 0) continue;

              const userId = user.id.toString();
              const isCorrect = option_ids.includes(correctOptionId);
              const elapsedSeconds = Math.max(0.1, (Date.now() - startTime) / 1000);
              const responseTime = Math.min(elapsedSeconds, timeoutSeconds);

              const userInfo: UserInfo = {
                userId,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                startTime: new Date(startTime),
                isActive: true,
              };

              const recorded = quizManager.recordUserAnswer(
                sessionId,
                userInfo,
                questionIndex,
                isCorrect,
                responseTime
              );

              if (recorded) {
                answersCount++;
                onAnswerReceived?.(answersCount);
                console.log(`Guruh a'zosi ${user.first_name || userId} javob berdi (${isCorrect ? 'to‘g‘ri' : 'noto‘g‘ri'}, ${responseTime.toFixed(1)}s)`);
              }
            }
          }
          offset = update.update_id + 1;
        }

        // QUEUE DRAINING: Agar yangilanishlar ko'p bo'lsa (50+), kutmasdan darhol keyingi qismni tortib oladi
        const isQueueBusy = updates.length >= 50;
        if (!isQueueBusy && Date.now() - startTime < timeoutMs) {
          await delay(200);
        }
      } catch (error) {
        console.warn('getUpdates xatosi:', error);
        await delay(500);
      }
    }

    return answersCount;
  }

  getResults(): Map<string, Map<number, boolean>> {
    return this.results;
  }

  clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

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
