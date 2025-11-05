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
}