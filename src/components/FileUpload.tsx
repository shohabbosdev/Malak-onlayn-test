import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, Send, Clock } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { Question, TelegramConfig, TestResult, QuizSettings } from '../types';
import { sendQuizToTelegram } from '../utils/telegramService';

interface FileUploadProps {
  config: TelegramConfig;
}

const FileUpload: React.FC<FileUploadProps> = ({ config }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    questionCount: 5,
    intervalSeconds: 30
  });
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    setIsUploading(true);
    setError('');
    setSuccess('');
    setTestResult(null);
    
    try {
      setFileName(file.name);
      const parsedQuestions = await parseExcelFile(file);
      
      if (parsedQuestions.length === 0) {
        throw new Error('Excel faylida savollar topilmadi');
      }
      
      setQuestions(parsedQuestions);
      setSuccess(`${parsedQuestions.length} ta savol muvaffaqiyatli yuklandi`);
      
      // Reset question count if it's more than available questions
      if (quizSettings.questionCount > parsedQuestions.length) {
        setQuizSettings(prev => ({
          ...prev,
          questionCount: parsedQuestions.length
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Excel faylini yuklashda xatolik yuz berdi');
      setFileName('');
      setQuestions([]);
    } finally {
      setIsUploading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleSendToTelegram = async () => {
    if (!config.botToken || !config.userId) {
      setError('Bot token va user ID kiritilmagan');
      return;
    }
    
    if (questions.length === 0) {
      setError('Yuborilishi kerak bo\'lgan savollar yo\'q');
      return;
    }
    
    setIsSending(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await sendQuizToTelegram(
        questions, 
        config, 
        quizSettings.questionCount,
        quizSettings.intervalSeconds
      );
      setTestResult(result);
      setSuccess('Savollar muvaffaqiyatli yuborildi');
    } catch (err: any) {
      setError(err.message || 'Telegram botga yuborishda xatolik yuz berdi');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="bg-[#2d2b3d] p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
        <FileText size={24} className="text-blue-400 mr-2" />
        Test savollarini yuklash
      </h3>
      
      <div className="mb-6">
        <div 
          onClick={handleFileSelect}
          className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors duration-200"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden" 
          />
          
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
          
          <h4 className="text-lg font-medium text-white mb-2">
            Excel faylini yuklang
          </h4>
          
          <p className="text-gray-400 text-sm">
            .xlsx yoki .xls formatidagi fayllar qabul qilinadi
          </p>
        </div>
      </div>
      
      {isUploading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-md mb-4 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/30 border border-green-500 text-green-200 px-4 py-3 rounded-md mb-4 flex items-start">
          <Check size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      
      {fileName && (
        <div className="mb-6">
          <div className="bg-[#3b3950] rounded-lg p-4 flex items-center">
            <FileText size={24} className="text-blue-400 mr-3" />
            <div>
              <p className="text-white font-medium">{fileName}</p>
              <p className="text-gray-400 text-sm">{questions.length} ta savol</p>
            </div>
          </div>
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="space-y-6 mb-6">
          <div>
            <label htmlFor="questionCount" className="block text-sm font-medium text-gray-300 mb-2">
              Yuborilishi kerak bo'lgan savollar soni:
            </label>
            
            <div className="flex items-center">
              <input
                id="questionCount"
                type="number"
                min={1}
                max={questions.length}
                value={quizSettings.questionCount}
                onChange={(e) => setQuizSettings(prev => ({
                  ...prev,
                  questionCount: Math.min(Math.max(1, parseInt(e.target.value) || 1), questions.length)
                }))}
                className="w-24 bg-[#3b3950] text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              <span className="ml-2 text-gray-400">/ {questions.length} ta savol</span>
            </div>
          </div>

          <div>
            <label htmlFor="intervalSeconds" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              <Clock size={16} className="mr-2" />
              Savollar orasidagi vaqt (soniya):
            </label>
            
            <div className="flex items-center">
              <input
                id="intervalSeconds"
                type="number"
                min={3}
                max={300}
                value={quizSettings.intervalSeconds}
                onChange={(e) => setQuizSettings(prev => ({
                  ...prev,
                  intervalSeconds: Math.min(Math.max(5, parseInt(e.target.value) || 30), 300)
                }))}
                className="w-24 bg-[#6a6696] text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              <span className="ml-2 text-gray-400">soniya</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Minimal: 3 soniya, Maksimal: 300 soniya
            </p>
          </div>
        </div>
      )}
      
      {questions.length > 0 && (
        <button
          onClick={handleSendToTelegram}
          disabled={isSending || !config.botToken || !config.userId}
          className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              Yuborilmoqda...
            </>
          ) : (
            <>
              <Send size={18} className="mr-2" />
              Telegram botga yuborish
            </>
          )}
        </button>
      )}
      
      {testResult && (
        <div className="mt-6 bg-[#b2afd5] rounded-lg p-4">
          <h4 className="text-lg font-medium text-white mb-3">Test natijalari</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/30 p-3 rounded-md">
              <p className="text-sm text-gray-300">To'g'ri javoblar</p>
              <p className="text-xl font-bold text-green-400">{testResult.correct} ta</p>
            </div>
            
            <div className="bg-red-900/30 p-3 rounded-md">
              <p className="text-sm text-gray-300">Noto'g'ri javoblar</p>
              <p className="text-xl font-bold text-red-400">{testResult.incorrect} ta</p>
            </div>
            
            <div className="bg-blue-900/30 p-3 rounded-md">
              <p className="text-sm text-gray-300">Jami testlar</p>
              <p className="text-xl font-bold text-blue-400">{testResult.total} ta</p>
            </div>
            
            <div className="bg-purple-900/30 p-3 rounded-md">
              <p className="text-sm text-gray-300">O'zlashtirish ko'rsatkichi</p>
              <p className="text-xl font-bold text-purple-400">{testResult.percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;