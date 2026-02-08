import React from 'react';
import { DB_SCHEMA_GUIDE } from '../constants';

const DbArchitectureGuide: React.FC = () => {
  return (
    <div id="db-guide" className="w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 mt-16">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-4">Database Architecture Guide</h2>
          <p className="text-slate-400 mb-4">
            To build a robust service like Rebrickable or BrickLink, you need a highly relational database schema. 
            Below is a recommended structure for your backend (PostgreSQL/MySQL).
          </p>
          <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
             <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase">Pro Tip: Vector Search</h4>
             <p className="text-sm text-blue-200">
                Enhance your DB with a <code>Vector</code> column in the <strong>Parts</strong> table. 
                Use Gemini Embeddings to store the semantic description or visual embedding of a part. 
                This allows queries like <em>"Find me a part that looks like a dragon wing"</em>.
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DB_SCHEMA_GUIDE.map((table) => (
          <div key={table.tableName} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-950 flex justify-between items-center">
              <span className="font-mono font-bold text-yellow-500">{table.tableName}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Table</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-400 mb-4 italic">{table.description}</p>
              <div className="space-y-2">
                {table.columns.map((col) => (
                  <div key={col.name} className="flex items-center text-sm font-mono">
                    <span className="text-slate-300 w-28 shrink-0">{col.name}</span>
                    <span className="text-purple-400 w-24 shrink-0 text-xs">{col.type}</span>
                    <span className="text-slate-600 text-xs truncate">{col.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-8 border-t border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Data Flow Logic</h3>
        <div className="flex flex-col md:flex-row gap-4 text-sm text-slate-400">
            <div className="flex-1 bg-slate-900 p-4 rounded-lg">
                <strong className="text-white block mb-2">1. Ingestion</strong>
                Parse LDraw (`.dat`) files to extract geometry. Store metadata in `Parts`. Generate render and store URL.
            </div>
            <div className="flex-1 bg-slate-900 p-4 rounded-lg">
                <strong className="text-white block mb-2">2. Contextualization</strong>
                Ingest Sets inventories. Calculate part rarity and common usage contexts (e.g., "This part appears mostly in Technic sets").
            </div>
            <div className="flex-1 bg-slate-900 p-4 rounded-lg">
                <strong className="text-white block mb-2">3. AI Inference</strong>
                When a user queries a part, fetch related Sets from `Inventories`. Feed this context + Part Image to Gemini for MOC generation.
            </div>
        </div>
      </div>
    </div>
  );
};

export default DbArchitectureGuide;