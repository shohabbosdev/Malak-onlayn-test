import React from 'react';
import { Bot, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-50 text-white transition-all">
      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
            <Bot size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              eXTest
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Online Quiz Bot</p>
          </div>
        </div>
        
        {/* Desktop menu */}
        <nav className="hidden md:block">
          <ul className="flex items-center space-x-2">
            <li>
              <a 
                href="https://t.me/shohabbosdev" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all font-medium"
              >
                Bog'lanish
              </a>
            </li>
            <li>
              <a 
                href="https://www.youtube.com/watch?v=r8XEQn5kqtY" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                Qo'llanma
              </a>
            </li>
          </ul>
        </nav>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl px-6 py-4 animate-fadeIn">
          <ul className="space-y-3">
            <li>
              <a 
                href="https://t.me/shohabbosdev" 
                className="block text-slate-300 hover:text-white text-sm font-medium py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Bog'lanish
              </a>
            </li>
            <li>
              <a 
                href="https://www.youtube.com/watch?v=r8XEQn5kqtY" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                Qo'llanma
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;