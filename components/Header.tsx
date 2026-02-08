import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-8 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mx-0.5"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full mx-0.5"></div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            BrickMind <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">AI</span>
          </h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Explorer</a>
          <a href="#db-guide" className="hover:text-white transition-colors">DB Architecture</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;