import React from 'react';
import { Heart, Mail, Phone, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950/80 border-t border-slate-800/80 text-slate-300 py-12 mt-16 backdrop-blur-md">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-lg font-bold mb-3 flex items-center text-white">
              <Globe size={18} className="mr-2 text-indigo-400" />
              eXTest
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Excel fayllar orqali test savollarini yuborish va natijalarni kuzatish uchun zamonaviy platforma.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3">Aloqa</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center">
                <Mail size={15} className="mr-2 text-indigo-400" />
                <a href="mailto:support@ex-test.uz" className="hover:text-white transition-colors">support@ex-test.uz</a>
              </li>
              <li className="flex items-center">
                <Phone size={15} className="mr-2 text-indigo-400" />
                <a href="tel:+998931189988" className="hover:text-white transition-colors">+998 (93) 118-99-88</a>
              </li>
              <li className="flex items-center">
                <Globe size={15} className="mr-2 text-indigo-400" />
                <a href="https://t.me/shohabbosdev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@shohabbosdev</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3">Biz haqimizda</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Har doim foydalanuvchilarimizning ehtiyojlarini qondiruvchi sifatli xizmat ko'rsatish maqsadida ishlaymiz.
            </p>
            <div className="mt-4 flex items-center text-rose-400 text-xs font-medium">
              <Heart size={14} className="mr-1.5" fill="currentColor" />
              <span>@shohabbosdev tomonidan yaratildi</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-800/80 mt-8 pt-6 text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} eXTest. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;