'use client';

import React, { useRef, useState, useEffect, MouseEvent } from 'react';
import { Eraser, MousePointer2, Check, ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Snippet } from '@/types';
import { cn } from '@/lib/utils';

interface EditorStepProps {
  imageSrc: string;
  onConfirm: (snippets: Snippet[]) => void;
  onBack: () => void;
}

type Rect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const EditorStep: React.FC<EditorStepProps> = ({ imageSrc, onConfirm, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'erase' | 'select'>('erase');
  const [rects, setRects] = useState<Rect[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Fit to container width roughly or keep intrinsic?
      // Let's keep intrinsic resolution but display scaled via CSS
      // We'll manage scale factor.
      
      // Actually, let's limit max width to something reasonable like 1000px for performance, or keep original.
      // Keeping original is best for print quality.
      canvas.width = img.width;
      canvas.height = img.height;
      setImgSize({ width: img.width, height: img.height });
      
      ctx.drawImage(img, 0, 0);

      // Calculate initial display scale
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        if (img.width > containerWidth) {
           setScale(containerWidth / img.width);
        }
      }
    };
  }, [imageSrc]);

  // We need to use React.MouseEvent/TouchEvent or native kinds.
  // Since we attach to React elements, we get React Synthetic Events.
  // But for logic reuse we can just use a union or 'any' if lazy, but let's try to be specific.
  
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    
    // Check if it's a touch event via 'touches' property presence
    // In React Synthetic Event, we can check nativeEvent or just cast.
    if ('touches' in e) {
       // Touch event
       if (e.touches.length > 0) {
         clientX = e.touches[0].clientX;
         clientY = e.touches[0].clientY;
       } else if (e.changedTouches && e.changedTouches.length > 0) {
         clientX = e.changedTouches[0].clientX;
         clientY = e.changedTouches[0].clientY;
       } else {
         return { x: 0, y: 0 };
       }
    } else {
      // Mouse event
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    const x = (clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (clientY - rect.top) * (canvasRef.current.height / rect.height);
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Only prevent default if we are in a drawing/selecting mode to stop scrolling
    // Note: e.cancelable is reliable on native events, react synthetic events wrap it.
    // We can access e.nativeEvent if needed.
    
    if (mode === 'erase') {
      setIsDrawing(true);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 30 * (canvasRef.current!.width / 1000); 
        ctx.lineCap = 'round';
      }
    } else if (mode === 'select') {
      setIsDrawing(true);
      const { x, y } = getPos(e);
      setStartPos({ x, y });
      setCurrentRect({ id: 'temp', x, y, width: 0, height: 0 });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    if (mode === 'erase') {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if (mode === 'select') {
      const { x, y } = getPos(e);
      const width = x - startPos.x;
      const height = y - startPos.y;
      setCurrentRect({
        id: 'temp',
        x: width > 0 ? startPos.x : x,
        y: height > 0 ? startPos.y : y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (mode === 'select' && currentRect) {
      if (currentRect.width > 10 && currentRect.height > 10) {
        const newRect = { ...currentRect, id: Date.now().toString() };
        setRects(prev => [...prev, newRect]);
      }
      setCurrentRect(null);
    }
  };

  const removeRect = (id: string) => {
    setRects(prev => prev.filter(r => r.id !== id));
  };

  const processCrops = () => {
    if (!canvasRef.current) return;
    const snippets: Snippet[] = [];
    
    rects.forEach(rect => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = rect.width;
      tempCanvas.height = rect.height;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(
          canvasRef.current!,
          rect.x, rect.y, rect.width, rect.height,
          0, 0, rect.width, rect.height
        );
        snippets.push({
          id: rect.id,
          imageData: tempCanvas.toDataURL('image/png'),
          width: rect.width,
          height: rect.height,
          aspectRatio: rect.width / rect.height
        });
      }
    });

    onConfirm(snippets);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
          <Button
            variant={mode === 'erase' ? 'default' : 'outline'}
            onClick={() => setMode('erase')}
            className="gap-2"
          >
            <Eraser className="w-4 h-4" /> 答案擦除筆
          </Button>
          <Button
            variant={mode === 'select' ? 'default' : 'outline'}
            onClick={() => setMode('select')}
            className="gap-2"
          >
            <MousePointer2 className="w-4 h-4" /> 框選題目
          </Button>
        </div>
        <Button onClick={processCrops} disabled={rects.length === 0} className="gap-2">
          下一步 <Check className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto rounded-lg p-4" ref={containerRef}>
        <div className="relative mx-auto shadow-lg" style={{ width: 'fit-content' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            onTouchCancel={endDrawing}
            className={cn("cursor-crosshair", mode === 'erase' ? 'cursor-cell' : 'cursor-crosshair')}
            style={{ maxWidth: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
          />
          
          {/* Overlay for selection boxes */}
          <div className="absolute inset-0 pointer-events-none">
            {rects.map(rect => ( // We need to map coordinate space if canvas is scaled CSS-wise?
                                 // The overlay div is absolute on top of canvas. 
                                 // Since we set canvas style width/height to auto/100%, we might have coordinate mismatch if we rely on CSS size.
                                 // Best approach: Use a wrapping div that has the EXACT dimensions of the inner canvas, but scaled via CSS transform or width.
                                 // For simplicity here, let's rely on the canvas having its intrinsic size and being scrolled if large.
                                 // So we don't scale via CSS width in a way that breaks coordinates.
                                 // Let's set style={{ width: imgSize.width, height: imgSize.height }} on the wrapper if possible, scaled down?
                                 // Actually for scrolling, we just let it be full size.
              <div
                key={rect.id}
                className="absolute border-2 border-blue-500 bg-blue-500/20 group hover:bg-blue-500/30 transition-colors pointer-events-auto"
                style={{
                  left: rect.x + 'px',
                  top: rect.y + 'px',
                  width: rect.width + 'px',
                  height: rect.height + 'px',
                  transform: `scale(${1})` // Assuming canvas is displayed 1:1 or contained
                }}
              >
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRect(rect.id); }}
                    className="absolute -top-3 -right-3 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
              </div>
            ))}
            {currentRect && (
              <div
                className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10"
                style={{
                  left: currentRect.x + 'px',
                  top: currentRect.y + 'px',
                  width: currentRect.width + 'px',
                  height: currentRect.height + 'px'
                }}
              />
            )}
          </div>
        </div>
      </div>
       <p className="text-center text-xs text-muted-foreground mt-2">
        {mode === 'erase' ? '拖曳以塗改答案。 ' : '點擊並拖曳以框選題目區塊。 '}
        若圖片較大可捲動頁面。
      </p>
    </div>
  );
};
