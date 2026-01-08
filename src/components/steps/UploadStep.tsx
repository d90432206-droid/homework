'use client';

import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadStepProps {
  onUpload: (imageSrc: string) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <div className="w-full max-w-sm mb-6">
        <label className="text-sm font-medium mb-1 block">API Key (Optional for AI Features)</label>
        <input 
           type="password" 
           placeholder="Paste Gemini API Key" 
           className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
           onChange={(e) => window.localStorage.setItem('gemini_api_key', e.target.value)} // Simple persistence
        />
        <p className="text-xs text-muted-foreground mt-1">Key is stored locally in browser.</p>
      </div>
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
        <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Upload Exam Paper</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-sm">
        Take a photo of the exam paper or upload an existing image.
      </p>
      
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          onChange={handleFileChange}
        />
        <Button size="lg" className="pointer-events-none">
          Select Image
        </Button>
      </div>
    </div>
  );
};
