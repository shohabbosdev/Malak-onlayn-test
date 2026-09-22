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
    <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
      {label}
    </label>
    <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
      <div className="flex items-center bg-slate-900/80 px-3 text-slate-400 border-r border-slate-800">
        {icon}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full bg-transparent text-white px-3.5 py-2.5 text-sm placeholder-slate-500 focus:outline-none disabled:opacity-50 ${
          error ? 'border-red-500' : ''
        }`}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint`}
      />
    </div>
    <p id={`${id}-hint`} className="text-[11px] text-slate-400 mt-1">
      {hint}
    </p>
    {error && (
      <p className="text-xs text-rose-400 mt-1 flex items-center font-medium">
        <AlertCircle size={13} className="mr-1 shrink-0" />
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
    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all duration-300 border border-slate-800/80 hover:border-indigo-500/30">
      <div
        className="flex items-center justify-between cursor-pointer select-none mb-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Telegram bot sozlamalari</h3>
            <p className="text-xs text-slate-400">Token va qabul qiluvchi ID ma'lumotlari</p>
          </div>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 pt-2 border-t border-slate-800/80 animate-fadeIn">
          <InputField
            id="botToken"
            label="Bot tokeni"
            value={botToken}
            onChange={setBotToken}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            disabled={!isEditing}
            icon={<Key size={16} className="text-indigo-400" />}
            hint="Bot tokenini @BotFather orqali olishingiz mumkin"
            type={isEditing ? 'text' : 'password'}
            error={errors.botToken}
          />

          <InputField
            id="userId"
            label="User / Guruh ID"
            value={userId}
            onChange={setUserId}
            placeholder="-1001234567890 yoki 12345678"
            disabled={!isEditing}
            icon={<User size={16} className="text-indigo-400" />}
            hint="Guruh uchun -100 bilan boshlanadi, shaxsiy chat uchun @userinfobot"
            error={errors.userId}
          />

          <div className="flex justify-end pt-2">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={!botToken || !userId || !!errors.botToken || !!errors.userId}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              >
                <Save size={16} />
                Sozlamalarni saqlash
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium py-2 px-4 rounded-xl transition-all duration-200 shadow-md"
              >
                <Edit size={16} />
                Tahrirlash
              </button>
            )}
          </div>

          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center font-medium animate-fadeIn">
              <CheckCircle size={16} className="mr-2 shrink-0" />
              Sozlamalar brauzerda muvaffaqiyatli saqlandi!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BotConfig;