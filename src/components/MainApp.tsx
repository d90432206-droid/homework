'use client';

import React, { useState } from 'react';
import { AppState, Snippet } from '@/types';
import { UploadStep } from './steps/UploadStep';
import { EditorStep } from './steps/EditorStep';
import { ArrangeStep } from './steps/ArrangeStep';
import { Card } from '@/components/ui/card';

export default function MainApp() {
  const [state, setState] = useState<AppState>({
    step: 'upload',
    originalImage: null,
    snippets: [],
  });

  const handleImageUpload = (imageSrc: string) => {
    setState((prev) => ({ ...prev, originalImage: imageSrc, step: 'editor' }));
  };

  const handleSnippetsConfirm = (snippets: Snippet[]) => {
    setState((prev) => ({ ...prev, snippets, step: 'arrange' }));
  };

  const handleBack = () => {
    setState((prev) => {
      if (prev.step === 'editor') return { ...prev, step: 'upload', originalImage: null };
      if (prev.step === 'arrange') return { ...prev, step: 'editor' };
      return prev;
    });
  };

  return (
    <Card className="w-full min-h-[600px] p-6 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
      {state.step === 'upload' && <UploadStep onUpload={handleImageUpload} />}
      {state.step === 'editor' && state.originalImage && (
        <EditorStep
          imageSrc={state.originalImage}
          onConfirm={handleSnippetsConfirm}
          onBack={handleBack}
        />
      )}
      {state.step === 'arrange' && (
        <ArrangeStep
          snippets={state.snippets}
          onBack={handleBack}
        />
      )}
    </Card>
  );
}
