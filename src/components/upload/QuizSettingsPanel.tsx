import React from 'react';
import { Clock, Hourglass } from 'lucide-react';
import { QuizSettings } from '../../types';

interface QuizSettingsPanelProps {
  totalAvailableQuestions: number;
  settings: QuizSettings;
  onSettingsChange: (settings: QuizSettings) => void;
}

export const QuizSettingsPanel: React.FC<QuizSettingsPanelProps> = ({
  totalAvailableQuestions,
  settings,
  onSettingsChange,
}) => {
  return (
    <div className="space-y-4 my-5 p-5 bg-slate-950/60 rounded-2xl border border-slate-800/80">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Test parametrlarini sozlash</h4>
        <span className="text-[11px] text-slate-400">Umumiy: {totalAvailableQuestions} ta savol</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Question count */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <label htmlFor="questionCount" className="block text-xs font-medium text-slate-300 mb-1.5">
            Savollar soni
          </label>
          <div className="flex items-center gap-2">
            <input
              id="questionCount"
              type="number"
              min={1}
              max={totalAvailableQuestions}
              value={settings.questionCount}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  questionCount: Math.min(
                    Math.max(1, parseInt(e.target.value) || 1),
                    totalAvailableQuestions
                  ),
                })
              }
              className="w-full bg-slate-950 text-white font-semibold px-3 py-1.5 text-sm rounded-lg border border-slate-700/80 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              aria-describedby="question-count-desc"
            />
          </div>
          <p id="question-count-desc" className="text-[10px] text-slate-400 mt-1">
            Maks: {totalAvailableQuestions} ta
          </p>
        </div>

        {/* Interval seconds */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <label htmlFor="intervalSeconds" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock size={13} className="text-blue-400" />
            Oraliq vaqti
          </label>
          <div className="flex items-center gap-2">
            <input
              id="intervalSeconds"
              type="number"
              min="1"
              max="300"
              value={settings.intervalSeconds}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  intervalSeconds: Math.min(Math.max(1, parseInt(e.target.value) || 1), 300),
                })
              }
              className="w-full bg-slate-950 text-white font-semibold px-3 py-1.5 text-sm rounded-lg border border-slate-700/80 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              aria-describedby="interval-seconds-desc"
            />
          </div>
          <p id="interval-seconds-desc" className="text-[10px] text-slate-400 mt-1">
            Savol davomiyligi (sek)
          </p>
        </div>

        {/* Countdown seconds */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <label htmlFor="countdownSeconds" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Hourglass size={13} className="text-amber-400" />
            Teskari sanoq
          </label>
          <div className="flex items-center gap-2">
            <input
              id="countdownSeconds"
              type="number"
              min="0"
              max="60"
              value={settings.countdownSeconds ?? 5}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  countdownSeconds: Math.min(Math.max(0, parseInt(e.target.value) || 0), 60),
                })
              }
              className="w-full bg-slate-950 text-white font-semibold px-3 py-1.5 text-sm rounded-lg border border-slate-700/80 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              aria-describedby="countdown-seconds-desc"
            />
          </div>
          <p id="countdown-seconds-desc" className="text-[10px] text-slate-400 mt-1">
            Tayyorgarlik vaqti (sek)
          </p>
        </div>
      </div>
    </div>
  );
};
