import React from 'react';
import { FileSpreadsheet, HelpCircle } from 'lucide-react';

const ExcelExample: React.FC = () => {
  return (
    <div className="bg-[#2d2b3d] p-6 rounded-lg shadow-lg mb-8">
      <div className="flex items-center mb-4">
        <FileSpreadsheet size={24} className="text-green-400 mr-2" />
        <h3 className="text-xl font-semibold text-white">Excel fayl namunasi</h3>
        <div className="ml-2 group relative">
          <HelpCircle size={18} className="text-gray-400 cursor-pointer" />
          <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-sm rounded p-2 w-64 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
            Excel faylida quyidagi ustunlar bo'lishi kerak
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[#3b3950] text-white rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="py-3 px-4 text-left">Savol</th>
              <th className="py-3 px-4 text-left">Tog'ri javob</th>
              <th className="py-3 px-4 text-left">Muqobil javob</th>
              <th className="py-3 px-4 text-left">Muqobil javob</th>
              <th className="py-3 px-4 text-left">Muqobil javob</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="py-3 px-4">&lt;?php</td>
              <td className="py-3 px-4">Ochuvchi teg</td>
              <td className="py-3 px-4">Saqlanish teg</td>
              <td className="py-3 px-4">Yopuvchi teg</td>
              <td className="py-3 px-4">Printerga chiqaruvchi teg</td>
            </tr>
            <tr className="border-b border-gray-700 bg-[#332f45]">
              <td className="py-3 px-4">...</td>
              <td className="py-3 px-4">...</td>
              <td className="py-3 px-4">...</td>
              <td className="py-3 px-4">...</td>
              <td className="py-3 px-4">...</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-gray-300 text-sm">
        <p>Izoh: Excel faylingizda kamida 1-ta savol, 1-ta to'g'ri javob va 1-ta noto'g'ri javob bo'lishi kerak.</p>
      </div>
    </div>
  );
};

export default ExcelExample;