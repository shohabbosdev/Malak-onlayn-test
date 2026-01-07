import React from 'react';
import { Bot } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#2d65dc] text-white p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot size={32} className="text-white" />
          <h1 className="text-2xl font-bold">eXTest</h1>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <a href="https://t.me/shohabbosdev" className="hover:text-purple-300 transition-colors duration-200">
                Biz bilan bog'lanish
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;