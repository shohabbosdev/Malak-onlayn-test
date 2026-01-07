import React, { useState, useEffect } from 'react';
import { Save, Edit, Key, User, Bot, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { TelegramConfig } from '../types';

interface BotConfigProps {
  config: TelegramConfig;
  onConfigChange: (config: TelegramConfig) => void;
}

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  icon: React.ReactNode;
  hint: string;
  type?: string;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  icon,
  hint,
  type = 'text',
  error,
}) => (
  <div className="relative">
    <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
      {label}
    </label>
    <div className="flex">
      <div className="flex items-center bg-[#3b3950] rounded-l-md p-2 border-r border-gray-600">
        {icon}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full bg-[#17161c] text-white p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 ${
          error ? 'border border-red-500' : ''
        }`}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint`}
      />
    </div>
    <p id={`${id}-hint`} className="text-xs text-gray-400 mt-1">
      {hint}
    </p>
    {error && (
      <p className="text-xs text-red-400 mt-1 flex items-center">
        <AlertCircle size={14} className="mr-1" />
        {error}
      </p>
    )}
  </div>
);

const BotConfig: React.FC<BotConfigProps> = ({ config, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(true); // Changed to true - expanded by default
  const [botToken, setBotToken] = useState(config.botToken || '');
  const [userId, setUserId] = useState(config.userId || '');
  const [isEditing, setIsEditing] = useState(!config.botToken || !config.userId);
  const [isSaved, setIsSaved] = useState(false);
  const [errors, setErrors] = useState<{ botToken?: string; userId?: string }>({});

  // Auto-expand when there are errors or when editing
  useEffect(() => {
    if (Object.keys(errors).length > 0 || isEditing) {
      setIsOpen(true);
    }
  }, [errors, isEditing]);

  const validateInputs = () => {
    const newErrors: { botToken?: string; userId?: string } = {};
    
    // Validate bot token if provided
    if (botToken && !/^[0-9]+:[A-Za-z0-9\-_]+$/.test(botToken)) {
      newErrors.botToken = 'Bot tokeni noto‘g‘ri formatda joylashtirilgan';
    }
    
    // Validate user ID if provided
    if (userId) {
      const isNumericId = /^-?[0-9]+$/.test(userId);
      const isUsername = /^@[a-zA-Z0-9_]+$/.test(userId);
      const isChannel = /^@/.test(userId);
      const isGroup = /^-/.test(userId);
      
      if (!isNumericId && !isUsername && !isChannel && !isGroup) {
        newErrors.userId = 'User ID faqat raqamlardan iborat bo‘lishi kerak (minus ishorali bo\'lishi ham mumkin), @ bilan boshlanadigan username, kanal (@) yoki guruh (-) bo‘lishi kerak';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateInputs()) return;
    onConfigChange({ botToken, userId });
    setIsEditing(false);
    setIsSaved(true);
  };

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  return (
    <div className="bg-gradient-to-br from-[#2d2b3d] to-[#3c3a4d] p-6 rounded-xl shadow-lg mb-8 transition-all duration-300 border border-white/10 hover:border-purple-500/30">
      <h3
        className="text-xl font-semibold text-white mb-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 mr-3">
            <Bot size={24} className="text-white" />
          </div>
          Telegram bot uchun sozlamalar
        </span>
        {isOpen ? (
          <ChevronUp size={24} className="text-purple-400" />
        ) : (
          <ChevronDown size={24} className="text-purple-400" />
        )}
      </h3>

      {isOpen && (
        <div className="space-y-5 animate-fadeIn">
          <InputField
            id="botToken"
            label="Bot tokeni"
            value={botToken}
            onChange={setBotToken}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            disabled={!isEditing}
            icon={<div className="p-1 rounded"><Key size={18} className="text-purple-400" /></div>}
            hint="Bot tokenini @BotFather orqali olishingiz mumkin"
            type={isEditing ? 'text' : 'password'}
            error={errors.botToken}
          />

          <InputField
            id="userId"
            label="User ID"
            value={userId}
            onChange={setUserId}
            placeholder="12345678"
            disabled={!isEditing}
            icon={<div className="p-1 rounded"><User size={18} className="text-blue-400" /></div>}
            hint="User ID-ni @userinfobot orqali olishingiz mumkin"
            error={errors.userId}
          />

          <div className="flex justify-end mt-4">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={!botToken || !userId || !!errors.botToken || !!errors.userId}
                className="flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2.5 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/20"
              >
                <Save size={18} className="mr-2" />
                Sozlamalarni saqlash
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2.5 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-gray-500/20"
              >
                <Edit size={18} className="mr-2" />
                Sozlamalarni tahrirlash
              </button>
            )}
          </div>

          {isSaved && (
            <div className="mt-3 text-green-400 text-sm flex items-center animate-pulse">
              <CheckCircle size={18} className="mr-2" />
              Sozlamalar muvaffaqiyatli saqlandi!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BotConfig;