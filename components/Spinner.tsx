import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/30 rounded-full animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-full border-t-4 border-cyan-400 rounded-full animate-spin"></div>
    </div>
    <div className="text-cyan-300 text-sm font-mono animate-pulse">جاري المعالجة بالذكاء الاصطناعي...</div>
  </div>
);