import React from 'react';
import { Download } from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { TestResult, UserResult } from '../../types';
import { generateExcelReport } from '../../utils/excelParser';

ChartJS.register(ArcElement, Tooltip, Legend);

interface QuizResultsDashboardProps {
  testResult: TestResult;
  quizRankings: UserResult[];
}

export const QuizResultsDashboard: React.FC<QuizResultsDashboardProps> = ({
  testResult,
  quizRankings,
}) => {
  const handleDownloadReport = () => {
    if (quizRankings.length === 0) return;

    const blob = generateExcelReport(quizRankings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_natijalari_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-2xl animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h4 className="text-lg font-bold text-white tracking-tight">Test yakuniy natijalari</h4>
          <p className="text-xs text-slate-400">Umumiy ko'rsatkichlar va ishtirokchilar reytingi</p>
        </div>
        {quizRankings.length > 0 && (
          <button
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-200 shadow-md shadow-emerald-600/20"
          >
            <Download size={15} />
            Excel hisobotni yuklash
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
        <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 rounded-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 mb-1">To'g'ri javoblar</p>
          <p className="text-2xl font-black text-emerald-400">{testResult.correct} ta</p>
        </div>
        <div className="bg-rose-950/30 border border-rose-500/20 p-4 rounded-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300 mb-1">Noto'g'ri javoblar</p>
          <p className="text-2xl font-black text-rose-400">{testResult.incorrect} ta</p>
        </div>
        <div className="bg-blue-950/30 border border-blue-500/20 p-4 rounded-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 mb-1">Jami savollar</p>
          <p className="text-2xl font-black text-blue-400">{testResult.total} ta</p>
        </div>
        <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">O'zlashtirish</p>
          <p className="text-2xl font-black text-indigo-400">{testResult.percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Doiraviy diagramma */}
      <div className="mb-8 p-5 bg-slate-950/60 border border-slate-800 rounded-2xl max-w-sm mx-auto shadow-inner">
        <h5 className="text-slate-300 text-center text-xs font-semibold uppercase tracking-wider mb-4">Grafik taqsimot</h5>
        <div className="flex justify-center">
          <Pie
            data={{
              labels: ['To‘g‘ri javoblar', 'Noto‘g‘ri javoblar'],
              datasets: [
                {
                  data: [testResult.correct, testResult.incorrect],
                  backgroundColor: ['#10b981', '#f43f5e'],
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#cbd5e1', font: { size: 11 } },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Ishtirokchilar reyting jadvali */}
      {quizRankings.length > 0 && (
        <div>
          <h5 className="text-white text-base font-bold mb-3 tracking-tight">Ishtirokchilar reytingi (Leaderboard)</h5>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="min-w-full text-slate-200">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 text-left font-semibold">O'rin</th>
                  <th className="py-3 px-4 text-left font-semibold">Ishtirokchi</th>
                  <th className="py-3 px-4 text-left font-semibold">Natija</th>
                  <th className="py-3 px-4 text-left font-semibold">Foiz</th>
                  <th className="py-3 px-4 text-left font-semibold">Vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {quizRankings.map((ranking, index) => (
                  <tr
                    key={ranking.userInfo.userId}
                    className="hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold">
                      {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `${index + 1}`}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {ranking.userInfo.firstName && ranking.userInfo.lastName
                        ? `${ranking.userInfo.firstName} ${ranking.userInfo.lastName}`
                        : ranking.userInfo.firstName ||
                          (ranking.userInfo.username ? `@${ranking.userInfo.username}` : `User${ranking.userInfo.userId?.slice(-4)}`)}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {ranking.correct} / {ranking.total}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">{ranking.percentage.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-slate-400">{ranking.completionTime}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
