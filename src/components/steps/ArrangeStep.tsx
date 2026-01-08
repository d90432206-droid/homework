import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, ArrowLeft, Wand2, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Snippet } from '@/types';
import { convertImageToText } from '@/lib/gemini';

interface ArrangeStepProps {
  snippets: Snippet[];
  onBack: () => void;
}

export const ArrangeStep: React.FC<ArrangeStepProps> = ({ snippets: initialSnippets, onBack }) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Get API key from storage
  const apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : null;

  const handleExport = async () => {
    if (!pageRef.current) return;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    pdf.save('exam-paper.pdf');
  };

  const handleConvertToText = async (snippet: Snippet) => {
    if (!apiKey) {
      alert("Please enter a Google Gemini API Key in the first step to use AI features.");
      return;
    }
    setProcessingId(snippet.id);
    try {
      const text = await convertImageToText(snippet.imageData, apiKey);
      setSnippets(prev => prev.map(s => s.id === snippet.id ? { ...s, textContent: text } : s));
    } catch (error: any) {
      console.error(error);
      alert(`Failed to convert text: ${error.message || "Unknown error"}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevertToImage = (snippetId: string) => {
    setSnippets(prev => prev.map(s => s.id === snippetId ? { ...s, textContent: undefined } : s));
  };

  return (
    <div className="flex flex-col h-[80vh]">
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> 重新編輯
        </Button>
        <h2 className="text-xl font-bold">排版試題</h2>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              if (snippets.length === 0) return;
              if (!apiKey) {
                alert("Please enter a Google Gemini API Key first.");
                return;
              }
              for (const snippet of snippets) {
                if (snippet.textContent) continue;
                setProcessingId(snippet.id);
                try {
                  const text = await convertImageToText(snippet.imageData, apiKey);
                  setSnippets(prev => prev.map(s => s.id === snippet.id ? { ...s, textContent: text } : s));
                  await new Promise(r => setTimeout(r, 500));
                } catch (error: any) {
                  console.error(`Failed to digitize snippet ${snippet.id}:`, error);
                }
              }
              setProcessingId(null);
            }} 
            variant="outline"
            disabled={!!processingId}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" /> 全部數位化
          </Button>
          <Button onClick={handleExport} className="gap-2 bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4" /> 下載 PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-900 p-8 flex justify-center">
        <div
          ref={pageRef}
          className="bg-white shadow-2xl relative overflow-hidden"
          style={{ width: '210mm', height: '297mm', minWidth: '794px', minHeight: '1123px' }}
        >
          <div className="border-b border-dashed border-gray-300 p-8 text-center text-gray-400">
            <h1 className="text-2xl font-bold text-black border-none outline-none" contentEditable>試卷標題</h1>
            <p contentEditable>班級：__________ 姓名：__________</p>
          </div>

          <div className="p-4 relative w-full h-full"> 
            {snippets.map((snippet, index) => (
              <motion.div
                key={snippet.id}
                drag
                dragMomentum={false} 
                className="absolute cursor-move group"
                style={{ top: 100 + (index * 150), left: 50 }}
              >
                <div className="relative border border-transparent group-hover:border-blue-400 bg-white p-1">
                   {/* Floating Toolbar */}
                   <div className="absolute -top-10 left-0 hidden group-hover:flex gap-2 bg-white shadow-md rounded p-1 z-10">
                      {snippet.textContent ? (
                         <Button size="sm" variant="outline" onClick={() => handleRevertToImage(snippet.id)} title="還原為圖片">
                           <RefreshCcw className="w-3 h-3" />
                         </Button>
                      ) : (
                         <Button size="sm" variant="default" onClick={() => handleConvertToText(snippet)} disabled={!!processingId} title="使用 AI 辨識文字">
                           {processingId === snippet.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3 text-purple-200" />} 
                           <span className="ml-1 text-xs">數位化</span>
                         </Button>
                      )}
                   </div>

                   {snippet.textContent ? (
                     <textarea
                        className="w-[600px] h-[150px] p-2 text-lg border-none focus:ring-1 focus:ring-blue-500 resize"
                        defaultValue={snippet.textContent}
                        onMouseDown={(e) => e.stopPropagation()} // Allow converting focus to edit without dragging
                     />
                   ) : (
                    <img 
                        src={snippet.imageData} 
                        alt="Question" 
                        style={{ maxWidth: '700px', maxHeight: '300px' }} 
                        className="pointer-events-none select-none"
                    />
                   )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        拖曳題目以進行排版。滑鼠游標懸停於題目上可使用 AI 數位化 (需 API 金鑰)。
      </p>
    </div>
  );
};
