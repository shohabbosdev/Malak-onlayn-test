import React from 'react';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2d65dc] text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p>&copy; {new Date().getFullYear()} @testoakbot</p>
          </div>
          <div className="flex items-center">
            <Heart size={16} className="text-red-500 mr-2" fill="currentColor" />
            <span className="mr-2">Shoh Abbos tomonidan</span>
            <span>ishlab chiqilgan</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;