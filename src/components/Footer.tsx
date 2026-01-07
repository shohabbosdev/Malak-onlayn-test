import React from 'react';
import { Heart, Mail, Phone, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-[#2d65dc] to-[#5a4fc4] text-white py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-xl font-bold mb-4 flex items-center">
              <Globe size={20} className="mr-2" />
              eXTest
            </h4>
            <p className="text-gray-200">
              Excel fayllar orqali test savollarini yuborish va natijalarni kuzatish uchun zamonaviy platforma.
            </p>
          </div>
          
          <div>
            <h4 className="text-xl font-bold mb-4">Aloqa</h4>
            <ul className="space-y-2 text-gray-200">
              <li className="flex items-center">
                <Mail size={16} className="mr-2" />
                <a href="mailto:support@ex-test.uz" className="hover:text-purple-200 transition-colors">support@ex-test.uz</a>
              </li>
              <li className="flex items-center">
                <Phone size={16} className="mr-2" />
                <a href="tel:+998901234567" className="hover:text-purple-200 transition-colors">+998 (93) 118-99-88</a>
              </li>
              <li className="flex items-center">
                <Globe size={16} className="mr-2" />
                <a href="https://t.me/shohabbosdev" className="hover:text-purple-200 transition-colors">@shohabbosdev</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-xl font-bold mb-4">Biz haqimizda</h4>
            <p className="text-gray-200">
              Har doim foydalanuvchilarimizning ehtiyojlarini qondiruvchi sifatli xizmat ko'rsatish maqsadida ishlaymiz.
            </p>
            <div className="mt-4 flex items-center text-red-400">
              <Heart size={16} className="mr-1" fill="currentColor" />
              <span className="text-sm">@shohabbosdev tomonidan yaratildi</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 mt-8 pt-6 text-center text-gray-300">
          <p>&copy; {new Date().getFullYear()} eXTest. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;