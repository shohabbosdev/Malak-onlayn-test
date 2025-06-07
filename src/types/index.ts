export interface Question {
  question: string;
  correctAnswer: string;
  options: string[];
  rowNumber: number; // Excel qator raqami
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
}

export interface QuizSettings {
  questionCount: number;
  intervalSeconds: number;
}