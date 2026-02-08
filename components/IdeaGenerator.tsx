import React, { useState } from 'react';
import { BuildIdea, InventoryItem } from '../types';
import { generateLDrawScript, generateBuildImage } from '../services/geminiService';
import LDrawViewer from './LDrawViewer';

interface IdeaGeneratorProps {
  inventory: InventoryItem[];
  ideas: BuildIdea[];
  loading: boolean;
  hasGenerated: boolean;
}

interface IdeaContent {
  image?: string;
  script?: string;
  view: 'none' | 'image' | '3d';
}

const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ inventory, ideas, loading, hasGenerated }) => {
  const [contentState, setContentState] = useState<Record<number, IdeaContent>>({});
  const [loadingState, setLoadingState] = useState<Record<number, string | null>>({}); // Stores 'image' | 'blueprint' | '3d'

  const handleGenerateImage = async (index: number, idea: BuildIdea) => {
    if (loadingState[index]) return;
    setLoadingState(prev => ({ ...prev, [index]: 'image' }));

    try {
      const inventoryStr = inventory.map(i => i.part.name).join(", ");
      const imageUrl = await generateBuildImage(idea.title, inventoryStr);
      
      setContentState(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          image: imageUrl,
          view: 'image'
        }
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, [index]: null }));
    }
  };

  const ensureScript = async (index: number, idea: BuildIdea): Promise<string> => {
     let script = contentState[index]?.script;
     if (!script) {
        script = await generateLDrawScript(idea.title, inventory);
        setContentState(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                script: script
            }
        }));
     }
     return script;
  };

  const handleView3D = async (index: number, idea: BuildIdea) => {
    if (loadingState[index]) return;
    setLoadingState(prev => ({ ...prev, [index]: '3d' }));

    try {
      await ensureScript(index, idea);
      setContentState(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          view: '3d'
        }
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, [index]: null }));
    }
  };

  const handleDownloadBlueprint = async (index: number, idea: BuildIdea) => {
    if (loadingState[index]) return;
    setLoadingState(prev => ({ ...prev, [index]: 'blueprint' }));

    try {
      const script = await ensureScript(index, idea);
      
      const blob = new Blob([script], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${idea.title.replace(/\s+/g, '_')}.ldr`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } finally {
      setLoadingState(prev => ({ ...prev, [index]: null }));
    }
  };

  const switchView = (index: number, view: 'image' | '3d') => {
    setContentState(prev => ({
        ...prev,
        [index]: {
            ...prev[index],
            view: view
        }
    }));
  };

  if (!hasGenerated && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30 h-full">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-4xl shadow-lg border border-slate-700">
          🔍
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Waiting for Analysis</h3>
        <p className="text-slate-400 max-w-md">
          Scatter some parts on the canvas and click <span className="text-blue-400 font-bold">Analyze & Build</span>. 
          Gemini will identify the parts and suggest designs.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
         <div className="flex items-center gap-3 mb-6">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse"></div>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-slate-800 rounded-xl animate-pulse border border-slate-700"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
            <h3 className="text-2xl font-bold text-white">Analysis Results</h3>
            <p className="text-slate-500 text-sm mt-1">
                Based strictly on {inventory.reduce((acc, i) => acc + i.quantity, 0)} detected parts.
            </p>
        </div>
        <span className="text-xs font-mono text-blue-400 bg-blue-900/30 px-3 py-1 rounded border border-blue-800">Strict Mode</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {ideas.map((idea, index) => {
            const state = contentState[index] || { view: 'none' };
            const activeLoading = loadingState[index]; // 'image' | 'blueprint' | '3d' | null
            const missingCount = idea.missingParts?.length || 0;
            const isFullMatch = missingCount === 0;

            return (
              <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col hover:border-slate-500 transition-colors shadow-lg">
                
                {/* Visualizer Area */}
                <div className="relative h-64 bg-slate-950 w-full overflow-hidden group flex flex-col">
                    
                    {/* Toolbar if content exists */}
                    {(state.image || (state.script && state.view === '3d')) && (
                        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between p-2 pointer-events-none">
                            <div className="pointer-events-auto flex gap-1 bg-black/60 backdrop-blur rounded-lg p-1 border border-white/10">
                                {state.image && (
                                    <button
                                        onClick={() => switchView(index, 'image')}
                                        className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition-colors ${state.view === 'image' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
                                    >
                                        Render
                                    </button>
                                )}
                                <button
                                    onClick={() => state.view === '3d' ? null : handleView3D(index, idea)}
                                    className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition-colors ${state.view === '3d' ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
                                >
                                    3D View
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Content Logic */}
                    {state.view === 'image' && state.image ? (
                        <img src={state.image} alt={idea.title} className="w-full h-full object-cover" />
                    ) : state.view === '3d' && state.script ? (
                        <LDrawViewer script={state.script} />
                    ) : (
                        // Empty State (Default)
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                            <div className="absolute inset-0 bg-slate-900/90"></div>
                            
                            <div className="relative z-10 w-full flex flex-col gap-2 items-center">
                                <p className="text-slate-400 text-xs mb-2 font-medium">Visualization Options</p>
                                <div className="flex gap-2 w-full max-w-[280px]">
                                    <button 
                                        onClick={() => handleGenerateImage(index, idea)}
                                        disabled={!!activeLoading}
                                        className="flex-1 py-2 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold rounded transition-all border border-blue-500 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                                    >
                                        AI Render
                                    </button>
                                    <button 
                                        onClick={() => handleView3D(index, idea)}
                                        disabled={!!activeLoading}
                                        className="flex-1 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-all border border-indigo-500 shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                                    >
                                        3D Interact
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleDownloadBlueprint(index, idea)}
                                    disabled={!!activeLoading}
                                    className="text-[10px] text-slate-500 hover:text-slate-300 underline decoration-slate-700 disabled:opacity-50"
                                >
                                    Download .ldr file
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {activeLoading && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                            <span className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></span>
                            <p className="text-xs text-white font-bold animate-pulse">
                                {activeLoading === 'image' ? 'Generating Render...' : activeLoading === '3d' ? 'Preparing 3D Model...' : 'Drafting Blueprint...'}
                            </p>
                        </div>
                    )}
                    
                    {/* Theme Badge */}
                    {state.view !== '3d' && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur text-[10px] font-bold text-white rounded uppercase tracking-wider border border-white/10 pointer-events-none">
                            {idea.theme}
                        </div>
                    )}

                    {/* Inventory Match Badge */}
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded backdrop-blur text-[10px] font-bold uppercase tracking-wider border pointer-events-none ${isFullMatch ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'}`}>
                        {isFullMatch ? '100% Owned Parts' : `${missingCount} Extra Parts Needed`}
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h4 className="text-lg font-bold text-white leading-tight">{idea.title}</h4>
                    {/* Quick download button */}
                    <button 
                        onClick={() => handleDownloadBlueprint(index, idea)}
                        disabled={!!activeLoading}
                        className="shrink-0 p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                        title="Download Blueprint"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </button>
                  </div>
                  
                  <p className="text-slate-300 text-sm mb-5 flex-1 leading-relaxed">{idea.description}</p>
                  
                  {/* Inventory Analysis */}
                  <div className="space-y-2 mb-4">
                     <div className="text-xs font-bold text-slate-500 uppercase">Inventory Check</div>
                     
                     <div className="flex flex-wrap gap-1">
                        {idea.usedParts.slice(0, 5).map((p, i) => (
                            <span key={i} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                                ✓ {p}
                            </span>
                        ))}
                        {idea.usedParts.length > 5 && <span className="text-[10px] text-slate-500 px-1">+{idea.usedParts.length - 5} more</span>}
                     </div>

                     {missingCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                            <div className="text-[10px] text-red-400 font-bold mb-1">MISSING PARTS (REQUIRED):</div>
                            <div className="flex flex-wrap gap-1">
                                {idea.missingParts.map((p, i) => (
                                    <span key={i} className="text-[10px] bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded border border-red-800/50">
                                        ⚠ {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                     )}
                  </div>
                  
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 mt-auto">
                      <p className="text-xs text-slate-400 italic">"{idea.reasoning}"</p>
                  </div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default IdeaGenerator;