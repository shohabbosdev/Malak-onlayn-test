import { TelegramAPIPayload, TelegramAPIResponse, UserInfo } from '../../types';
import { delay, escapeHtml } from './formatters';

// RateLimiter klassi: Telegram API cheklovlaridan oshib ketmaslik uchun
export class RateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly windowSize = 60000; // 1 minutlik oyna
  private readonly maxRequestsPerWindow = 1500; // 1 minutda maksimal 1500 so'rov

  constructor(requestsPerSecond: number = 3) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    if (now - this.windowStart > this.windowSize) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.maxRequestsPerWindow) {
      const timeToWait = this.windowSize - (now - this.windowStart);
      if (timeToWait > 0) {
        console.warn(`Rate limit exceeded. Waiting ${timeToWait}ms`);
        await delay(timeToWait);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }

    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await delay(this.minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}

// TelegramAPI klassi
export class TelegramAPI {
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;
  private readonly maxRetries: number = 3;

  constructor(private readonly token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.rateLimiter = new RateLimiter();
  }

  async sendMessage(chatId: string, text: string, parseMode: string = 'HTML'): Promise<{ message_id: number }> {
    await this.rateLimiter.waitIfNeeded();
    const payload: TelegramAPIPayload = {
      chat_id: chatId,
      text: this.sanitizeText(text),
      parse_mode: parseMode,
      disable_web_page_preview: true,
    };
    const response = await this.makeRequestWithRetry<{ message_id: number }>('sendMessage', payload);
    return response.result;
  }

  async editMessageText(chatId: string, messageId: number, text: string, parseMode: string = 'HTML'): Promise<void> {
    await this.rateLimiter.waitIfNeeded();
    const payload: TelegramAPIPayload = {
      chat_id: chatId,
      message_id: messageId,
      text: this.sanitizeText(text),
      parse_mode: parseMode,
      disable_web_page_preview: true,
    };
    await this.makeRequestWithRetry('editMessageText', payload);
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
    const isLongQuestion = question.length > 280;
    const hasLongOptions = options.some((opt) => String(opt || '').trim().length > 90);

    // 2. Agar savol yoki variantlar uzun bo'lsa, to'liq matnni xabar qilib yuborish
    if (isLongQuestion || hasLongOptions) {
      let fullMessage = `📋 <b>Savol va variantlar:</b>\n\n<b>Savol:</b>\n${escapeHtml(question)}\n\n<b>Javob variantlari:</b>\n`;

      options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        fullMessage += `<b>${letter})</b> ${escapeHtml(opt)}\n\n`;
      });

      fullMessage += `<i>Javobingizni quyidagi so‘rovnomada tanlang 👇</i>`;

      if (fullMessage.length > 4000) {
        await this.sendMessage(chatId, `📝 <b>Savol:</b>\n${escapeHtml(question)}`, 'HTML');
        let optionsMsg = `<b>Javob variantlari:</b>\n\n`;
        options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          optionsMsg += `<b>${letter})</b> ${escapeHtml(opt)}\n\n`;
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
      limit: 100,
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
            const retryAfter = data.parameters?.retry_after || Math.pow(2, attempt);
            console.warn(`Rate limit exceeded. Waiting ${retryAfter} seconds before retry.`);
            await delay(retryAfter * 1000);
            continue;
          } else if (response.status >= 500) {
            console.warn(`Server error (${response.status}). Retrying...`);
            await delay(Math.pow(2, attempt) * 1000);
            continue;
          }
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
}
