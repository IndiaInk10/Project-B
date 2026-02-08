import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PartSelector from './components/PartSelector';
import IdeaGenerator from './components/IdeaGenerator';
import DbArchitectureGuide from './components/DbArchitectureGuide';
import { SAMPLE_PARTS } from './constants';
import { ScatteredPart, BuildIdea, InventoryItem } from './types';
import { generateBuildIdeas } from './services/geminiService';

const App: React.FC = () => {
  const [scatteredParts, setScatteredParts] = useState<ScatteredPart[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ideas, setIdeas] = useState<BuildIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Initial scatter
  useEffect(() => {
    handleScatterParts();
  }, []);

  const handleScatterParts = () => {
    const numParts = Math.floor(Math.random() * 5) + 4; // 4 to 8 parts
    const newParts: ScatteredPart[] = [];

    for (let i = 0; i < numParts; i++) {
      const randomPart = SAMPLE_PARTS[Math.floor(Math.random() * SAMPLE_PARTS.length)];
      newParts.push({
        ...randomPart,
        instanceId: `${randomPart.id}-${i}-${Date.now()}`,
        x: Math.random() * 70 + 10, // 10% to 80% left
        y: Math.random() * 70 + 10, // 10% to 80% top
        rotation: Math.floor(Math.random() * 360),
        zIndex: i
      });
    }
    setScatteredParts(newParts);
    setIdeas([]);
    setHasGenerated(false);
  };

  const handleAnalyzeAndGenerate = async () => {
    setLoadingIdeas(true);
    setHasGenerated(true);

    // Simulate Vision processing delay
    // await new Promise(resolve => setTimeout(resolve, 2000));

    // Aggregate scattered parts into an inventory
    const detectedInventory: InventoryItem[] = [];
    const map = new Map<string, InventoryItem>();

    scatteredParts.forEach(sp => {
      if (map.has(sp.id)) {
        map.get(sp.id)!.quantity += 1;
      } else {
        map.set(sp.id, { part: sp, quantity: 1 });
      }
    });
    const finalInventory = Array.from(map.values());
    setInventory(finalInventory);

    try {
      const newIdeas = await generateBuildIdeas(finalInventory);
      setIdeas(newIdeas);
    } catch (error) {
      console.error(error);
      // Keep empty state or show toast
    } finally {
      setLoadingIdeas(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8">

        {/* Hero / Intro */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Vision-Powered <span className="text-blue-500">MOC Builder</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Simulate a camera scan of your LEGO table. Our AI identifies scattered parts via
            LDraw signatures and suggests creative builds using the detected inventory.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column: Input - Removed sticky to fix overlap issues */}
          <div className="w-full lg:w-1/3 space-y-6 z-10">
            <PartSelector
              parts={scatteredParts}
              onScatter={handleScatterParts}
              onAnalyze={handleAnalyzeAndGenerate}
              loading={loadingIdeas}
            />

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-500">
              <strong className="text-slate-400 block mb-1">Architecture Note:</strong>
              In a production environment, this canvas would be replaced by a live camera feed.
              Object detection models (YOLO/Gemini Vision) would return the bounding boxes and part IDs mapped to the LDraw database.
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="w-full lg:w-2/3">
            <IdeaGenerator
              inventory={inventory}
              ideas={ideas}
              loading={loadingIdeas}
              hasGenerated={hasGenerated}
            />
          </div>
        </div>

        {/* Database Advice Section */}
        <DbArchitectureGuide />

      </main>

      <footer className="w-full py-8 border-t border-slate-800 bg-slate-950 text-center text-slate-600 text-sm mt-12">
        <p>© {new Date().getFullYear()} BrickMind AI. Not affiliated with the LEGO Group.</p>
        <p>LDraw™ is a trademark of the LDraw.org. Rebrickable® is a trademark of Rebrickable.com.</p>
      </footer>
    </div>
  );
};

export default App;