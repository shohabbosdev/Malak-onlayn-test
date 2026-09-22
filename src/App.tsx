import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TelegramConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import BotConfig from './components/BotConfig';
import FileUpload from './components/FileUpload';
import ExcelExample from './components/ExcelExample';
import NotFound from './components/NotFound';
import Chatbot from './components/Chatbot';
import { Bot, Upload, MessageSquare, BarChart3 } from 'lucide-react';

function AppContent() {
  const [config, setConfig] = useState<TelegramConfig>(() => {
    const savedConfig = localStorage.getItem('telegramConfig');
    return savedConfig ? JSON.parse(savedConfig) : { botToken: '', userId: '' };
  });

  useEffect(() => {
    localStorage.setItem('telegramConfig', JSON.stringify(config));
  }, [config]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-80 right-0 w-[450px] h-[450px] bg-purple-500/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] pointer-events-none -z-10" />

      <Header />
      
      <main className="flex-1">
        <Routes>
          <Route path="/" element={
            <>
              {/* Hero Section */}
              <section className="py-16 md:py-20 relative">
                <div className="container mx-auto px-4 text-center max-w-4xl">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span>Telegram Quiz & Excel Platformasi</span>
                  </div>

                  <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                    Excel testlarini Telegram guruhlarida jonli o'tkazing
                  </h1>
                  
                  <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
                    Excel shablonidagi savollarni yuklang, soniyalar ichida Telegram guruh yoki kanallaringizga yuboring va natijalarni real vaqt rejimida kuzating.
                  </p>
                  
                  {/* Features Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/90 transition-all duration-300 shadow-xl group">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <Upload size={24} className="text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1.5">Excel yuklash</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Savollarni shablon orqali avtomatik import qiling va tartiblang.</p>
                    </div>
                    
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all duration-300 shadow-xl group">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <MessageSquare size={24} className="text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1.5">Telegram bot</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Guruh va kanallarga jonli teskari hisob bilan avtomatik test uzating.</p>
                    </div>
                    
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all duration-300 shadow-xl group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <BarChart3 size={24} className="text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1.5">Jonli reyting</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Tezlik va to'g'ri javoblar bo'yicha medal va balli Leaderboard oling.</p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* YouTube Tutorial Section */}
              <section className="py-8">
                <div className="container mx-auto px-4 max-w-4xl">
                  <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                    <div className="text-center sm:text-left">
                      <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">Video qo'llanma</div>
                      <h2 className="text-xl font-bold text-white mb-1">Tizimdan foydalanish bo'yicha yo'riqnoma</h2>
                      <p className="text-sm text-slate-400">Telegram botni sozlash va Excel testlarini o'tkazishni 3 daqiqada o'rganing.</p>
                    </div>
                    <a 
                      href="https://www.youtube.com/watch?v=r8XEQn5kqtY" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-600/20 shrink-0 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                      </svg>
                      Videoni ko'rish
                    </a>
                  </div>
                </div>
              </section>
              
              {/* Main Content Workspace */}
              <section id="how-it-works" className="py-12">
                <div className="container mx-auto px-4 max-w-4xl">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <BotConfig config={config} onConfigChange={setConfig} />
                      <FileUpload config={config} />
                    </div>
                    
                    <ExcelExample />
                  </div>
                </div>
              </section>
            </>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      <Footer />
      <Chatbot />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;