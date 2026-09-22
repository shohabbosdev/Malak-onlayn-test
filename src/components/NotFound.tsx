import React from 'react';
import { Home, Frown } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <Frown size={56} className="text-rose-400" />
          </div>
        </div>
        
        <h1 className="text-5xl font-black text-white mb-2 tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Sahifa topilmadi</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Uzr, siz qidirayotgan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin.
        </p>
        
        <a 
          href="/" 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-indigo-500/25"
        >
          <Home size={16} />
          Bosh sahifaga qaytish
        </a>
      </div>
    </div>
  );
};

export default NotFound;