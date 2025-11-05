import React, { useState, useEffect, useRef } from 'react';
import { TelegramConfig } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import BotConfig from './components/BotConfig';
import FileUpload from './components/FileUpload';
import ExcelExample from './components/ExcelExample';
import { Bot } from 'lucide-react';

function App() {
  const [config, setConfig] = useState<TelegramConfig>(() => {
    const savedConfig = localStorage.getItem('telegramConfig');
    return savedConfig ? JSON.parse(savedConfig) : { botToken: '', userId: '' };
  });
  
  const fileUploadRef = useRef<{ validateConfig: () => boolean }>(null);

  useEffect(() => {
    localStorage.setItem('telegramConfig', JSON.stringify(config));
  }, [config]);

  return (
    <div className="min-h-screen flex flex-col bg-[#414f54] text-white">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <Bot size={64} className="text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold mt-4 mb-2">Telegram quiz bot dasturi</h2>
            <p className="text-gray-300 max-w-xl mx-auto">
              Excel fayl orqali testlarni yuklang va Telegram bot orqali o'tkazing. 
              Natijalarni real vaqtda kuzating.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <BotConfig config={config} onConfigChange={setConfig} />
            
            <FileUpload ref={fileUploadRef} config={config} />
            
            <ExcelExample />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;