import { UserInfo, UserResult } from '../../types';

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const shuffleWithCorrectIndex = (
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

export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const generateProgressBar = (percentage: number, totalBlocks: number = 10): string => {
  const filled = Math.min(totalBlocks, Math.max(0, Math.round((percentage / 100) * totalBlocks)));
  const empty = totalBlocks - filled;
  const fillChar = percentage >= 75 ? '🟩' : percentage >= 50 ? '🟨' : '🟥';
  return `${fillChar.repeat(filled)}${'⬜'.repeat(empty)}`;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getUserDisplayName = (userInfo: UserInfo): string => {
  if (userInfo.firstName && userInfo.lastName) return `${userInfo.firstName} ${userInfo.lastName}`;
  if (userInfo.firstName) return userInfo.firstName;
  if (userInfo.username) return `@${userInfo.username}`;
  return `User${userInfo.userId.slice(-4)}`;
};

export const generateRankingMessage = (rankings: UserResult[]): string => {
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
