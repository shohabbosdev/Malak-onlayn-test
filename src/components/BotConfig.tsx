import React, { useState, useEffect } from 'react';
import { Save, Edit, Key, User, Bot, CheckCircle } from 'lucide-react';
import { TelegramConfig } from '../types';

interface BotConfigProps {
  config: TelegramConfig;
  onConfigChange: (config: TelegramConfig) => void;
}

const BotConfig: React.FC<BotConfigProps> = ({ config, onConfigChange }) => {
  const [botToken, setBotToken] = useState(config.botToken || '');
  const [userId, setUserId] = useState(config.userId || '');
  const [isEditing, setIsEditing] = useState(!config.botToken || !config.userId);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onConfigChange({ botToken, userId });
    setIsEditing(false);
    setIsSaved(true);
    
    // Reset the "Saved" message after 3 seconds
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <div className="bg-[#2d2b3d] p-6 rounded-lg shadow-lg mb-8 transition-all duration-300">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
        <Bot size={24} className="text-purple-400 mr-2" />
        TelegramBot sozlamalari
      </h3>

      <div className="space-y-4">
        <div className="relative">
          <label htmlFor="botToken" className="block text-sm font-medium text-gray-300 mb-1">
            Bot Token
          </label>
          <div className="flex">
            <div className="flex items-center bg-[#3b3950] rounded-l-md p-2 border-r border-gray-600">
              <Key size={18} className="text-gray-400" />
            </div>
            <input
              id="botToken"
              type={isEditing ? "text" : "password"}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              disabled={!isEditing}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              className="w-full bg-[#3b3950] text-white p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Bot tokenini @BotFather orqali olishingiz mumkin</p>
        </div>

        <div className="relative">
          <label htmlFor="userId" className="block text-sm font-medium text-gray-300 mb-1">
            User ID
          </label>
          <div className="flex">
            <div className="flex items-center bg-[#3b3950] rounded-l-md p-2 border-r border-gray-600">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={!isEditing}
              placeholder="12345678"
              className="w-full bg-[#3b3950] text-white p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">User ID-ni @userinfobot orqali olishingiz mumkin</p>
        </div>

        <div className="flex justify-end mt-4">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={!botToken || !userId}
              className="flex items-center bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} className="mr-2" />
              Saqlash
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className="flex items-center bg-[#3b3950] hover:bg-[#4d4b63] text-white py-2 px-4 rounded-md transition-colors duration-200"
            >
              <Edit size={18} className="mr-2" />
              O'zgartirish
            </button>
          )}
        </div>

        {isSaved && (
          <div className="mt-2 text-green-400 text-sm flex items-center">
            <CheckCircle size={16} className="mr-1" />
            Muvaffaqiyatli saqlandi!
          </div>
        )}
      </div>
    </div>
  );
};

export default BotConfig;