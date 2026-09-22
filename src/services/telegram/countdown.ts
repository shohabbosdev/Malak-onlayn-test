import { TelegramAPI } from './api';
import { delay } from './formatters';

export const runCountdown = async (
  api: TelegramAPI,
  chatId: string,
  countdownSeconds: number = 5,
  questionCount: number,
  intervalSeconds: number
): Promise<void> => {
  if (countdownSeconds <= 0) {
    await api.sendMessage(
      chatId,
      `📝 <b>Test boshlanmoqda!</b>\n\n` +
      `🔢 Savollar soni: <b>${questionCount} ta</b>\n` +
      `⏱ Har bir savolga: <b>${intervalSeconds} soniya</b>\n\n` +
      `🚀 <b>Boshladik! 1-savol kelmoqda...</b>`
    );
    await delay(1000);
    return;
  }

  const initialText = 
    `📢 <b>DIQQAT, TESTGA TAYYORLANING!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 Savollar soni: <b>${questionCount} ta</b>\n` +
    `⏱ Har bir savolga: <b>${intervalSeconds} soniya</b>\n` +
    `📊 Jami test vaqti: <b>${Math.ceil((questionCount * intervalSeconds) / 60)} daqiqa</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⏳ Test boshlanishiga: <b>${countdownSeconds} soniya...</b>`;

  let messageId: number | undefined;
  try {
    const res = await api.sendMessage(chatId, initialText);
    messageId = res?.message_id;
  } catch (err) {
    console.warn('Boshlang‘ich xabar yuborishda xato:', err);
  }

  for (let s = countdownSeconds - 1; s >= 1; s--) {
    await delay(1000);
    if (messageId) {
      try {
        const updateText = 
          `📢 <b>DIQQAT, TESTGA TAYYORLANING!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🔢 Savollar soni: <b>${questionCount} ta</b>\n` +
          `⏱ Har bir savolga: <b>${intervalSeconds} soniya</b>\n` +
          `📊 Jami test vaqti: <b>${Math.ceil((questionCount * intervalSeconds) / 60)} daqiqa</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏳ Test boshlanishiga: <b>${s} soniya...</b>`;
        await api.editMessageText(chatId, messageId, updateText);
      } catch {
        // Edit xatosi bo'lsa ham taymer to'xtamasin
      }
    }
  }

  await delay(1000);
  if (messageId) {
    try {
      const finalText = 
        `📢 <b>DIQQAT, TEST BOSHLANDI!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔢 Savollar soni: <b>${questionCount} ta</b>\n` +
        `⏱ Har bir savolga: <b>${intervalSeconds} soniya</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🚀 <b>Boshladik! 1-savol kelmoqda...</b>`;
      await api.editMessageText(chatId, messageId, finalText);
    } catch {
      // ignore
    }
  }
  await delay(1000);
};
