import React from 'react';
import { Bot } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#3b3950] text-white p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot size={32} className="text-white" />
          <h1 className="text-2xl font-bold">TelegramQuiz Bot</h1>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <a href="#" className="hover:text-purple-300 transition-colors duration-200">
                Bosh sahifa
              </a>
            </li>
            <li>
              <a href="https://t.me/shohabbosdev" className="hover:text-purple-300 transition-colors duration-200">
                Bog'lanish
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;