
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, Download, Sparkles, Wand2, Info, Layers, Printer, MousePointer2, Palette, AlertTriangle, X, Snowflake as SnowflakeIcon, FileCode, Box, Maximize2, Move } from 'lucide-react';
import { GeneratorSettings, Snowflake, AIThemeResponse } from './types';
import { generateBookmarkContent } from './services/snowflakeGenerator';
import { getThemedSettings } from './services/geminiService';
import { generateSTL } from './services/stlExporter';
import BookmarkPreview from './components/BookmarkPreview';

const DEFAULT_SETTINGS: GeneratorSettings = {
  width: 50,
  height: 150,
  numFlakes: 15,
  minSize: 2, 
  maxSize: 20, 
  complexity: 3,
  seed: Math.floor(Math.random() * 1000000),
  margin: 5,
  holeRadius: 3,
  thickness: 0.8, // Updated default
  flakeExtrusion: -0.3, // Updated default (Negative = Valley)
  minLineWidth: 0.8, // New default
  variety: 5,
  selectedType: 'random',
  exportFormat: 'svg',
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<GeneratorSettings>(DEFAULT_SETTINGS);
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const generate = useCallback(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => {
      const content = generateBookmarkContent(settings);
      setSnowflakes(content);
      setIsGenerating(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [settings]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleSettingChange = (key: keyof GeneratorSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleRandomizeSeed = () => {
    handleSettingChange('seed', Math.floor(Math.random() * 1000000));
  };

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const result: AIThemeResponse = await getThemedSettings(aiPrompt);
      setSettings(prev => ({
        ...prev,
        ...result.suggestedSettings
      }));
      setAiPrompt('');
    } catch (error) {
      console.error("AI Error:", error);
      alert("Failed to get AI suggestions. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExport = () => {
    const filename = `frostforge_${settings.seed}.${settings.exportFormat}`;
    if (settings.exportFormat === 'svg') {
      const svgElement = document.querySelector('svg');
      if (!svgElement) return;
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    } else {
      const stlContent = generateSTL(settings, snowflakes);
      const blob = new Blob([stlContent], { type: 'application/sla' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <aside className="w-full md:w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-8 shadow-sm z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">FrostForge</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">World-Class 3D Bookmark Generator</p>

        <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <label className="text-sm font-semibold flex items-center gap-2 text-blue-800">
            <Wand2 className="w-4 h-4" />
            AI Theme Generator
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 'Arctic Night'"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiAssist()}
            />
            <button
              onClick={handleAiAssist}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Settings</h2>
            <button onClick={handleRandomizeSeed} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium transition">
              <RefreshCw className="w-4 h-4" />
              Randomize
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Snowflake Style</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <SnowflakeIcon className="w-4 h-4 text-blue-500" />
                  Type
                </label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.selectedType}
                  onChange={(e) => handleSettingChange('selectedType', e.target.value)}
                >
                  <option value="random">Random (Natural Mix)</option>
                  <option value="stellar">Stellar (Classic)</option>
                  <option value="fern">Fern (Dendritic)</option>
                  <option value="plate">Plate (Solid)</option>
                  <option value="needle">Needle (Spiky)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex justify-between">
                  <span>Density (Count)</span>
                  <span className="text-slate-400 font-mono">{settings.numFlakes}</span>
                </label>
                <input type="range" min="1" max="50" className="w-full accent-blue-600" value={settings.numFlakes} onChange={(e) => handleSettingChange('numFlakes', parseInt(e.target.value))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Min Size (mm)</label>
                  <input type="number" step="0.5" className="w-full px-3 py-2 border rounded-lg text-sm" value={settings.minSize} onChange={(e) => handleSettingChange('minSize', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Max Size (mm)</label>
                  <input type="number" step="0.5" className="w-full px-3 py-2 border rounded-lg text-sm" value={settings.maxSize} onChange={(e) => handleSettingChange('maxSize', parseFloat(e.target.value))} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex justify-between">
                  <span>Complexity</span>
                  <span className="text-slate-400 font-mono">{settings.complexity}</span>
                </label>
                <input type="range" min="0" max="10" className="w-full accent-blue-600" value={settings.complexity} onChange={(e) => handleSettingChange('complexity', parseInt(e.target.value))} />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium flex justify-between">
                  <span>Min Line Width (mm)</span>
                  <span className="text-slate-400 font-mono">{settings.minLineWidth}</span>
                </label>
                <input 
                  type="range" 
                  min="0.6" 
                  max="2.0" 
                  step="0.1" 
                  className="w-full accent-blue-600" 
                  value={settings.minLineWidth} 
                  onChange={(e) => handleSettingChange('minLineWidth', parseFloat(e.target.value))} 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">3D / Print Settings</h3>
               <div className="space-y-2">
                <label className="text-sm font-medium flex justify-between">
                  <span>Base Thickness (mm)</span>
                  <span className="text-slate-400 font-mono">{settings.thickness}</span>
                </label>
                <input type="range" min="0.4" max="3" step="0.1" className="w-full accent-blue-600" value={settings.thickness} onChange={(e) => handleSettingChange('thickness', parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex justify-between">
                  <span>Flake Extrusion (mm)</span>
                  <span className="text-slate-400 font-mono">{settings.flakeExtrusion}</span>
                </label>
                <input type="range" min="-2" max="2" step="0.1" className="w-full accent-blue-600" value={settings.flakeExtrusion} onChange={(e) => handleSettingChange('flakeExtrusion', parseFloat(e.target.value))} />
                <p className="text-[10px] text-slate-400 italic leading-tight">Positive = Raised, Negative = Valley (Debossed).</p>
              </div>

               <div className="space-y-2 pt-2">
                 <label className="text-xs font-bold text-slate-400 uppercase">Format</label>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => handleSettingChange('exportFormat', 'svg')}
                     className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition ${settings.exportFormat === 'svg' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}
                   >
                     <FileCode className="w-4 h-4" /> SVG
                   </button>
                   <button 
                     onClick={() => handleSettingChange('exportFormat', 'stl')}
                     className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition ${settings.exportFormat === 'stl' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}
                   >
                     <Box className="w-4 h-4" /> STL
                   </button>
                 </div>
               </div>
            </div>
          </div>
        </section>

        <div className="pt-4 space-y-4">
          <button
            onClick={handleExport}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-95 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Export {settings.exportFormat.toUpperCase()}
          </button>
          
          <button onClick={() => setShowInfo(true)} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition">
            <Printer className="w-4 h-4" />
            Print Guide
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden relative">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-700">Live Preview</h2>
            <p className="text-sm text-slate-400">Seed: {settings.seed} | {settings.width}x{settings.height}mm</p>
          </div>
          <div className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest">
            {isGenerating ? 'Generating...' : 'Ready'}
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <BookmarkPreview settings={settings} snowflakes={snowflakes} />
          <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 bg-white/50 backdrop-blur px-3 py-1 rounded-full border border-slate-100">
            FrostForge v3.7 (Custom Line Width)
          </div>
        </div>

        {showInfo && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
              <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition">
                <X className="w-6 h-6 text-slate-400" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl"><Printer className="w-8 h-8 text-blue-600" /></div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Print Guide</h2>
                  <p className="text-slate-500">Mastering your FrostForge designs</p>
                </div>
              </div>
              <div className="space-y-6 text-sm text-slate-600">
                <p><strong>Watertight (Manifold) Exports:</strong> The v3.7 exporter uses strictly validated winding orders and greedy stitching to ensure 100% watertight STL files for 3D printing.</p>
                <p><strong>Nozzle Compatibility:</strong> Adjust the "Min Line Width" to match your nozzle (e.g., 0.6mm or 0.8mm) to ensure all features are thick enough to be printed.</p>
                <p><strong>Print settings:</strong> Use 100% infill for bookmarks. For valley designs, use a dark base and light top layer for high-contrast results.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
