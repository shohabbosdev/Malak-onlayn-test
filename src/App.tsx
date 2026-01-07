import React, { useState, useEffect } from 'react';
import { TelegramConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import BotConfig from './components/BotConfig';
import FileUpload from './components/FileUpload';
import ExcelExample from './components/ExcelExample';
import { Bot, Upload, MessageSquare, BarChart3 } from 'lucide-react';

function App() {
  const [config, setConfig] = useState<TelegramConfig>(() => {
    const savedConfig = localStorage.getItem('telegramConfig');
    return savedConfig ? JSON.parse(savedConfig) : { botToken: '', userId: '' };
  });

  useEffect(() => {
    localStorage.setItem('telegramConfig', JSON.stringify(config));
  }, [config]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#2c3e50] to-[#414f54] text-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600">
              <Bot size={64} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Excel + Telegram bot dasturi
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Kerakli shablonga mos excel faylini yuklang va testlarni telegram bot orqali o'tkazing. 
            Yakuniy natijalarni real vaqtda kuzating.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <Upload size={40} className="mx-auto text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Excel yuklash</h3>
              <p className="text-gray-300">Test savollarini excel fayl orqali tezda yuklang</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <MessageSquare size={40} className="mx-auto text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Telegram bot</h3>
              <p className="text-gray-300">Testlarni bevosita telegram orqali yuboring</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <BarChart3 size={40} className="mx-auto text-green-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Natijalar</h3>
              <p className="text-gray-300">Test natijalarini grafik ko'rinishda kuzating</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* YouTube Tutorial Section */}
      <section className="py-12 bg-gradient-to-r from-purple-900/20 to-indigo-900/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Qo'llanma video</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Tizimdan qanday foydalanishni quyidagi video orqali bilib olishingiz mumkin 📀
          </p>
          <a 
            href="https://www.youtube.com/watch?v=r8XEQn5kqtY" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="mr-3">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              YouTube'da tomosha qilish
            </div>
          </a>
        </div>
      </section>
      
      {/* Main Content */}
      <section id="how-it-works" className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BotConfig config={config} onConfigChange={setConfig} />
                
                <FileUpload config={config} />
              </div>
              
              <ExcelExample />
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}

export default App;