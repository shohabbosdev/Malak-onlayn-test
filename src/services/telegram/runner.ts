import { Question, TelegramConfig, TestResult, UserResult } from '../../types';
import { TelegramAPI } from './api';
import { PollResultsCollector } from './collector';
import { runCountdown } from './countdown';
import { delay, formatTime, generateProgressBar, generateRankingMessage, getUserDisplayName, shuffleWithCorrectIndex } from './formatters';
import { MultiUserQuizManager } from './session';

// Bitta foydalanuvchili quiz uchun funksiya
export const sendQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  requestedCount: number,
  intervalSeconds: number = 45,
  countdownSeconds: number = 5
): Promise<TestResult> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!config.userId) throw new Error('Foydalanuvchi ID majburiy');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Quiz yuborilmoqda:', {
    userId: config.userId,
    questionCount: requestedCount,
    intervalSeconds,
    countdownSeconds,
  });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  const pollCollector = new PollResultsCollector(telegramAPI);
  const safeInterval = Math.max(1, Math.min(intervalSeconds, 300));

  try {
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    const userInfo = await telegramAPI.getUserInfo(config.userId);
    await quizManager.addParticipant(sessionId, userInfo);

    // Boshlang‘ich jonli teskari sanoq (countdown)
    await runCountdown(telegramAPI, config.userId, countdownSeconds, requestedCount, safeInterval);

    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const pollId = await telegramAPI.sendPoll(
        config.userId,
        `${i + 1}/${session.questions.length}. ${question}`,
        shuffledData.options,
        shuffledData.correctIndex,
        safeInterval,
        rowNumber,
        false
      );

      pollCollector.setUserPollState(config.userId, pollId, i, shuffledData.correctIndex);
      await pollCollector.waitForSinglePollResult([config.userId], safeInterval);

      const results = pollCollector.getResults();
      quizManager.setSessionResults(sessionId, results);
    }

    const userResult = quizManager.getRankings(sessionId)[0];
    if (!userResult) throw new Error('Natijalar topilmadi');

    const testResult: TestResult = {
      correct: userResult.correct,
      incorrect: userResult.incorrect,
      total: userResult.total,
      percentage: userResult.percentage,
    };

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
      `❌ <b>Xato yuz berdi:</b>\n\n${errorMessage}\n\n💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Quiz yuborishda xato: ${errorMessage}`);
  }
};

// Guruhga quiz yuborish uchun funksiya
export const sendGroupQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  groupId: string,
  requestedCount: number,
  intervalSeconds: number = 45,
  countdownSeconds: number = 5,
  onProgress?: (progress: { currentQuestion: number; totalQuestions: number; activeAnswersCount: number }) => void
): Promise<TestResult> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!groupId) throw new Error('Guruh ID majburiy');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Guruhga quiz yuborilmoqda:', { groupId, questionCount: requestedCount, intervalSeconds, countdownSeconds });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  const pollCollector = new PollResultsCollector(telegramAPI);
  const safeInterval = Math.max(1, Math.min(intervalSeconds, 300));

  try {
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    // Guruhga jonli teskari sanoq (countdown)
    await runCountdown(telegramAPI, groupId, countdownSeconds, requestedCount, safeInterval);

    for (let i = 0; i < session.questions.length; i++) {
      onProgress?.({
        currentQuestion: i + 1,
        totalQuestions: session.questions.length,
        activeAnswersCount: 0,
      });

      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const pollId = await telegramAPI.sendPoll(
        groupId,
        `${i + 1}/${session.questions.length}. ${question}`,
        shuffledData.options,
        shuffledData.correctIndex,
        safeInterval,
        rowNumber,
        false // Guruhda ochiq poll
      );

      await pollCollector.waitForGroupPollAnswers(
        pollId,
        i,
        shuffledData.correctIndex,
        safeInterval,
        sessionId,
        quizManager,
        (currentAnswersCount) => {
          onProgress?.({
            currentQuestion: i + 1,
            totalQuestions: session.questions.length,
            activeAnswersCount: currentAnswersCount,
          });
        }
      );
    }

    const rankings = quizManager.finalizeSession(sessionId, safeInterval);

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
      `❌ <b>Xato yuz berdi:</b>\n\n${errorMessage}\n\n💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Guruhga quiz yuborishda xato: ${errorMessage}`);
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

  try {
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

    await telegramAPI.sendMessage(
      channelId,
      `📝 <b>Test boshlanmoqda!</b>\n\n` +
      `🔢 Savollar soni: <b>${requestedCount}</b>\n` +
      `⏱ Har bir savol uchun vaqt: <b>${intervalSeconds}</b> soniya\n` +
      `📊 Jami test vaqti: <b>${Math.ceil((requestedCount * intervalSeconds) / 60)}</b> daqiqa\n\n` +
      `✅ Tayyor bo‘lsangiz, birinchi savol kelyapti!`
    );
    await delay(2000);

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
        true // Kanallar uchun anonim poll
      );

      await delay(1000);
    }

    await telegramAPI.sendMessage(
      channelId,
      `🏆 <b>Test yakunlandi!</b>\n\n` +
      `Savollar tugadi. To'g'ri javoblarni o'zingiz tekshiring.`
    );

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
      `❌ <b>Xato yuz berdi:</b>\n\n${errorMessage}\n\n💡 <i>Iltimos, qaytadan urinib ko‘ring.</i>`
    );
    throw new Error(`Kanalga quiz yuborishda xato: ${errorMessage}`);
  }
};

// Ko‘p foydalanuvchili quiz uchun funksiya
export const sendMultiUserQuizToTelegram = async (
  questions: Question[],
  config: TelegramConfig,
  userIds: string[],
  requestedCount: number,
  intervalSeconds: number = 45,
  countdownSeconds: number = 5
): Promise<{ sessionId: string; rankings: UserResult[] }> => {
  if (!config.botToken) throw new Error('Bot token majburiy');
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) throw new Error('Foydalanuvchilar ro‘yxati bo‘sh yoki noto‘g‘ri formatda');
  if (!questions || questions.length === 0) throw new Error('Savollar ro‘yxati bo‘sh');
  if (requestedCount <= 0 || requestedCount > 100) throw new Error('Savollar soni 1-100 orasida bo‘lishi kerak');

  console.log('Multi-user quiz yuborilmoqda:', { userIds, questionCount: requestedCount, intervalSeconds, countdownSeconds });

  const telegramAPI = new TelegramAPI(config.botToken);
  const quizManager = new MultiUserQuizManager(questions);
  const pollCollector = new PollResultsCollector(telegramAPI);
  const safeInterval = Math.max(1, Math.min(intervalSeconds, 300));

  try {
    const sessionId = quizManager.createSession(requestedCount);
    const session = quizManager.getSession(sessionId)!;

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

    for (let i = 0; i < session.questions.length; i++) {
      const { question, options, correctAnswer, rowNumber } = session.questions[i];
      const shuffledData = shuffleWithCorrectIndex(options, correctAnswer);

      const batchSize = 10;
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
              rowNumber,
              false
            );
            pollCollector.setUserPollState(userId, pollId, i, shuffledData.correctIndex);
          } catch (error) {
            console.warn(`Savol ${i + 1} foydalanuvchi ${userId}ga yuborilmadi:`, error);
          }
        });
        await Promise.allSettled(pollPromises);
        await delay(1000);
      }

      await pollCollector.waitForSinglePollResult(validUserIds, safeInterval);
      const results = pollCollector.getResults();
      quizManager.setSessionResults(sessionId, results);
    }

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
