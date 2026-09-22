export interface Question {
  question: string;
  correctAnswer: string;
  options: string[];
  rowNumber: number;
}

export interface TelegramConfig {
  botToken: string;
  userId: string;
}

export interface TestResult {
  correct: number;
  incorrect: number;
  total: number;
  percentage: number;
  timeTaken?: number; // Umumiy sarflangan vaqt (soniyada)
  averageTimePerQuestion?: number; // Har bir savolga sarflangan o'rtacha vaqt
}

export interface QuizSettings {
  questionCount: number;
  intervalSeconds: number;
  countdownSeconds?: number;
}

// Foydalanuvchi ma'lumotlari
export interface UserInfo {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

// Foydalanuvchi test natijasi va reytingi
export interface UserResult extends TestResult {
  userInfo: UserInfo;
  completionTime: number; // sekundlarda
  rank?: number;
}

// Viktorina sessiyasi
export interface QuizSession {
  sessionId: string;
  questions: Question[];
  participants: Map<string, UserInfo>;
  results: Map<string, UserResult>;
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
}

// Telegram API so'rov parametrlari
export interface TelegramAPIPayload {
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
  limit?: number;
  message_id?: number;
}

// Telegram API javobi
export interface TelegramAPIResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  parameters?: { retry_after?: number };
}

// Foydalanuvchi poll holati
export interface UserPollState {
  expectedPollId: string;
  questionIndex: number;
  correctOptionId: number;
  isAnswered: boolean;
  createdAt: number;
}