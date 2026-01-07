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
      
      {/* Main Content */}
      <section id="how-it-works" className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 gap-8">
              <BotConfig config={config} onConfigChange={setConfig} />
              
              <FileUpload config={config} />
              
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