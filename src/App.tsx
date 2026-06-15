import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown,
  Lock,
  Unlock,
  Move,
  UploadCloud,
  Trash2,
  Minus,
  Plus,
  Maximize,
  RefreshCw,
  Info,
  Terminal,
  Volume2,
  VolumeX,
  Heart,
  QrCode
} from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  width: number;
  height: number;
}

const WORKSPACE_SIZE = 5000;

import DonasiBarcode from './assets/Donasi/image.png';
import CaveBg from './assets/Stockbg/Cave-g.gif';
import DushBg from './assets/Stockbg/Dush-g.gif';
import HellBg from './assets/Stockbg/Hell-g.gif';

const stockBgs = [
  { name: 'Cave', src: CaveBg },
  { name: 'Dush-g', src: DushBg },
  { name: 'Hell-g', src: HellBg }
];

const defaultPresets: Preset[] = [
  { id: 'preset-1x', name: '1x', width: 487.9999999999997, height: 216 },
  { id: 'preset-125x', name: '1.25x', width: 609.333333333333, height: 216 }
];

export default function App() {
  // --- Cyber Deck Specific States ---
  const [theme, setTheme] = useState<'green' | 'amber' | 'pink' | 'blue'>(() => {
    return (localStorage.getItem('reso_theme') as any) || 'green';
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('reso_muted') === 'true';
  });
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isMouseInViewport, setIsMouseInViewport] = useState<boolean>(false);

  // --- Core States ---
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [left, setLeft] = useState<number>(0);
  const [top, setTop] = useState<number>(0);
  const [isRatioLocked, setIsRatioLocked] = useState<boolean>(false);
  const [ratio, setRatio] = useState<number>(1920 / 1080);
  const [preset, setPreset] = useState<string>('custom');
  const [zoom, setZoom] = useState<number>(50);

  // Saved custom presets state (persisted to localStorage)
  const [savedPresets, setSavedPresets] = useState<Preset[]>(() => {
    try {
      const stored = localStorage.getItem('reso_saved_presets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [newPresetName, setNewPresetName] = useState<string>('');

  // Background states
  const [bgType, setBgType] = useState<'color' | 'image' | 'gradient'>('color');
  const [bgColor] = useState<string>('#ffffff');
  const [bgGradient] = useState<string>('');
  const [bgImageSrc, setBgImageSrc] = useState<string>('');
  const [bgFileName, setBgFileName] = useState<string>('');
  const [bgFit, setBgFit] = useState<'cover' | 'contain' | 'stretch' | 'repeat'>('cover');
  const [bgBrightness, setBgBrightness] = useState<number>(100);

  // Drag states
  const [isResizeModeActive, setIsResizeModeActive] = useState<boolean>(false);
  const [prevWidth, setPrevWidth] = useState<number>(1920);
  const [prevHeight, setPrevHeight] = useState<number>(1080);
  const [prevLeft, setPrevLeft] = useState<number>(0);
  const [prevTop, setPrevTop] = useState<number>(0);
  const [hasUserMovedCanvas, setHasUserMovedCanvas] = useState<boolean>(false);

  // Sidebar Open/Close toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Grid/View options
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showShadow, setShowShadow] = useState<boolean>(true);

  // Donation Modal states
  const [isDonateOpen, setIsDonateOpen] = useState<boolean>(false);

  // Slideshow States
  const [isSlideshowActive, setIsSlideshowActive] = useState<boolean>(false);
  const [slideshowInterval, setSlideshowInterval] = useState<number>(10);
  const [slideshowUnit, setSlideshowUnit] = useState<'sec' | 'min'>('sec');

  // Ref to the viewport container for autoFit sizing
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('reso_saved_presets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  useEffect(() => {
    localStorage.setItem('reso_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reso_muted', isMuted ? 'true' : 'false');
  }, [isMuted]);

  // Switch background immediately when slideshow is activated if it's not already a stock background
  useEffect(() => {
    if (isSlideshowActive) {
      const isCurrentStock = stockBgs.some(bg => bg.src === bgImageSrc);
      if (!isCurrentStock && stockBgs.length > 0) {
        setBgImageSrc(stockBgs[0].src);
        setBgFileName(stockBgs[0].name);
        setBgType('image');
      }
    }
  }, [isSlideshowActive]);

  // Background Auto Rotate Slideshow Hook
  useEffect(() => {
    if (!isSlideshowActive) return;

    const intervalMs = slideshowUnit === 'sec' ? slideshowInterval * 1000 : slideshowInterval * 60 * 1000;
    if (intervalMs <= 0) return;

    const timer = setInterval(() => {
      // Find current index in stockBgs
      const currentIndex = stockBgs.findIndex(bg => bg.src === bgImageSrc);
      const nextIndex = (currentIndex + 1) % stockBgs.length;
      const nextBg = stockBgs[nextIndex];
      
      setBgImageSrc(nextBg.src);
      setBgFileName(nextBg.name);
      setBgType('image');
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSlideshowActive, slideshowInterval, slideshowUnit, bgImageSrc]);

  // --- Web Audio Synth Engines ---
  const playAudioTone = (frequency: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08) => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) { }
  };

  const playClickSound = () => {
    // Mechanical keyboard keypress sound (combination of high tone click and slight low pop)
    playAudioTone(1800, 0.03, 'triangle', 0.04);
    setTimeout(() => playAudioTone(900, 0.015, 'sine', 0.02), 5);
  };

  const playBeepSound = () => {
    // Standard retro terminal beep
    playAudioTone(880, 0.08, 'sine', 0.06);
  };

  const playSuccessSound = () => {
    // Rising sci-fi scale chime
    const scale = [523.25, 659.25, 783.99, 1046.50];
    scale.forEach((freq, idx) => {
      setTimeout(() => {
        playAudioTone(freq, 0.12, 'sine', 0.04);
      }, idx * 60);
    });
  };

  /*
  const playBootChime = () => {
    // Retro chord chime for boot sequence completion
    const chords = [261.63, 329.63, 392.00, 523.25, 659.25];
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        playAudioTone(freq, 0.6, 'triangle', 0.03);
      }, idx * 45);
    });
  };

  const playStartupSound = () => {
    // Initial engagement synth slide
    playAudioTone(110, 0.5, 'sawtooth', 0.03);
    setTimeout(() => {
      playAudioTone(440, 0.3, 'sine', 0.05);
    }, 150);
  };
  */

  // Keyboard click sound helper for input typing
  const playKeyboardClick = () => {
    playAudioTone(1400 + Math.random() * 400, 0.02, 'sine', 0.02);
  };

  // Greatest Common Divisor helper for aspect ratio text
  const gcd = (a: number, b: number): number => {
    return b ? gcd(b, a % b) : a;
  };

  const getRatioText = useCallback((w: number, h: number): string => {
    const divisor = gcd(w, h);
    const rWidth = w / divisor;
    const rHeight = h / divisor;
    if (rWidth > 20 || rHeight > 20) {
      return (w / h).toFixed(2);
    }
    return `${rWidth}:${rHeight}`;
  }, []);

  // --- Center Canvas positioning logic inside 5000px workspace ---
  const centerCanvas = useCallback((targetW = width, targetH = height, targetZoom = zoom) => {
    const scale = targetZoom / 100;
    const scaledW = targetW * scale;
    const scaledH = targetH * scale;

    const newLeft = (WORKSPACE_SIZE - scaledW) / 2;
    const newTop = (WORKSPACE_SIZE - scaledH) / 2;

    setLeft(newLeft);
    setTop(newTop);
  }, [width, height, zoom]);

  // Scroll viewport container to focus on the centered canvas
  const scrollCanvasIntoView = useCallback((targetW = width, targetH = height, targetZoom = zoom) => {
    const viewportElement = document.getElementById('viewport');
    if (!viewportElement) return;

    const scale = targetZoom / 100;
    const scaledW = targetW * scale;
    const scaledH = targetH * scale;

    const canvasCenterX = (WORKSPACE_SIZE - scaledW) / 2 + scaledW / 2;
    const canvasCenterY = (WORKSPACE_SIZE - scaledH) / 2 + scaledH / 2;

    const scrollLeft = canvasCenterX - viewportElement.clientWidth / 2;
    const scrollTop = canvasCenterY - viewportElement.clientHeight / 2;

    viewportElement.scrollLeft = scrollLeft;
    viewportElement.scrollTop = scrollTop;
  }, [width, height, zoom]);

  // --- Auto Fit Scaling logic ---
  const autoFit = useCallback((targetW = width, targetH = height, force = false) => {
    if (hasUserMovedCanvas && !force) return;
    if (!viewportRef.current) return;
    const viewportWidth = viewportRef.current.clientWidth;
    const viewportHeight = viewportRef.current.clientHeight;

    const availW = viewportWidth - 80;
    const availH = viewportHeight - 80;

    if (availW <= 0 || availH <= 0) return;

    const scaleX = availW / targetW;
    const scaleY = availH / targetH;
    const optimalScale = Math.min(scaleX, scaleY);

    let fitZoom = Math.floor((optimalScale * 100) / 5) * 5;
    fitZoom = Math.max(10, Math.min(150, fitZoom));
    setZoom(fitZoom);
    centerCanvas(targetW, targetH, fitZoom);
  }, [width, height, hasUserMovedCanvas, centerCanvas]);

  // Keep refs of functions to avoid re-triggering resize hooks on state change
  const autoFitRef = useRef(autoFit);
  const scrollCanvasIntoViewRef = useRef(scrollCanvasIntoView);

  useEffect(() => {
    autoFitRef.current = autoFit;
    scrollCanvasIntoViewRef.current = scrollCanvasIntoView;
  }, [autoFit, scrollCanvasIntoView]);

  // Handle window resizing to keep fit ratio updated
  useEffect(() => {
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        autoFitRef.current();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Initial autofit and scroll center on page mount
  useEffect(() => {
    const initTimeout = setTimeout(() => {
      autoFitRef.current(1920, 1080, true);
      scrollCanvasIntoViewRef.current(1920, 1080);
    }, 200);
    return () => clearTimeout(initTimeout);
  }, []);

  // Auto-center canvas on zoom changes when the user hasn't moved the canvas manually
  useEffect(() => {
    if (!hasUserMovedCanvas) {
      centerCanvas();
    }
  }, [zoom, hasUserMovedCanvas, centerCanvas]);

  // Listen to keyboard shortcut Ctrl+B to toggle sidebar controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        playClickSound();
        setIsSidebarOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted]);

  // Adjust dimension inputs safely
  const handleWidthChange = (val: number) => {
    const newW = Math.max(100, Math.min(8000, val));
    setWidth(newW);
    let newH = height;
    if (isRatioLocked) {
      newH = Math.max(100, Math.min(8000, Math.round(newW / ratio)));
      setHeight(newH);
    }
  };

  const handleHeightChange = (val: number) => {
    const newH = Math.max(100, Math.min(8000, val));
    setHeight(newH);
    let newW = width;
    if (isRatioLocked) {
      newW = Math.max(100, Math.min(8000, Math.round(newH * ratio)));
      setWidth(newW);
    }
  };

  // Toggle Aspect Ratio Locking
  const toggleRatioLock = () => {
    playClickSound();
    if (!isRatioLocked) {
      setRatio(width / height);
    }
    setIsRatioLocked(!isRatioLocked);
  };

  // Handle Preset dropdown choices
  const selectPreset = (val: string) => {
    playClickSound();
    if (val === 'custom') {
      startResizeMode();
      return;
    }

    const allPresets = [...defaultPresets, ...savedPresets];
    const p = allPresets.find(item => item.id === val);
    if (!p) return;

    setIsResizeModeActive(false);
    setWidth(p.width);
    setHeight(p.height);
    setRatio(p.width / p.height);
    setPreset(p.id);
  };

  // Dynamic preset manager helper functions
  const addCurrentAsPreset = () => {
    playSuccessSound();
    const name = newPresetName.trim() || `Custom ${width}x${height}`;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      width,
      height
    };
    setSavedPresets(prev => [...prev, newPreset]);
    setPreset(newPreset.id);
    setNewPresetName('');
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playBeepSound();
    setSavedPresets(prev => prev.filter(p => p.id !== id));
    if (preset === id) {
      setPreset('custom');
    }
  };

  // --- Resize drag modes ---
  const startResizeMode = () => {
    playClickSound();
    setPrevWidth(width);
    setPrevHeight(height);
    setPrevLeft(left);
    setPrevTop(top);
    setIsResizeModeActive(true);
    setPreset('custom');
  };

  const cancelResizeMode = () => {
    playBeepSound();
    setWidth(prevWidth);
    setHeight(prevHeight);
    setLeft(prevLeft);
    setTop(prevTop);
    setIsResizeModeActive(false);

    let matchedPreset = 'custom';
    for (const p of savedPresets) {
      if (p.width === prevWidth && p.height === prevHeight) {
        matchedPreset = p.id;
        break;
      }
    }
    setPreset(matchedPreset);
  };

  const applyResizeMode = () => {
    playSuccessSound();
    setIsResizeModeActive(false);
    setRatio(width / height);

    let matchedPreset = 'custom';
    for (const p of savedPresets) {
      if (p.width === width && p.height === height) {
        matchedPreset = p.id;
        break;
      }
    }
    setPreset(matchedPreset);
  };

  // --- Resizing Mouse Drag Handler ---
  const startDrag = (e: React.MouseEvent | React.TouchEvent, handleType: 'r' | 'l' | 'b' | 't' | 'tr' | 'tl' | 'br' | 'bl') => {
    e.preventDefault();
    e.stopPropagation();

    if (!isResizeModeActive) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const startW = width;
    const startH = height;
    const startLeft = left;
    const startTop = top;
    const startX = clientX;
    const startY = clientY;
    const scaleFactor = zoom / 100;

    let cursorClass = 'dragging-ew';
    if (handleType === 'b' || handleType === 't') cursorClass = 'dragging-ns';
    if (handleType === 'br' || handleType === 'tl') cursorClass = 'dragging-nwse';
    if (handleType === 'tr' || handleType === 'bl') cursorClass = 'dragging-nesw';
    document.body.classList.add(cursorClass);

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = (currentX - startX) / scaleFactor;
      const deltaY = (currentY - startY) / scaleFactor;

      let newWidth = startW;
      let newHeight = startH;

      if (['r', 'tr', 'br'].includes(handleType)) {
        newWidth = startW + deltaX;
      } else if (['l', 'tl', 'bl'].includes(handleType)) {
        newWidth = startW - deltaX;
      }

      if (['b', 'bl', 'br'].includes(handleType)) {
        newHeight = startH + deltaY;
      } else if (['t', 'tl', 'tr'].includes(handleType)) {
        newHeight = startH - deltaY;
      }

      newWidth = Math.max(100, Math.min(8000, newWidth));
      newHeight = Math.max(100, Math.min(8000, newHeight));

      if (isRatioLocked) {
        if (handleType === 't' || handleType === 'b') {
          newWidth = Math.round(newHeight * ratio);
        } else {
          newHeight = Math.round(newWidth / ratio);
        }

        newWidth = Math.max(100, Math.min(8000, newWidth));
        newHeight = Math.max(100, Math.min(8000, newHeight));
      }

      const dW = newWidth - startW;
      const dH = newHeight - startH;

      let newLeft = startLeft;
      let newTop = startTop;

      if (['l', 'tl', 'bl'].includes(handleType)) {
        newLeft = startLeft - dW * scaleFactor;
      }
      if (['t', 'tl', 'tr'].includes(handleType)) {
        newTop = startTop - dH * scaleFactor;
      }

      setWidth(newWidth);
      setHeight(newHeight);
      setLeft(newLeft);
      setTop(newTop);
      setHasUserMovedCanvas(true);
    };

    const handleMouseUp = () => {
      document.body.classList.remove('dragging-ew', 'dragging-ns', 'dragging-nwse', 'dragging-nesw');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  };

  // --- Resizing / Dragging canvas to move ---
  const startMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const startLeft = left;
    const startTop = top;
    const startX = clientX;
    const startY = clientY;

    document.body.classList.add('dragging-move');

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      setLeft(startLeft + deltaX);
      setTop(startTop + deltaY);
      setHasUserMovedCanvas(true);
    };

    const handleMouseUp = () => {
      document.body.classList.remove('dragging-move');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  };

  // --- Viewport coordinate tracking ---
  const handleViewportMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left + e.currentTarget.scrollLeft);
    const y = Math.round(e.clientY - rect.top + e.currentTarget.scrollTop);
    setCoords({ x, y });
  };

  // --- Local File Upload Handler ---
  const processFile = (file: File) => {
    if (!file || !file.type.match('image.*')) {
      alert('Silakan unggah file gambar saja!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setBgImageSrc(e.target.result);
        setBgFileName(file.name);
        setBgType('image');
        playSuccessSound();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeBgImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    playBeepSound();
    setBgImageSrc('');
    setBgFileName('');
    setBgType('color');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /*
  // --- Offscreen Canvas High-Res Export Engine ---
  const handleExport = () => {
    playSuccessSound();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply brightness filter to the canvas context
    ctx.filter = `brightness(${bgBrightness}%)`;

    if (bgType === 'color') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.filter = 'none'; // reset filter
      triggerDownload(canvas);
    } else if (bgType === 'gradient' && bgGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      const matches = bgGradient.match(/#[a-fA-F0-9]{3,8}/g);
      if (matches && matches.length >= 2) {
        grad.addColorStop(0, matches[0]);
        grad.addColorStop(1, matches[1]);
      } else {
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#a855f7');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.filter = 'none'; // reset filter
      triggerDownload(canvas);
    } else if (bgType === 'image' && bgImageSrc) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const imgW = img.width;
        const imgH = img.height;
        const imgRatio = imgW / imgH;
        const canvasRatio = width / height;

        if (bgFit === 'stretch') {
          ctx.drawImage(img, 0, 0, width, height);
        } else if (bgFit === 'contain') {
          let drawW, drawH, drawX, drawY;
          if (imgRatio > canvasRatio) {
            drawW = width;
            drawH = width / imgRatio;
            drawX = 0;
            drawY = (height - drawH) / 2;
          } else {
            drawW = height * imgRatio;
            drawH = height;
            drawX = (width - drawW) / 2;
            drawY = 0;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else if (bgFit === 'repeat') {
          const pattern = ctx.createPattern(img, 'repeat');
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, width, height);
          }
        } else {
          let sourceX = 0, sourceY = 0, sourceW = imgW, sourceH = imgH;
          if (imgRatio > canvasRatio) {
            sourceW = imgH * canvasRatio;
            sourceX = (imgW - sourceW) / 2;
          } else {
            sourceH = imgW / canvasRatio;
            sourceY = (imgH - sourceH) / 2;
          }
          ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, width, height);
        }
        ctx.filter = 'none'; // reset filter
        triggerDownload(canvas);
      };
      img.src = bgImageSrc;
    }
  };

  const triggerDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `resocraft-canvas-${width}x${height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  */

  // --- Main System Dashboard ---
  return (
    <div className={`flex h-screen w-screen bg-[#000000] text-slate-200 font-mono select-none theme-${theme}`}>

      {/* Sidebar Controls (Terminal HUD panels) */}
      <aside
        className={`bg-[#05070a] border-r border-term-primary/20 flex flex-col z-50 shrink-0 transition-all duration-300 relative crt-panel-effect ${isSidebarOpen ? 'w-[380px] opacity-100' : 'w-0 opacity-0 overflow-hidden pointer-events-none'
          }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-term-primary/20 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-term-primary flex items-center justify-center bg-term-dim">
                <Terminal className="w-5 h-5 text-term-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="font-bold text-sm tracking-widest text-term-primary">Custom Background</h1>
                  <span className="w-2.5 h-4 bg-term-primary terminal-blink" />
                </div>
                <p className="text-[9px] text-term-primary/50">SYSTEM_BACKGROUND // sugaB v9.2</p>
              </div>
            </div>

            {/* Top controls: Mute & Color Switchers */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-7 h-7 border border-term-primary/30 flex items-center justify-center text-term-primary hover:bg-term-dim transition-all focus:outline-none"
                title={isMuted ? "Unmute Synths" : "Mute Synths"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Theme Quick Selector Buttons */}
          <div className="flex items-center justify-between mt-4 border-t border-term-primary/10 pt-3">
            <span className="text-[8px] text-term-primary/40 uppercase font-bold">[term.theme_selection]</span>
            <div className="flex gap-1.5">
              {(['green', 'amber', 'pink', 'blue'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    playSuccessSound();
                    setTheme(t);
                  }}
                  className={`w-4 h-4 border transition-all relative ${theme === t ? 'border-term-primary scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  style={{
                    backgroundColor: t === 'green' ? '#00ff66' : t === 'amber' ? '#ffb000' : t === 'pink' ? '#ff007f' : '#00d2ff'
                  }}
                  title={`Swap to ${t.toUpperCase()}`}
                >
                  {theme === t && (
                    <span className="absolute inset-0.5 bg-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Scrollable Contents */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin">

          {/* Donate Section (Sticky at the top) */}
          <div className="sticky top-0 z-20 bg-[#05070a] pb-3 -mt-1 pt-1">
            <button
              onClick={() => {
                playSuccessSound();
                setIsDonateOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 border border-yellow-500/40 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all py-3 px-4 text-xs font-bold select-none focus:outline-none animate-pulse hover:animate-none group shadow-[0_0_10px_rgba(250,174,43,0.15)] hover:shadow-[0_0_20px_rgba(250,174,43,0.4)]"
            >
              <Heart className="w-4 h-4 fill-current animate-bounce group-hover:scale-110" />
              <span className="font-extrabold uppercase">Donate // Support</span>
            </button>
          </div>

          {/* Section 1: Resolution controls */}
          <section className="flex flex-col gap-4 border border-term-primary/20 p-4 bg-black/80 relative">
            <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#05070a] px-2 text-[8px] text-term-primary/40 uppercase tracking-wider">
              [sys.config.resolution]
            </div>

            <h2 className="font-bold text-xs tracking-wide text-term-primary flex items-center gap-1.5">
              &gt; setResolution()
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-term-primary/60 font-mono">import presets from &apos;templates&apos;;</label>
              <div className="relative">
                <select
                  value={preset}
                  onChange={(e) => selectPreset(e.target.value)}
                  className="w-full bg-black border border-term-primary/30 text-xs py-2 px-3 pr-10 text-term-primary outline-none cursor-pointer appearance-none focus:border-term-primary"
                >
                  <option value="custom" className="bg-black text-term-primary">&gt; CUSTOM_RESOLUSI</option>
                  {defaultPresets.map((p) => (
                    <option key={p.id} value={p.id} className="bg-black text-term-primary">
                      &gt; {p.name.toUpperCase()} ({p.width.toFixed(2)}x{p.height})
                    </option>
                  ))}
                  {savedPresets.map((p) => (
                    <option key={p.id} value={p.id} className="bg-black text-term-primary">
                      &gt; {p.name.toUpperCase()} ({p.width}x{p.height})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-term-primary pointer-events-none" />
              </div>
            </div>

            {/* Save Current Preset Section */}
            <div className="flex flex-col gap-1.5 border-t border-term-primary/10 pt-3 mt-1">
              <label className="text-[9px] text-term-primary/60 font-mono">saveCurrentResolution():</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => {
                    setNewPresetName(e.target.value);
                    playKeyboardClick();
                  }}
                  placeholder="PRESET_NAME"
                  className="flex-1 bg-black border border-term-primary/30 py-1.5 px-2.5 text-xs text-term-primary outline-none placeholder:text-term-primary/30 focus:border-term-primary"
                />
                <button
                  onClick={addCurrentAsPreset}
                  className="bg-term-primary hover:bg-white text-black text-[10px] font-bold px-3 transition-all border border-term-primary active:scale-95"
                >
                  SAVE
                </button>
              </div>
            </div>

            {/* Saved Presets List */}
            {savedPresets.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-[9px] text-term-primary/60 font-mono">savedPresets.list =</label>
                <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto border border-term-primary/15 p-1 bg-black/40 scrollbar-thin">
                  {savedPresets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectPreset(p.id)}
                      className={`flex items-center justify-between text-[10px] px-2 py-1 cursor-pointer transition-all ${preset === p.id
                        ? 'bg-term-dim text-term-primary border border-term-primary/30'
                        : 'text-term-primary/70 hover:text-term-primary hover:bg-white/5 border border-transparent'
                        }`}
                    >
                      <span className="truncate max-w-[180px]">{p.name} ({p.width}x{p.height})</span>
                      <button
                        onClick={(e) => deletePreset(p.id, e)}
                        className="text-red-500 hover:text-red-400 p-0.5 hover:bg-red-500/10 transition-all focus:outline-none"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[9px] text-term-primary/60 font-mono">let width =</label>
                <div className="flex items-center bg-black border border-term-primary/30 focus-within:border-term-primary">
                  <span className="pl-3 text-[10px] text-term-primary/40 select-none">$</span>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => {
                      handleWidthChange(parseInt(e.target.value) || 0);
                      playKeyboardClick();
                    }}
                    min="100"
                    max="8000"
                    className="w-full bg-transparent border-none py-2 px-2 text-xs text-term-primary outline-none"
                  />
                  <span className="pr-3 text-[8px] text-term-primary/40 select-none">px</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[9px] text-term-primary/60 font-mono">let height =</label>
                <div className="flex items-center bg-black border border-term-primary/30 focus-within:border-term-primary">
                  <span className="pl-3 text-[10px] text-term-primary/40 select-none">$</span>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      handleHeightChange(parseInt(e.target.value) || 0);
                      playKeyboardClick();
                    }}
                    min="100"
                    max="8000"
                    className="w-full bg-transparent border-none py-2 px-2 text-xs text-term-primary outline-none"
                  />
                  <span className="pr-3 text-[8px] text-term-primary/40 select-none">px</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={toggleRatioLock}
                className={`flex items-center gap-2 py-1.5 px-3 border text-[9px] font-mono transition-all ${isRatioLocked
                  ? 'border-term-primary bg-term-dim text-term-primary shadow-[0_0_8px_var(--term-primary-glow)]'
                  : 'border-term-primary/20 bg-transparent text-slate-500 hover:text-term-primary hover:border-term-primary/40'
                  }`}
              >
                {isRatioLocked ? <Lock className="w-3.5 h-3.5 text-term-primary" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isRatioLocked ? 'const LOCK_RATIO = true;' : 'const LOCK_RATIO = false;'}</span>
              </button>
            </div>

            <button
              onClick={() => isResizeModeActive ? applyResizeMode() : startResizeMode()}
              className={`w-full py-2.5 font-bold text-xs tracking-widest flex items-center justify-center gap-2 transition-all border ${isResizeModeActive
                ? 'bg-term-primary hover:bg-term-primary/90 text-black border-term-primary shadow-[0_0_15px_var(--term-primary-glow)]'
                : 'bg-transparent text-term-primary border-term-primary/30 hover:border-term-primary hover:bg-term-dim'
                }`}
            >
              <Move className="w-4 h-4" />
              <span>{isResizeModeActive ? 'APPLY_CHANGES' : 'DRAG_RESIZE_MODE'}</span>
            </button>
          </section>

          {/* Section 2: Background Customizer */}
          <section className="flex flex-col gap-4 border border-term-primary/20 p-4 bg-black/80 relative">
            <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#05070a] px-2 text-[8px] text-term-primary/40 uppercase tracking-wider">
              [sys.config.background]
            </div>

            <h2 className="font-bold text-xs tracking-wide text-term-primary flex items-center gap-1.5">
              &gt; setBackground()
            </h2>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                playClickSound();
                fileInputRef.current?.click();
              }}
              className={`border border-dashed p-5 text-center cursor-pointer relative transition-all bg-black ${isDragOver ? 'border-term-primary bg-term-dim shadow-[0_0_12px_var(--term-primary-glow)]' : 'border-term-primary/30 hover:border-term-primary/60 hover:bg-term-dim'
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.length && processFile(e.target.files[0])}
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              {!bgImageSrc ? (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-8 h-8 text-term-primary opacity-70 transition-transform hover:-translate-y-0.5" />
                  <p className="text-[9px] text-slate-300">DRAG & DROP IMAGE OR <span className="text-term-primary underline">BROWSE</span></p>
                  <p className="text-[8px] text-term-primary/40">TYPES: PNG, JPG, WEBP</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-black/95 p-2 border border-term-primary/20">
                    <span className="text-[10px] text-term-primary truncate max-w-[200px]">{bgFileName}</span>
                    <button
                      onClick={removeBgImage}
                      className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-400/20"
                      title="Remove Background"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Image Fit Option */}
            {bgType === 'image' && bgImageSrc && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] text-term-primary/60">bg.style = </label>
                <div className="relative">
                  <select
                    value={bgFit}
                    onChange={(e: any) => {
                      playClickSound();
                      setBgFit(e.target.value);
                    }}
                    className="w-full bg-black border border-term-primary/30 py-2 px-3 pr-10 text-xs text-term-primary outline-none cursor-pointer appearance-none focus:border-term-primary"
                  >
                    <option value="cover" className="bg-black text-term-primary">&gt; COVER (FILL & CROP)</option>
                    <option value="contain" className="bg-black text-term-primary">&gt; CONTAIN (FIT WHOLE)</option>
                    <option value="stretch" className="bg-black text-term-primary">&gt; STRETCH (STRETCH TO FILL)</option>
                    <option value="repeat" className="bg-black text-term-primary">&gt; REPEAT (TILE CODES)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-term-primary pointer-events-none" />
                </div>
              </div>
            )}

            {/* Stock Background Presets */}
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[9px] text-term-primary/60 font-mono">bg.presets = [stock_bg]</label>
              <div className="grid grid-cols-3 gap-2 border border-term-primary/20 p-2 bg-black/50">
                {stockBgs.map((bg, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      playClickSound();
                      setBgImageSrc(bg.src);
                      setBgFileName(bg.name);
                      setBgType('image');
                    }}
                    className={`relative aspect-[16/10] border p-1 bg-black/40 flex flex-col justify-between items-center transition-all group overflow-hidden ${bgImageSrc === bg.src && bgType === 'image'
                      ? 'border-term-primary text-term-primary shadow-[0_0_8px_var(--term-primary-glow)] bg-term-dim'
                      : 'border-term-primary/20 text-term-primary/60 hover:border-term-primary/50 hover:text-term-primary'
                      }`}
                    title={`Load background: ${bg.name}`}
                  >
                    {/* Thumbnail Preview */}
                    <img
                      src={bg.src}
                      alt={bg.name}
                      className="w-full h-8 object-cover border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <span className="text-[8px] font-mono mt-1 font-bold tracking-wider">{bg.name.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Rotate Background */}
            <div className="flex flex-col gap-2 border-t border-term-primary/10 pt-3 mt-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isSlideshowActive}
                    onChange={(e) => {
                      playClickSound();
                      setIsSlideshowActive(e.target.checked);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 border transition-colors duration-200 ${isSlideshowActive ? 'bg-term-dim border-term-primary' : 'bg-black border-term-primary/20'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 transition-transform duration-200 ${isSlideshowActive ? 'translate-x-5 bg-term-primary' : 'translate-x-0 bg-term-primary/30'}`} />
                  </div>
                </div>
                <span className="text-[9px] text-term-primary/60 font-mono">bg.autoRotate = {isSlideshowActive ? 'true' : 'false'};</span>
              </label>

              {isSlideshowActive && (
                <div className="flex items-center gap-2 mt-1 pl-1">
                  <label className="text-[9px] text-term-primary/60 font-mono">interval =</label>
                  <div className="flex items-center bg-black border border-term-primary/30 focus-within:border-term-primary w-16">
                    <input
                      type="number"
                      value={slideshowInterval}
                      min="1"
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setSlideshowInterval(val);
                      }}
                      className="w-full bg-transparent border-none py-1 px-1.5 text-[10px] text-term-primary outline-none"
                    />
                  </div>
                  <select
                    value={slideshowUnit}
                    onChange={(e: any) => {
                      playClickSound();
                      setSlideshowUnit(e.target.value);
                    }}
                    className="bg-black border border-term-primary/30 text-[9px] py-1 px-1 text-term-primary outline-none cursor-pointer focus:border-term-primary"
                  >
                    <option value="sec">SEC</option>
                    <option value="min">MIN</option>
                  </select>
                </div>
              )}
            </div>

            {/* Background Brightness Slider */}
            <div className="flex flex-col gap-2 border-t border-term-primary/10 pt-3">
              <div className="flex justify-between items-center text-[9px] text-term-primary/60 font-mono">
                <span>bg.brightness =</span>
                <span className="font-semibold text-term-primary">{bgBrightness}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    playClickSound();
                    setBgBrightness(b => Math.max(0, b - 10));
                  }}
                  className="w-7 h-7 bg-black border border-term-primary/30 flex items-center justify-center text-term-primary hover:bg-term-dim hover:border-term-primary transition-all focus:outline-none"
                  title="Decrease Brightness"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={bgBrightness}
                  onChange={(e) => {
                    setBgBrightness(parseInt(e.target.value));
                    if (Math.random() > 0.7) playKeyboardClick();
                  }}
                  className="zoom-slider"
                />
                <button
                  onClick={() => {
                    playClickSound();
                    setBgBrightness(b => Math.min(200, b + 10));
                  }}
                  className="w-7 h-7 bg-black border border-term-primary/30 flex items-center justify-center text-term-primary hover:bg-term-dim hover:border-term-primary transition-all focus:outline-none"
                  title="Increase Brightness"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: View Settings */}
          <section className="flex flex-col gap-4 border border-term-primary/20 p-4 bg-black/80 relative">
            <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#05070a] px-2 text-[8px] text-term-primary/40 uppercase tracking-wider">
              [sys.view.options]
            </div>

            <h2 className="font-bold text-xs tracking-wide text-term-primary flex items-center gap-1.5">
              &gt; viewSettings()
            </h2>

            {/* Zoom Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[9px] text-term-primary/60 font-mono">
                <span>viewport.zoom =</span>
                <span className="font-semibold text-term-primary">{zoom}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    playClickSound();
                    setZoom(z => Math.max(10, z - 10));
                  }}
                  className="w-7 h-7 bg-black border border-term-primary/30 flex items-center justify-center text-term-primary hover:bg-term-dim hover:border-term-primary transition-all"
                  title="Zoom Out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={zoom}
                  onChange={(e) => {
                    setZoom(parseInt(e.target.value));
                    if (Math.random() > 0.7) playKeyboardClick();
                  }}
                  className="zoom-slider"
                />
                <button
                  onClick={() => {
                    playClickSound();
                    setZoom(z => Math.min(200, z + 10));
                  }}
                  className="w-7 h-7 bg-black border border-term-primary/30 flex items-center justify-center text-term-primary hover:bg-term-dim hover:border-term-primary transition-all"
                  title="Zoom In"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex justify-between mt-1 flex-wrap gap-2 text-[9px] font-mono">
                <button
                  onClick={() => {
                    playBeepSound();
                    setHasUserMovedCanvas(false);
                    autoFit(width, height, true);
                    setTimeout(() => scrollCanvasIntoView(width, height), 50);
                  }}
                  className="text-term-primary hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <Maximize className="w-3 h-3" /> [FIT_SCREEN]
                </button>
                <button
                  onClick={() => {
                    playBeepSound();
                    setHasUserMovedCanvas(false);
                    centerCanvas(width, height, zoom);
                    scrollCanvasIntoView(width, height, zoom);
                  }}
                  className="text-term-primary hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <RefreshCw className="w-3 h-3" /> [RECENTER]
                </button>
                <button
                  onClick={() => {
                    playBeepSound();
                    setZoom(100);
                    setHasUserMovedCanvas(false);
                    centerCanvas(width, height, 100);
                    scrollCanvasIntoView(width, height, 100);
                  }}
                  className="text-term-primary hover:underline flex items-center gap-1 focus:outline-none"
                >
                  [100%_SIZE]
                </button>
              </div>
            </div>

            {/* Layout Toggles */}
            <div className="flex flex-col gap-3 mt-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => {
                      playClickSound();
                      setShowGrid(e.target.checked);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 border transition-colors duration-200 ${showGrid ? 'bg-term-dim border-term-primary' : 'bg-black border-term-primary/20'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 transition-transform duration-200 ${showGrid ? 'translate-x-5 bg-term-primary' : 'translate-x-0 bg-term-primary/30'}`} />
                  </div>
                </div>
                <span className="text-[9px] text-term-primary/60 font-mono">viewport.showGrid = true;</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showShadow}
                    onChange={(e) => {
                      playClickSound();
                      setShowShadow(e.target.checked);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 border transition-colors duration-200 ${showShadow ? 'bg-term-dim border-term-primary' : 'bg-black border-term-primary/20'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 transition-transform duration-200 ${showShadow ? 'translate-x-5 bg-term-primary' : 'translate-x-0 bg-term-primary/30'}`} />
                  </div>
                </div>
                <span className="text-[9px] text-term-primary/60 font-mono">viewport.showOutline = true;</span>
              </label>
            </div>
          </section>
        </div>


      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 bg-black flex flex-col relative overflow-hidden">

        {/* Ambient HUD Scanner bar (restricted to workspace background) */}
        <div className="hud-scanline" />

        {/* Sidebar Split Toggle Handle */}
        <button
          onClick={() => {
            playClickSound();
            setIsSidebarOpen(!isSidebarOpen);
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-16 bg-[#05070a] border-y border-r border-term-primary/20 hover:border-term-primary text-term-primary flex items-center justify-center hover:bg-term-dim transition-all z-50 focus:outline-none"
          title={isSidebarOpen ? "Collapse Controls (Ctrl+B)" : "Expand Controls (Ctrl+B)"}
        >
          <span className="text-[8px] select-none font-bold transform scale-y-150">
            {isSidebarOpen ? '◀' : '▶'}
          </span>
        </button>

        {/* Workspace Top Status Header */}
        <div className="h-16 border-b border-term-primary/20 bg-black/90 backdrop-blur-md flex items-center px-6 gap-6 z-40 select-none">

          {/* Hide/Show Sidebar Button */}
          <button
            onClick={() => {
              playClickSound();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="flex items-center gap-2 border border-term-primary/30 bg-term-dim text-term-primary px-3 py-1.5 hover:bg-term-primary hover:text-black transition-all text-[9px] font-bold select-none focus:outline-none"
            title="Toggle panel (Ctrl+B)"
          >
            {isSidebarOpen ? '[ < ] HIDE_CONTROLS' : '[ > ] SHOW_CONTROLS'}
          </button>

          <span className="text-[9px] text-term-primary/40 hidden md:inline">| shortcut: Ctrl+B</span>

          <div className="h-6 w-[1px] bg-term-primary/20" />

          <div className="flex flex-col justify-center">
            <span className="text-[8px] text-term-primary/40 uppercase tracking-wider font-bold">sys.canvas.width_height</span>
            <span className="text-xs text-term-primary font-bold">{width} × {height}</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[8px] text-term-primary/40 uppercase tracking-wider font-bold">sys.canvas.aspect_ratio</span>
            <span className="text-xs text-slate-300 font-bold">{getRatioText(width, height)}</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[8px] text-term-primary/40 uppercase tracking-wider font-bold">sys.view.zoom_level</span>
            <span className="text-xs text-slate-300 font-bold">{zoom}%</span>
          </div>

          {isResizeModeActive && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[9px] text-red-400 ml-auto animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span>RESIZE_MODE_ACTIVE</span>
            </div>
          )}
        </div>

        {/* Scrollable Viewport with HUD coordinate overlays */}
        <div
          ref={viewportRef}
          id="viewport"
          className="flex-1 overflow-auto p-14 relative"
          onMouseMove={handleViewportMouseMove}
          onMouseEnter={() => setIsMouseInViewport(true)}
          onMouseLeave={() => setIsMouseInViewport(false)}
        >
          {/* Dynamic Laser Coordinate Crosshairs (Sci-Fi HUD) */}
          {isMouseInViewport && (
            <>
              {/* Vertical line */}
              <div
                className="absolute top-0 bottom-0 w-[1px] pointer-events-none z-10"
                style={{
                  left: `${coords.x}px`,
                  backgroundColor: 'var(--term-primary)',
                  opacity: 0.12
                }}
              />
              {/* Horizontal line */}
              <div
                className="absolute left-0 right-0 h-[1px] pointer-events-none z-10"
                style={{
                  top: `${coords.y}px`,
                  backgroundColor: 'var(--term-primary)',
                  opacity: 0.12
                }}
              />
              {/* Floating coordinate badge */}
              <div
                className="absolute bg-black/90 border border-term-primary/40 px-1.5 py-0.5 text-[8px] font-mono pointer-events-none z-20"
                style={{
                  left: `${coords.x + 12}px`,
                  top: `${coords.y + 12}px`,
                  color: 'var(--term-primary)'
                }}
              >
                X:{coords.x} Y:{coords.y}
              </div>
            </>
          )}

          {/* Grid canvas wrapper */}
          <div
            className={`relative ${showGrid ? 'grid-pattern' : ''}`}
            style={{ width: `${WORKSPACE_SIZE}px`, height: `${WORKSPACE_SIZE}px` }}
          >

            {/* Scaler box that has dimensions scaled by zoom */}
            <div
              id="canvas-scaler"
              className={`absolute ${isResizeModeActive ? 'border border-term-primary/40' : ''}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width * (zoom / 100)}px`,
                height: `${height * (zoom / 100)}px`,
              }}
            >
              {/* Scaled Canvas element */}
              <div
                id="canvas-container"
                className={`absolute top-0 left-0 bg-[#0a0e14] transition-shadow duration-300 origin-top-left border border-transparent ${showShadow ? 'shadow-[0_25px_70px_-10px_rgba(0,0,0,0.95)]' : ''
                  }`}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: `scale(${zoom / 100})`,
                }}
              >
                {/* Visual Artboard */}
                <div
                  className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing border border-transparent"
                  onMouseDown={startMove}
                  onTouchStart={startMove}
                >
                  {/* Background Layer */}
                  {bgType === 'color' && (
                    <div
                      className="absolute inset-0 pointer-events-none select-none"
                      style={{
                        backgroundColor: bgColor,
                        filter: `brightness(${bgBrightness}%)`,
                      }}
                    />
                  )}
                  {bgType === 'gradient' && (
                    <div
                      className="absolute inset-0 pointer-events-none select-none"
                      style={{
                        backgroundImage: bgGradient,
                        backgroundSize: 'cover',
                        filter: `brightness(${bgBrightness}%)`,
                      }}
                    />
                  )}
                  {bgType === 'image' && bgImageSrc && (
                    bgFit === 'repeat' ? (
                      <div
                        className="absolute inset-0 pointer-events-none select-none"
                        style={{
                          backgroundImage: `url(${bgImageSrc})`,
                          backgroundRepeat: 'repeat',
                          backgroundPosition: 'top left',
                          filter: `brightness(${bgBrightness}%)`,
                        }}
                      />
                    ) : (
                      <img
                        src={bgImageSrc}
                        alt="workspace background"
                        className="absolute inset-0 w-full h-full pointer-events-none select-none"
                        style={{
                          objectFit: bgFit === 'stretch' ? 'fill' : bgFit === 'contain' ? 'contain' : 'cover',
                          filter: `brightness(${bgBrightness}%)`,
                        }}
                      />
                    )
                  )}

                  {/* Inside size badge */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 border border-term-primary/20 text-term-primary py-1.5 px-3.5 font-mono text-[11px] opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
                    {width} x {height}
                  </div>
                </div>
              </div>

              {/* Drag handles (on scaler so they remain unscaled/easy to grab) */}
              {isResizeModeActive && (
                <>
                  {/* Top edge center handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 't')}
                    onTouchStart={(e) => startDrag(e, 't')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 cursor-ns-resize z-20 flex items-center justify-center group"
                    title="Drag top edge to change height"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Bottom edge center handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'b')}
                    onTouchStart={(e) => startDrag(e, 'b')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 cursor-ns-resize z-20 flex items-center justify-center group"
                    title="Drag bottom edge to change height"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Right edge center handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'r')}
                    onTouchStart={(e) => startDrag(e, 'r')}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-4 h-4 cursor-ew-resize z-20 flex items-center justify-center group"
                    title="Drag right edge to change width"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Left edge center handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'l')}
                    onTouchStart={(e) => startDrag(e, 'l')}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-4 h-4 cursor-ew-resize z-20 flex items-center justify-center group"
                    title="Drag left edge to change width"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Top Left Corner handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'tl')}
                    onTouchStart={(e) => startDrag(e, 'tl')}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 cursor-nwse-resize z-20 flex items-center justify-center group"
                    title="Drag corner to change both dimensions"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Top Right Corner handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'tr')}
                    onTouchStart={(e) => startDrag(e, 'tr')}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 cursor-nesw-resize z-20 flex items-center justify-center group"
                    title="Drag corner to change both dimensions"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Bottom Right Corner handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'br')}
                    onTouchStart={(e) => startDrag(e, 'br')}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 cursor-nwse-resize z-20 flex items-center justify-center group"
                    title="Drag corner to change both dimensions"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>

                  {/* Bottom Left Corner handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'bl')}
                    onTouchStart={(e) => startDrag(e, 'bl')}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 cursor-nesw-resize z-20 flex items-center justify-center group"
                    title="Drag corner to change both dimensions"
                  >
                    <div className="w-1.5 h-1.5 bg-term-primary border border-black" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating Actions bar for resize mode */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#05070a]/95 border border-term-primary py-2.5 px-6 flex items-center gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.85)] z-50 transition-all duration-300"
          style={{
            transform: isResizeModeActive ? 'translate(-50%, 0)' : 'translate(-50%, 100px)',
            opacity: isResizeModeActive ? 1 : 0,
            pointerEvents: isResizeModeActive ? 'auto' : 'none'
          }}
        >
          <div className="flex items-center gap-2 text-xs text-term-primary">
            <Info className="w-4.5 h-4.5" />
            <span>DRAG_HANDLES_TO_ADJUST_RESOLUTION.</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={cancelResizeMode}
              className="bg-transparent border border-white/20 text-white font-bold text-xs py-1.5 px-4 hover:bg-white/10 hover:text-term-primary hover:border-term-primary/50 transition-all active:scale-95"
            >
              [CANCEL]
            </button>
            <button
              onClick={applyResizeMode}
              className="bg-term-primary text-black font-bold text-xs py-1.5 px-4 shadow-lg shadow-term-primary/10 hover:bg-white hover:border-white transition-all active:scale-95"
            >
              [APPLY_LOCK]
            </button>
          </div>
        </div>

        {/* Donation Modal overlay */}
        {isDonateOpen && (
          <div
            onClick={() => {
              playBeepSound();
              setIsDonateOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
          >
            {/* Modal Box */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#05070a] border-2 border-term-primary shadow-[0_0_30px_var(--term-primary-glow)] flex flex-col crt-panel-effect overflow-hidden cursor-default"
            >
              {/* Scanline overlay */}
              <div className="hud-scanline" />

              {/* Header border stripe */}
              <div className="h-[6px] bg-term-primary w-full" />

              {/* Modal Header */}
              <div className="p-4 border-b border-term-primary/20 bg-black/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-term-primary animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-xs tracking-widest text-term-primary flex items-center gap-1.5">
                      SUPPORT_DECK_CREATOR <span className="w-1.5 h-3 bg-term-primary terminal-blink" />
                    </h3>
                    <p className="text-[8px] text-term-primary/40 font-mono">CONNECTION: SECURE_LINK</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playBeepSound();
                    setIsDonateOpen(false);
                  }}
                  className="border border-term-primary/30 hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 text-term-primary px-2 py-0.5 text-[8px] font-bold transition-all focus:outline-none"
                >
                  [ ESC_CLOSE ]
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex flex-col items-center justify-center gap-6">

                {/* QR Code Presentation Container */}
                <div className="flex flex-col items-center justify-center border border-term-primary/20 p-5 bg-black/50 relative overflow-hidden group w-full">
                  {/* Digital corner brackets */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-term-primary/50" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-term-primary/50" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-term-primary/50" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-term-primary/50" />

                  {/* Main QR Container with required background #faae2b */}
                  <div className="relative p-5 bg-[#faae2b] border border-white/20 shadow-[0_0_15px_rgba(250,174,43,0.3)] group-hover:shadow-[0_0_25px_rgba(250,174,43,0.55)] transition-all duration-300">
                    <img
                      src={DonasiBarcode}
                      alt="Donation Barcode QRIS"
                      className="w-52 h-52 object-contain select-none"
                    />

                    {/* Glowing Laser Scan bar */}
                    <div className="laser-scanner" />
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-[9px] text-black font-extrabold bg-[#faae2b] px-2 py-0.5 uppercase tracking-widest shadow-[0_0_8px_rgba(250,174,43,0.25)]">
                      scan_qris_to_donate
                    </span>
                  </div>
                </div>

                {/* Supporting Gratitude Message */}
                <div className="w-full border border-term-primary/20 bg-black/60 p-4 text-center relative">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-[#05070a] px-2 text-[8px] text-term-primary/40 uppercase tracking-widest font-mono">
                    [ feedback.message ]
                  </div>
                  <p className="text-sm font-bold text-slate-200 leading-relaxed font-mono py-1.5">
                    "Terima kasih telah berdonasi, ini akan berguna bagi saya dan pengembangan web ini."
                  </p>
                  <div className="mt-2 text-[8px] text-term-primary/50 font-mono">
                    FEED_STATUS: ACTIVE // FEED_STRENGTH: 100%
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-2.5 bg-black/60 border-t border-term-primary/10 flex items-center justify-between text-[8px] text-term-primary/40">
                <span>PROJECT: TASK_BAR_HERO</span>
                <span>AUTH_SIG: SUGA_B_SYSTEMS</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
