

import { detectQuestionBlocks } from '@/lib/gemini';
import { Loader2, Sparkles } from 'lucide-react';

// ... interface and type Rect remain same ...

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
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // ... useEffect for loading image remains same ...

  // ... getPos, startDrawing, draw, endDrawing, removeRect remain same ...

  // New function for AI Auto Detect
  const handleAutoDetect = async () => {
    const apiKey = window.localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert("請先在第一步輸入 Gemini API 金鑰");
      return;
    }

    if (!canvasRef.current) return;
    
    setIsAutoDetecting(true);
    try {
      // Get full image base64
      const fullImage = canvasRef.current.toDataURL('image/png');
      const blocks = await detectQuestionBlocks(fullImage, apiKey);
      
      if (blocks && Array.isArray(blocks)) {
         const newRects: Rect[] = blocks.map((b: any, index: number) => ({
             id: 'auto-' + index + '-' + Date.now(),
             x: (b.xmin / 100) * canvasRef.current!.width,
             y: (b.ymin / 100) * canvasRef.current!.height,
             width: ((b.xmax - b.xmin) / 100) * canvasRef.current!.width,
             height: ((b.ymax - b.ymin) / 100) * canvasRef.current!.height
         }));
         setRects(prev => [...prev, ...newRects]);
         setMode('select'); // Switch to select mode so user can see/edit
      } else {
        alert("未能偵測到題目區塊，請手動框選。");
      }
    } catch (error) {
      console.error(error);
      alert("AI 偵測失敗，請檢查金鑰或網路。");
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const processCrops = () => {
    // ... same ...
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-4 border-b pb-4 gap-4 flex-wrap">
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
          <Button
            variant="secondary"
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className="gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
          >
             {isAutoDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
             AI 自動框選
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
