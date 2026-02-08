import React, { useMemo } from 'react';
import { ScatteredPart } from '../types';

interface PartSelectorProps {
  parts: ScatteredPart[];
  onScatter: () => void;
  onAnalyze: () => void;
  loading: boolean;
}

const PartSelector: React.FC<PartSelectorProps> = ({ parts, onScatter, onAnalyze, loading }) => {
  
  // Calculate a mock bounding box for the "Vision Scan" effect
  const scanBox = useMemo(() => {
     if (parts.length === 0) return null;
     const minX = Math.min(...parts.map(p => p.x));
     const maxX = Math.max(...parts.map(p => p.x));
     const minY = Math.min(...parts.map(p => p.y));
     const maxY = Math.max(...parts.map(p => p.y));
     return { left: minX, top: minY, width: maxX - minX + 60, height: maxY - minY + 60 };
  }, [parts]);

  return (
    <div className="w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
           <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Live Cam Feed (Simulated)</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">
           {parts.length} Objects Detected
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full h-80 bg-slate-900 overflow-hidden group">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20" style={{ 
            backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
            backgroundSize: '20px 20px' 
        }}></div>

        {/* Scattered Parts */}
        {parts.map((part) => (
          <div
            key={part.instanceId}
            className="absolute transition-all duration-500 ease-out cursor-pointer hover:scale-110 hover:z-50"
            style={{
              left: `${part.x}%`,
              top: `${part.y}%`,
              transform: `rotate(${part.rotation}deg)`,
              zIndex: part.zIndex,
              width: '60px',
              height: '60px'
            }}
          >
            <img 
              src={part.imageUrl} 
              alt={part.name}
              className="w-full h-full object-contain drop-shadow-lg pointer-events-none"
            />
            {/* Detection Box (Visible only during loading/scanning) */}
            {loading && (
                <div className="absolute -inset-2 border border-green-400/50 rounded bg-green-400/10 animate-pulse">
                    <div className="absolute -top-3 left-0 bg-green-500 text-[8px] text-black font-bold px-1">
                        {(Math.random() * (0.99 - 0.85) + 0.85).toFixed(2)}
                    </div>
                </div>
            )}
          </div>
        ))}
        
        {/* Scanning Overlay Effect */}
        {loading && (
            <div className="absolute inset-0 z-50 pointer-events-none">
                 <div className="w-full h-1 bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)] absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-slate-800 flex gap-3">
        <button
          onClick={onScatter}
          disabled={loading}
          className="flex-1 py-3 px-4 bg-slate-700 text-slate-200 font-bold rounded-lg hover:bg-slate-600 transition-all disabled:opacity-50 text-sm"
        >
           Randomize Scene
        </button>
        <button
          onClick={onAnalyze}
          disabled={loading || parts.length === 0}
          className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
        >
           {loading ? (
             <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
             </>
           ) : (
             <>
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="14.31" x2="20.05" y1="8" y2="17.94"/><line x1="9.69" x2="21.17" y1="8" y2="8"/><line x1="7.38" x2="13.12" y1="12" y2="2.06"/><line x1="9.69" x2="3.95" y1="16" y2="6.06"/><line x1="14.31" x2="2.83" y1="16" y2="16"/><line x1="16.62" x2="10.88" y1="12" y2="21.94"/></svg>
               Analyze & Build
             </>
           )}
        </button>
      </div>
      <style>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PartSelector;
