import React from 'react';
import { Home, Frown } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2c3e50] to-[#414f50] p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-gradient-to-r from-red-600 to-orange-600">
            <Frown size={64} className="text-white" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-300 mb-4">Sahifa topilmadi</h2>
        <p className="text-gray-400 mb-8">
          Uzr, siz qidirayotgan sahifa mavjud emas yoki o'zgartirilgan bo'lishi mumkin.
        </p>
        
        <a 
          href="/" 
          className="inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30"
        >
          <Home size={18} className="mr-2" />
          Bosh sahifaga qaytish
        </a>
      </div>
    </div>
  );
};

export default NotFound;