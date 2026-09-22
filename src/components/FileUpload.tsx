import { useState, forwardRef, useImperativeHandle } from 'react';
import { FileText, Send } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { Question, TelegramConfig, TestResult, QuizSettings, UserResult } from '../types';
import {
  sendQuizToTelegram,
  sendMultiUserQuizToTelegram,
  sendGroupQuizToTelegram,
} from '../utils/telegramService';
import { FileDropzone } from './upload/FileDropzone';
import { QuizSettingsPanel } from './upload/QuizSettingsPanel';
import { QuizResultsDashboard } from './upload/QuizResultsDashboard';

interface FileUploadProps {
  config: TelegramConfig;
}

export interface FileUploadRef {
  validateConfig: () => boolean;
}

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ config }, ref) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    questionCount: 5,
    intervalSeconds: 30,
    countdownSeconds: 5,
  });
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [quizRankings, setQuizRankings] = useState<UserResult[]>([]);
  const [quizProgress, setQuizProgress] = useState<{
    currentQuestion: number;
    totalQuestions: number;
    activeAnswersCount: number;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    validateConfig: () => !!(config.botToken && config.userId),
  }));

  // Ekran uxlab qolishining oldini olish (Wake Lock API - 1-kreativ g'oya)
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        return await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Brauzer qo'llab-quvvatlamasa, tinch davom etadi
    }
    return null;
  };

  // Brauzer fonga o'tganda JavaScript taymerlari sekinlashmasligi uchun (Background Keep-Alive)
  const startBackgroundKeepAlive = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.00001; // Mutlaqo eshitilmaydigan darajadagi fon signali
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        return () => {
          try {
            osc.stop();
            ctx.close();
          } catch {}
        };
      }
    } catch {}
    return () => {};
  };

  const handleFileChange = async (file: File) => {
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

      if (quizSettings.questionCount > parsedQuestions.length) {
        setQuizSettings((prev) => ({
          ...prev,
          questionCount: parsedQuestions.length,
        }));
      }
    } catch (err) {
      setError((err as Error).message || 'Excel faylini yuklashda xatolik yuz berdi');
      setFileName('');
      setQuestions([]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendToTelegram = async () => {
    if (!config.botToken || !config.userId) {
      setError('Bot token va user ID kiritilmagan');
      return;
    }

    if (questions.length === 0) {
      setError("Yuborilishi kerak bo'lgan savollar yo'q");
      return;
    }

    setIsSending(true);
    setError('');
    setSuccess('');
    setQuizProgress(null);

    let wakeLockSentinel: any = null;
    let stopKeepAlive: (() => void) | null = null;

    try {
      wakeLockSentinel = await acquireWakeLock();
      stopKeepAlive = startBackgroundKeepAlive();

      const userIds = config.userId.includes(',')
        ? config.userId.split(',').map((id: string) => id.trim()).filter((id: string) => id)
        : [config.userId];

      let result: TestResult;
      const isChannel = config.userId.startsWith('@');
      const isGroup = config.userId.startsWith('-');
      const countdown = quizSettings.countdownSeconds ?? 5;

      if (isChannel) {
        result = await sendGroupQuizToTelegram(
          questions,
          config,
          config.userId,
          quizSettings.questionCount,
          quizSettings.intervalSeconds,
          countdown
        );
        setQuizRankings([]);
      } else if (isGroup) {
        result = await sendGroupQuizToTelegram(
          questions,
          config,
          config.userId,
          quizSettings.questionCount,
          quizSettings.intervalSeconds,
          countdown,
          (progress) => setQuizProgress(progress)
        );
        setQuizRankings([]);
      } else if (userIds.length > 1) {
        const { rankings } = await sendMultiUserQuizToTelegram(
          questions,
          config,
          userIds,
          quizSettings.questionCount,
          quizSettings.intervalSeconds,
          countdown
        );
        setQuizRankings(rankings);
        const totalCorrect = rankings.reduce((sum, r) => sum + r.correct, 0);
        const totalIncorrect = rankings.reduce((sum, r) => sum + r.incorrect, 0);
        result = {
          correct: totalCorrect,
          incorrect: totalIncorrect,
          total: rankings[0]?.total || 0,
          percentage: rankings.length > 0 ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100 : 0,
        };
      } else {
        result = await sendQuizToTelegram(
          questions,
          config,
          quizSettings.questionCount,
          quizSettings.intervalSeconds,
          countdown
        );
        setQuizRankings([]);
      }

      setTestResult(result);
      setSuccess('Savollar muvaffaqiyatli yuborildi');
    } catch (err) {
      setError((err as Error).message || 'Telegram botga yuborishda xatolik yuz berdi');
    } finally {
      if (stopKeepAlive) stopKeepAlive();
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
      setIsSending(false);
      setQuizProgress(null);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 rounded-2xl shadow-xl transition-all duration-300 border border-slate-800/80 hover:border-indigo-500/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
          <FileText size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Test savollarini yuklash</h3>
          <p className="text-xs text-slate-400">Excel fayl tanlang va parametrlarni belgilang</p>
        </div>
      </div>

      {/* 1. Fayl yuklash zonasi */}
      <FileDropzone
        fileName={fileName}
        questionCount={questions.length}
        isUploading={isUploading}
        error={error}
        success={success}
        onFileChange={handleFileChange}
      />

      {/* 2. Test sozlamalari paneli */}
      {questions.length > 0 && (
        <QuizSettingsPanel
          totalAvailableQuestions={questions.length}
          settings={quizSettings}
          onSettingsChange={setQuizSettings}
        />
      )}

      {/* 2.5 Jonli Admin Monitoring paneli */}
      {isSending && quizProgress && (
        <div className="my-5 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 shadow-lg animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-white">Jonli monitoring: Guruh faolligi</span>
            </div>
            <span className="text-xs font-bold text-indigo-400">
              {quizProgress.currentQuestion} / {quizProgress.totalQuestions}-savol
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(quizProgress.currentQuestion / quizProgress.totalQuestions) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Qabul qilingan javoblar:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {quizProgress.activeAnswersCount} nafar ishtirokchi
            </span>
          </div>
        </div>
      )}

      {/* 3. Yuborish tugmasi */}
      {questions.length > 0 && (
        <button
          onClick={handleSendToTelegram}
          disabled={isSending || !config.botToken || !config.userId}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.99]"
        >
          {isSending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Test o'tkazilmoqda...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Telegram botga yuborish</span>
            </>
          )}
        </button>
      )}

      {/* 4. Natijalar paneli */}
      {testResult && (
        <QuizResultsDashboard
          testResult={testResult}
          quizRankings={quizRankings}
        />
      )}
    </div>
  );
});

export default FileUpload;