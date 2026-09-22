import React from 'react';
import { FileSpreadsheet, HelpCircle } from 'lucide-react';

const ExcelExample: React.FC = () => {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all duration-300 border border-slate-800/80 hover:border-emerald-500/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <FileSpreadsheet size={22} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Excel fayl namunasi</h3>
          <p className="text-xs text-slate-400">Jadval ustunlari tartibi va tuzilishi</p>
        </div>
        <div className="ml-auto group relative">
          <HelpCircle size={18} className="text-slate-400 hover:text-slate-200 cursor-pointer" />
          <div className="absolute z-20 invisible group-hover:visible bg-slate-800 text-slate-200 text-xs rounded-xl p-3 w-64 bottom-full right-0 mb-2 border border-slate-700 shadow-2xl">
            Excel faylida kamida 1-savol, 1-to'g'ri javob va 1-muqobil javob bo'lishi shart.
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full bg-slate-950/60 text-slate-200 text-xs">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 text-left font-semibold">Savol</th>
              <th className="py-3 px-4 text-left font-semibold text-emerald-400">To'g'ri javob</th>
              <th className="py-3 px-4 text-left font-semibold">Muqobil javob 1</th>
              <th className="py-3 px-4 text-left font-semibold">Muqobil javob 2</th>
              <th className="py-3 px-4 text-left font-semibold">Muqobil javob 3</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            <tr className="hover:bg-slate-900/30 transition-colors">
              <td className="py-3 px-4 font-mono text-indigo-300">&lt;?php</td>
              <td className="py-3 px-4 text-emerald-400 font-medium">Ochuvchi teg</td>
              <td className="py-3 px-4 text-slate-300">Saqlanish teg</td>
              <td className="py-3 px-4 text-slate-300">Yopuvchi teg</td>
              <td className="py-3 px-4 text-slate-300">Printerga chiqaruvchi teg</td>
            </tr>
            <tr className="bg-slate-900/20 text-slate-500">
              <td className="py-2.5 px-4 font-mono">...</td>
              <td className="py-2.5 px-4">...</td>
              <td className="py-2.5 px-4">...</td>
              <td className="py-2.5 px-4">...</td>
              <td className="py-2.5 px-4">...</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-3.5 text-slate-400 text-xs flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        <p>Eslatma: Birinchi qatorda sarlavhalar, keyingi qatorlarda esa savol va javoblar ketma-ket joylashishi kerak.</p>
      </div>
    </div>
  );
};

export default ExcelExample;