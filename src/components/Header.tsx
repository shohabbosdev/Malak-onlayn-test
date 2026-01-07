import React from 'react';
import { Bot, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-[#2d65dc] to-[#5a4fc4] text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-white/20">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide">eXTest</h1>
        </div>
        
        {/* Desktop menu */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            {/* <li>
              <a 
                href="#features" 
                className="hover:text-purple-200 transition-colors duration-200 font-medium relative group"
              >
                Xususiyatlar
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-300 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </li> */}
            {/* <li>
              <a 
                href="#how-it-works" 
                className="hover:text-purple-200 transition-colors duration-200 font-medium relative group"
              >
                Qanday ishlaydi
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-300 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </li> */}
            <li>
              <a 
                href="https://t.me/shohabbosdev" 
                className="hover:text-purple-200 transition-colors duration-200 font-medium relative group"
              >
                Bog'lanish
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-300 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </li>
            <li>
              <a 
                href="https://www.youtube.com/watch?v=r8XEQn5kqtY" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-200 transition-colors duration-200 font-medium relative group flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                Qo'llanma
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-300 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </li>
          </ul>
        </nav>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-white focus:outline-none z-50"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#2d65dc] shadow-lg py-4 px-6">
          <ul className="space-y-4">
            <li>
              <a 
                href="#features" 
                className="block text-white hover:text-purple-200 transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Xususiyatlar
              </a>
            </li>
            <li>
              <a 
                href="#how-it-works" 
                className="block text-white hover:text-purple-200 transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Qanday ishlaydi
              </a>
            </li>
            <li>
              <a 
                href="https://t.me/shohabbosdev" 
                className="block text-white hover:text-purple-200 transition-colors duration-200 font-medium"
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
                className="block text-white hover:text-purple-200 transition-colors duration-200 font-medium flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
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