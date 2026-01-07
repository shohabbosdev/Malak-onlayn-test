import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Salom! Men sizga eXTest tizimi bo\'yicha yordam beruvchi botman. Sizga qanday yordam bera olaman?',
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    // Foydalanuvchi xabari
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Ollama API chaqiruvi
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-oss:120b',
          messages: [
            {
              role: 'system',
              content: 'Siz eXTest tizimi bo\'yicha yordam beruvchi bot ekansiz. Foydalanuvchilarga Excel fayllar bilan ishlash, Telegram bot sozlamalari, test natijalari va boshqa tizim funksiyalari bo\'yicha yordam bering.'
            },
            { role: 'user', content: inputValue }
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message.content,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Ollama chaqiruvida xatolik:', error);
      // Xatolik yuz berganda simulyatsiya qiluvchi funksiyani chaqirish
      const fallbackResponse = getFallbackResponse(inputValue.toLowerCase());
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (userInput: string): string => {
    if (userInput.includes('salom') || userInput.includes('assalom')) {
      return 'Assalom alaykum! Sizga eXTest tizimi bo\'yicha yordam berishdan mamnunman. Sizga qanday yordam bera olaman?';
    } else if (userInput.includes('excel') || userInput.includes('fayl') || userInput.includes('yukla')) {
      return 'Siz Excel fayllar orqali test savollarini yuklashingiz mumkin. Buning uchun "Test savollarini yuklash" bo\'limiga o\'ting. Excel fayl formati haqida ko\'proq ma\'lumot olish uchun "Excel namuna" bo\'limiga qarashingiz mumkin.';
    } else if (userInput.includes('bot') || userInput.includes('sozlama') || userInput.includes('telegram')) {
      return 'Telegram bot sozlamalari uchun "Telegram bot uchun sozlamalar" bo\'limiga o\'ting. Bot tokeni va foydalanuvchi ID kiritishingiz kerak. Token olish uchun @BotFather bilan suxbatda bo\'ling.';
    } else if (userInput.includes('natija') || userInput.includes('grafik') || userInput.includes('ko\'rish')) {
      return 'Test natijalarini grafik ko\'rinishda ko\'rish uchun testni yuboring va natijalarni kuting. Grafik shaklda natijalarni yuklab olish ham mumkin.';
    } else if (userInput.includes('qanday') || userInput.includes('qo\'llanma') || userInput.includes('video')) {
      return 'Qo\'llanma videoni ko\'rish uchun sahifaning yuqori qismidagi "Qo\'llanma" tugmasini bosing. Unda tizimdan to\'liq foydalanish bo\'yicha ma\'lumotlar mavjud.';
    } else if (userInput.includes('chiqish') || userInput.includes('yordam') || userInput.includes('tugat')) {
      return 'Yordamim sizga yetarli bo\'ldimi? Agar boshqa savolingiz bo\'lsa, xursandchilik bilan javob beraman! Har qanday savol uchun men doim sariqishiman.';
    } else if (userInput.includes('format') || userInput.includes('excel format') || userInput.includes('struktura')) {
      return 'Excel faylining to\'g\'ri formati: A ustun - Savol, B ustun - Javob A, C ustun - Javob B, D ustun - Javob C, E ustun - Javob D, F ustun - To\'g\'ri javob (A, B, C yoki D). Batafsil ma\'lumot uchun "Excel namuna" bo\'limiga qarang.';
    } else if (userInput.includes('telegram') || userInput.includes('xabar') || userInput.includes('yuborish')) {
      return 'Test natijalari to\'g\'ridan-to\'g\'ri Telegram bot orqali foydalanuvchilarga yuboriladi. Buning uchun bot sozlamalari to\'g\'ri kiritilgan bo\'lishi kerak.';
    } else if (userInput.includes('hisobot') || userInput.includes('statistika') || userInput.includes('analitika')) {
      return 'Test bo\'yicha statistik hisobotlarni grafik ko\'rinishda ko\'rish mumkin. Jami ishtirokchilar, to\'g\'ri javoblar foizi, o\'rtacha ball va boshqa ko\'rsatkichlar aks ettiriladi.';
    } else if (userInput.includes('sozlamalar') || userInput.includes('o\'zgartirish') || userInput.includes('tahrirlash')) {
      return 'Sozlamalarni o\'zgartirish uchun kerakli bo\'limni tanlang. Bot tokeni, foydalanuvchi ID, test sozlamalari kabi parametrlarni tahrirlash mumkin.';
    } else {
      return 'Mening tizim bo\'yicha ma\'lumotlarim cheklangan. Sizga yordam bera olishim uchun aniqroq so\'rov yuboring. Masalan: "Excel fayl qanday tayyorlanadi?", "Bot sozlamalari qanday o\'rnatiladi?", "Natijalar qanday ko\'rsatiladi?"';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-gradient-to-br from-[#2d2b3d] to-[#3c3a4d] w-80 h-96 rounded-xl shadow-2xl flex flex-col border border-white/20">
          {/* Chat header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-white/20 mr-3">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Yordamchi Bot</h3>
                <p className="text-xs text-purple-200">Onlayn</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#1a1922]/30">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                      : 'bg-white/10 text-gray-200 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'bot' && (
                      <Bot size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-sm">{message.text}</p>
                    {message.sender === 'user' && (
                      <User size={16} className="text-white/80 mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs mt-1 opacity-70 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-white/10 bg-[#1a1922]/50">
            <div className="flex items-center space-x-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Xabaringizni kiriting..."
                className="flex-1 bg-[#3b3950] text-white text-sm rounded-lg py-2 px-3 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 max-h-20"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={inputValue.trim() === '' || isLoading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};

export default Chatbot;