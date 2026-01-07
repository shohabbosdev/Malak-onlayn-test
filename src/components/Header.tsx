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
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;