import * as XLSX from 'xlsx';
import { Question } from '../types';

export const parseExcelFile = (file: File): Promise<Question[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with headers
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        if (rawData.length === 0) {
          throw new Error('Excel faylida savollar topilmadi');
        }

        // Get the first row to check column headers
        const firstRow = rawData[0];
        const headers = Object.keys(firstRow);

        // Check for required columns
        const questionColumn = headers.find(h => h.toLowerCase().includes('savol'));
        const correctAnswerColumn = headers.find(h => h.toLowerCase().includes('tog\'ri'));
        const alternativeColumns = headers.filter(h => h.toLowerCase().includes('muqobil'));

        if (!questionColumn || !correctAnswerColumn) {
          throw new Error('Excel fayl formati noto\'g\'ri: "Savol" va "Tog\'ri javob" ustunlari topilmadi');
        }

        if (alternativeColumns.length === 0) {
          throw new Error('Excel fayl formati noto\'g\'ri: "Muqobil javob" ustunlari topilmadi');
        }

        const questions: Question[] = rawData.map((row: any, index: number) => {
          const question = row[questionColumn];
          const correctAnswer = row[correctAnswerColumn];
          
          if (!question || !correctAnswer) {
            throw new Error(`${index + 2}-qatorda savol yoki to'g'ri javob topilmadi`);
          }

          // Get alternative answers
          const alternatives = alternativeColumns
            .map(col => row[col])
            .filter(Boolean);

          if (alternatives.length === 0) {
            throw new Error(`${index + 2}-qatorda kamida bitta muqobil javob bo'lishi kerak`);
          }

          const options = [correctAnswer, ...alternatives];
          
          // Shuffle options
          const shuffledOptions = options.sort(() => Math.random() - 0.5);
          
          return {
            question,
            correctAnswer,
            options: shuffledOptions
          };
        });
        
        resolve(questions);
      } catch (error: any) {
        reject(new Error(error.message || 'Excel faylini o\'qishda xatolik yuz berdi'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Faylni o\'qib bo\'lmadi'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};