import React, { useState, useEffect } from 'react';
import { Save, Edit, Key, User, Bot, CheckCircle, AlertCircle,  ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(true);
  const [botToken, setBotToken] = useState(config.botToken || '');
  const [userId, setUserId] = useState(config.userId || '');
  const [isEditing, setIsEditing] = useState(!config.botToken || !config.userId);
  const [isSaved, setIsSaved] = useState(false);
  const [errors, setErrors] = useState<{ botToken?: string; userId?: string }>({});

  const validateInputs = () => {
    const newErrors: { botToken?: string; userId?: string } = {};
    if (!/^\d+:[A-Za-z0-9\-_]+$/.test(botToken)) {
      newErrors.botToken = 'Bot tokeni noto‘g‘ri formatda';
    }
    if (!(/^-?\d+$/.test(userId) || /^@[a-zA-Z0-9_]+$/.test(userId))) {
      newErrors.userId = 'User ID faqat raqamlardan iborat bo‘lishi kerak (manfiy ham mumkin) yoki @ bilan boshlanadigan username';
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
      return () => clearTimeout(timer); // Cleanup
    }
  }, [isSaved]);

  return (
    <div className="bg-[#2d2b3d] p-6 rounded-lg shadow-lg mb-8 transition-all duration-300">
      <h3
        className="text-xl font-semibold text-white mb-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          <Bot size={24} className="text-purple-400 mr-2" />
          TelegramBot sozlamalari
        </span>
        {isOpen ? (
          <ChevronUp size={20} className="text-white" />
        ) : (
          <ChevronDown size={20} className="text-white" />
        )}
      </h3>

      { isOpen && (
        <div className="space-y-4">
        <InputField
          id="botToken"
          label="Bot tokeni"
          value={botToken}
          onChange={setBotToken}
          placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          disabled={!isEditing}
          icon={<Key size={18} className="text-gray-400" />}
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
          icon={<User size={18} className="text-gray-400" />}
          hint="User ID-ni @userinfobot orqali olishingiz mumkin"
          error={errors.userId}
        />

        <div className="flex justify-end mt-4">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={!botToken || !userId || !!errors.botToken || !!errors.userId}
              className="flex items-center bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} className="mr-2" />
              Sozlamalarni saqlash
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center bg-[#3b3950] hover:bg-[#4d4b63] text-white py-2 px-4 rounded-md transition-colors duration-200"
            >
              <Edit size={18} className="mr-2" />
              Sozlamalarni tahrirlash
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
      )}
      
    </div>
  );
};

export default BotConfig;