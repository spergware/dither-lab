import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sun, 
  Moon, 
  Monitor, 
  Download, 
  ImagePlus, 
  SlidersHorizontal,
  Zap,
  Layers,
  MonitorSmartphone,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { DitherAlgorithm, ImageSettings, ProcessedStats } from '../types';
import { processImage } from '../utils/ditherAlgorithms';
import { Slider } from './ui/Slider';

const INITIAL_SETTINGS: ImageSettings = {
  resolutionScale: 1.0,
  brightness: 0,
  contrast: 0,
  algorithm: DitherAlgorithm.Atkinson
};

const DITHER_MODES = Object.values(DitherAlgorithm);

export default function App() {
  const { theme, setTheme } = useTheme();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<ImageSettings>(INITIAL_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ProcessedStats>({ width: 0, height: 0, processTimeMs: 0 });
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Image
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setSettings({ ...INITIAL_SETTINGS }); // Reset settings on new image
        setImageFile(file);
      };
      img.src = url;
    }
  };

  const triggerProcessing = useCallback(() => {
    if (!originalImage) return;
    setIsProcessing(true);

    // Use setTimeout to allow UI to update (show loading) before heavy processing
    setTimeout(() => {
      const startTime = performance.now();
      
      // Calculate target dimensions ensuring shortest side is 384px
      const { width: srcWidth, height: srcHeight } = originalImage;
      const aspectRatio = srcWidth / srcHeight;
      const TARGET_SHORT_SIDE = 384;

      let targetWidth, targetHeight;
      if (srcWidth < srcHeight) {
        // Portrait or Square
        targetWidth = TARGET_SHORT_SIDE;
        targetHeight = targetWidth / aspectRatio;
      } else {
        // Landscape
        targetHeight = TARGET_SHORT_SIDE;
        targetWidth = targetHeight * aspectRatio;
      }
      
      // Apply user resolution scale (e.g. 1.0 = 384px shortest side, 0.5 = 192px shortest side)
      const width = Math.max(1, Math.floor(targetWidth * settings.resolutionScale));
      const height = Math.max(1, Math.floor(targetHeight * settings.resolutionScale));
      
      // We need an offscreen canvas to get the scaled ImageData
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // Use Nearest Neighbor for retro effect
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'low';

      // Draw resized image
      ctx.drawImage(originalImage, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      // Process
      const processedData = processImage(
        imageData, 
        settings.algorithm, 
        settings.brightness, 
        settings.contrast
      );

      // Put back to main canvas for preview
      const mainCanvas = canvasRef.current;
      if (mainCanvas) {
        mainCanvas.width = width;
        mainCanvas.height = height;
        const mainCtx = mainCanvas.getContext('2d');
        if (mainCtx) {
          mainCtx.imageSmoothingEnabled = false;
          mainCtx.putImageData(processedData, 0, 0);
          setPreviewUrl(mainCanvas.toDataURL());
        }
      }

      const endTime = performance.now();
      setStats({
        width,
        height,
        processTimeMs: Math.round(endTime - startTime)
      });
      setIsProcessing(false);
    }, 50);
  }, [originalImage, settings]);

  // Auto-process when settings change (debounced slightly via Effect dependency)
  useEffect(() => {
    const timer = setTimeout(() => {
        triggerProcessing();
    }, 150);
    return () => clearTimeout(timer);
  }, [triggerProcessing]);

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.download = `dithered-${Date.now()}.png`;
      link.href = previewUrl;
      link.click();
    }
  };

  const handleReset = () => {
    // Reset parameters but keep the current algorithm
    setSettings(prev => ({
      ...INITIAL_SETTINGS,
      algorithm: prev.algorithm
    }));
  };

  // Header Component - Fixed height, not sticky overlapping
  const Header = () => (
    <header className="flex-none z-40 bg-surface/90 dark:bg-surface-dark-dim/90 backdrop-blur-md border-b border-outline-variant/30 px-4 md:px-6 py-3 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Layers className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 hidden sm:block">
          Dither <span className="text-primary">Lab</span>
        </h1>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:hidden">
          Dither <span className="text-primary">Lab</span>
        </h1>
      </div>
      
      <div className="flex bg-surface-container-high dark:bg-surface-dark-container rounded-full p-1 border border-outline-variant/30">
        {(['light', 'system', 'dark'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`p-2 rounded-full transition-all duration-200 ${
              theme === t 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title={`Switch to ${t} mode`}
          >
            {t === 'light' && <Sun size={18} />}
            {t === 'dark' && <Moon size={18} />}
            {t === 'system' && <Monitor size={18} />}
          </button>
        ))}
      </div>
    </header>
  );

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-surface dark:bg-surface-dark-dim transition-colors duration-300">
      <Header />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* 
            Image Viewport 
            flex-1: Takes remaining height.
            overflow-auto: Internal scrolling.
            Dynamic Padding: Uses large bottom padding when menu is open to ensure 
            image can be scrolled up above the panel.
        */}
        <div className={`
          flex-1 
          bg-surface-container dark:bg-[#050505] 
          overflow-auto 
          relative 
          flex flex-col items-center 
          p-4 md:p-8
          ${mobilePanelOpen ? 'pb-[60vh]' : 'pb-36'}
          md:pb-8
          transition-all duration-300 ease-in-out
        `}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Centering wrapper for content */}
          <div className="w-full flex-1 flex flex-col items-center justify-center min-h-min">
            {!originalImage ? (
              <div className="text-center flex flex-col items-center max-w-sm animate-in fade-in zoom-in duration-500 z-10">
                <div className="w-24 h-24 bg-surface-dim dark:bg-surface-dark-container rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-white/50 dark:border-white/5 transition-colors duration-300">
                  <ImageIcon className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Load a Photo</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed px-4">
                  Select an image from your library. We'll resize it automatically for the best retro dithering effect.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="group bg-primary hover:bg-primary/90 text-white dark:text-white px-8 py-4 rounded-full font-medium transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center gap-2"
                >
                  <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  Choose Image
                </button>
              </div>
            ) : (
              <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-300">
                <div className={`relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-black/10 dark:ring-white/10 bg-black transition-opacity ${isProcessing ? 'opacity-50' : 'opacity-100'} inline-block`}>
                  <canvas ref={canvasRef} className="hidden" />
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="block"
                      style={{ imageRendering: 'pixelated' }} 
                    />
                  )}
                </div>
                
                <div className="mt-4 text-center">
                    <div className="inline-block px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-mono text-slate-500 dark:text-slate-400 backdrop-blur-sm border border-black/5 dark:border-white/5">
                        {stats.width} x {stats.height}px • {stats.processTimeMs}ms
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 
            Desktop Sidebar 
            Hidden on mobile, visible on medium screens and up.
        */}
        <aside className={`
          hidden md:flex
          bg-surface dark:bg-surface-dark 
          border-l border-outline-variant/30 
          w-[360px] lg:w-[400px]
          flex-col shadow-xl z-20 transition-all duration-300 ease-in-out
          ${!originalImage ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}
        `}>
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
            <DesktopControls 
              fileInputRef={fileInputRef} 
              handleDownload={handleDownload} 
              settings={settings} 
              setSettings={setSettings} 
              handleReset={handleReset}
            />
          </div>
        </aside>

        {/* 
            Mobile Bottom Sheet 
            Visible only on mobile. Fixed at bottom.
            Uses auto height with max-height to fit content.
        */}
        <div className={`
          md:hidden fixed bottom-0 left-0 right-0 z-50
          bg-surface dark:bg-surface-dark-container
          rounded-t-3xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.15)]
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          flex flex-col
          max-h-[85dvh] h-auto
          ${!originalImage ? 'translate-y-[120%]' : ''}
        `}>
           {/* Handle / Header Area (Always Visible) */}
           <div 
             className="flex-none px-4 py-3 border-b border-outline-variant/20 flex items-center gap-3 bg-surface dark:bg-surface-dark-container rounded-t-3xl cursor-pointer"
             onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
           >
              {/* Expand Toggle Button */}
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                {mobilePanelOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
              </button>

              {/* Quick Actions (Always visible) */}
              <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
                 <button 
                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                   className="flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-dark border border-outline-variant/50 text-xs font-medium text-slate-700 dark:text-slate-200"
                 >
                   <ImagePlus size={16} /> <span>Change Image</span>
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                   className="flex-[1.5] whitespace-nowrap flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-on shadow-sm text-xs font-medium active:scale-95 transition-transform"
                 >
                   <Download size={16} /> Save Image
                 </button>
              </div>
           </div>

           {/* Scrollable Content (Visible when expanded) */}
           {mobilePanelOpen && (
             <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6 bg-surface dark:bg-surface-dark-container">
                <ControlsContent settings={settings} setSettings={setSettings} />
                
                <div className="pt-4 text-center">
                  <button 
                      onClick={handleReset}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-sm active:scale-95"
                  >
                    Reset All Settings
                  </button>
                </div>
             </div>
           )}
        </div>

      </main>

      {/* Hidden Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}

// Sub-components to avoid duplication
const ControlsContent = ({ settings, setSettings }: { 
  settings: ImageSettings, 
  setSettings: React.Dispatch<React.SetStateAction<ImageSettings>> 
}) => (
  <>
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <MonitorSmartphone size={16} className="text-primary" />
        Dither Mode
      </label>
      <div className="relative group">
        <select 
          value={settings.algorithm}
          onChange={(e) => setSettings(s => ({ ...s, algorithm: e.target.value as DitherAlgorithm }))}
          className="w-full appearance-none bg-surface-container-high dark:bg-surface-dark border-r-[12px] border-transparent outline outline-1 outline-outline-variant/50 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-primary cursor-pointer hover:bg-surface-dim dark:hover:bg-slate-800 transition-colors"
        >
          {DITHER_MODES.map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-primary transition-colors">
          <SlidersHorizontal size={14} className="rotate-90" />
        </div>
      </div>
    </div>

    <div className="space-y-6">
      <Slider 
        label="Resolution Scale"
        value={settings.resolutionScale * 100} 
        min={10}
        max={100}
        step={5}
        onChange={(val) => setSettings(s => ({...s, resolutionScale: val / 100}))} 
        formatValue={(v) => `${Math.round(v)}%`}
        icon={<Monitor size={16} />}
      />

      <Slider 
        label="Brightness"
        value={settings.brightness}
        min={-100}
        max={100}
        onChange={(val) => setSettings(s => ({...s, brightness: val}))}
        icon={<Sun size={16} />}
      />

      <Slider 
        label="Contrast"
        value={settings.contrast}
        min={-100}
        max={100}
        onChange={(val) => setSettings(s => ({...s, contrast: val}))}
        icon={<Zap size={16} />}
      />
    </div>
  </>
);

const DesktopControls = ({ fileInputRef, handleDownload, settings, setSettings, handleReset }: any) => (
  <>
    <div className="grid grid-cols-2 gap-3">
         <button 
           onClick={() => fileInputRef.current?.click()}
           className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-high dark:bg-surface-dark-container border border-outline-variant hover:bg-surface-dim dark:hover:bg-slate-800 text-sm font-medium transition-colors text-slate-700 dark:text-slate-200"
         >
           <ImagePlus size={16} /> <span>Change Image</span>
         </button>
         <button 
           onClick={handleDownload}
           className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-on hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 text-sm font-medium transition-all active:scale-95"
         >
           <Download size={16} /> Save
         </button>
    </div>

    <hr className="border-outline-variant/30" />
    
    <ControlsContent settings={settings} setSettings={setSettings} />

    <div className="pt-8 text-center border-t border-outline-variant/30 mt-auto">
       <button 
          onClick={handleReset}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-sm active:scale-95"
       >
         Reset All Settings
       </button>
    </div>
  </>
);