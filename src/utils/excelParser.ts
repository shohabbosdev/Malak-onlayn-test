import * as XLSX from 'xlsx';
import { Question } from '../types';

// Fisher-Yates shuffle algoritmi
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Ustun nomlarini moslashuvchan qidiruv
const findColumn = (headers: string[], keywords: string[]): string | undefined => {
  if (!headers || headers.length === 0) return undefined;
  const normalizedHeaders = headers.map((h) =>
    (h || '').toLowerCase().trim().replace(/[\s._-]/g, '')
  );
  return headers.find((header, index) =>
    keywords.some((keyword) =>
      normalizedHeaders[index].includes(keyword.toLowerCase().replace(/[\s._-]/g, ''))
    )
  );
};

// Xatolarni yig‘ish uchun interfeys
interface ParseError {
  row: number;
  message: string;
  details?: string;
}

export const parseExcelFile = async (file: File): Promise<Question[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // JSON formatiga o'tkazish
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Ustun nomlarini olish
    const headers = jsonData[0] as string[];
    const questions: Question[] = [];
    const errors: ParseError[] = [];

    // Ustun indekslarini aniqlash
    const questionIndex = headers.findIndex((h) => h && h.toLowerCase().includes('savol'));
    const correctAnswerIndex = headers.findIndex((h) => h && h.toLowerCase().includes('to‘g‘ri javob'));
    const optionIndices = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter((h) => h.header && h.header.toLowerCase().includes('muqobil javob'))
      .map((h) => h.index);

    if (questionIndex === -1 || correctAnswerIndex === -1 || optionIndices.length === 0) {
      throw new Error('Excel faylida kerakli ustunlar topilmadi: "Savol", "To‘g‘ri javob", "Muqobil javob"');
    }

    // Ma'lumotlarni qayta ishlash
    for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      if (!row || row.length === 0) {
        // Bo'sh qatorlarni o'tkazib yuborish
        continue;
      }

      let questionText = String(row[questionIndex] || '').trim();
      let correctAnswer = String(row[correctAnswerIndex] || '').trim();

      // Validatsiya: Savol va to‘g‘ri javob bo‘sh bo‘lmasligi kerak
      if (!questionText) {
        errors.push({ row: rowIndex + 1, message: 'Savol bo‘sh', details: `Qiymat: "${questionText}"` });
        continue;
      }
      if (!correctAnswer) {
        errors.push({ row: rowIndex + 1, message: 'To‘g‘ri javob bo‘sh', details: `Qiymat: "${correctAnswer}"` });
        continue;
      }

      // Muqobil javoblar
      const options = new Set<string>();
      for (const optionIndex of optionIndices) {
        const optionValue = String(row[optionIndex] || '').trim();
        if (optionValue.length > 0) {
          options.add(optionValue);
        }
      }

      // To‘g‘ri javobni qo‘shish
      options.add(correctAnswer);

      let optionArray = Array.from(options);

      // Takrorlangan javoblar tufayli kam variantli test
      if (optionArray.length < 2) {
        errors.push({
          row: rowIndex + 1,
          message: 'Javob variantlari 2 tadan kam, faqat to‘g‘ri javob ishlatiladi',
          details: `Javoblar: ${optionArray.join(', ')}`,
        });
        optionArray = [correctAnswer, 'Noto‘g‘ri javob']; // Minimal 2 variant
      } else if (optionArray.length < 4) {
        errors.push({
          row: rowIndex + 1,
          message: `Kam variantli test (${optionArray.length} ta variant)`,
          details: `Javoblar: ${optionArray.join(', ')}`,
        });
      }

      const question: Question = {
        question: questionText,
        correctAnswer: correctAnswer,
        options: optionArray,
        rowNumber: rowIndex + 1,
      };

      questions.push(question);
    }

    // Xatolarni konsolga chiqarish
    if (errors.length > 0) {
      console.warn('Excel faylida xatolar topildi:');
      errors.forEach((err) => {
        console.warn(`Qator ${err.row}: ${err.message}${err.details ? ` (${err.details})` : ''}`);
      });
      console.warn(`Jami xatolar soni: ${errors.length}`);
    }

    if (questions.length === 0) {
      throw new Error('Excel faylida yaroqli savollar topilmadi');
    }

    console.log('Yuklangan savollar:', questions);
    return questions;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Excel faylini o‘qishda xato';
    console.error('Excel parser xatosi:', errorMessage);
    throw new Error(errorMessage);
  }
};

// Utility function to generate Excel report from quiz results
export const generateExcelReport = (rankings: any[], quizTitle: string = 'Test Natijalari'): Blob => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Prepare data for export
  const data = rankings.map((result, index) => ({
    'O\'rin': index + 1,
    'Foydalanuvchi': result.userInfo?.firstName && result.userInfo?.lastName 
      ? `${result.userInfo.firstName} ${result.userInfo.lastName}` 
      : result.userInfo?.username 
        ? `@${result.userInfo.username}` 
        : `User${result.userInfo?.userId?.slice(-4)}`,
    'To\'g\'ri javoblar': result.correct,
    'Noto\'g\'ri javoblar': result.incorrect,
    'Jami savollar': result.total,
    'Foiz': `${result.percentage.toFixed(1)}%`,
    'Vaqt (soniya)': result.completionTime,
    'Telegram ID': result.userInfo?.userId || 'Noma\'lum'
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Natijalar');
  
  // Generate buffer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Return as Blob
  return new Blob([wbout], { type: 'application/octet-stream' });
};