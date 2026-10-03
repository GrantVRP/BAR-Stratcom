import React, { useState, useEffect } from 'react';
import { FileUp, Import, X } from 'lucide-react';
import type { BuildPlan } from '../../../../core/schemas';
import { usePlans } from '../../stores';
import { ipcClient } from '../../lib/ipc-client';

export interface ImportPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: (plan: BuildPlan) => void;
}

export function ImportPlanDialog({
  isOpen,
  onClose,
  onImported
}: ImportPlanDialogProps): React.JSX.Element | null {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { loadPlans } = usePlans();

  const handleClose = React.useCallback((): void => {
    setInputText('');
    setError(null);
    setLoading(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleImportText = async (): Promise<void> => {
    const raw = inputText.trim();
    if (!raw) {
      setError('Please paste a StratCom share code (BSC1...) or BuildPlan JSON.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = raw.startsWith('BSC1.') ? { shareCode: raw } : { content: raw };
      const res = await ipcClient.invoke('plans:import', payload);
      if (res.ok && res.data) {
        await loadPlans();
        if (onImported) onImported(res.data);
        onClose();
      } else {
        setError(res.ok ? 'Failed to import plan' : res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await ipcClient.invoke('plans:import', { openFileDialog: true });
      if (res.ok && res.data) {
        await loadPlans();
        if (onImported) onImported(res.data);
        onClose();
      } else if (!res.ok) {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4"
      data-testid="dialog-import-plan"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0c0e18] border-2 border-zinc-700 pixel-box shadow-[4px_4px_0px_#000] p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="font-pixel-heading text-xs text-white">IMPORT BUILD PLAN</h2>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Paste BSC1 share code, JSON, or select a file
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-import-dialog"
            className="p-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 cursor-pointer transition-none"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <label className="font-pixel-heading text-[10px] text-zinc-300">
            SHARE CODE OR JSON CONTENT
          </label>
          <textarea
            data-testid="input-import-code"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste code starting with BSC1. or raw BuildPlan JSON..."
            className="w-full bg-[#080910] border border-zinc-800 p-2.5 font-mono text-[10px] text-zinc-300 focus:outline-none focus:border-[#449bed]"
          />
        </div>

        {/* Error Feedback */}
        {error && (
          <div
            data-testid="import-error"
            className="p-2 border border-red-800 bg-red-950/40 text-red-300 text-[10px] font-mono leading-tight"
          >
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleImportFile}
            data-testid="btn-import-file"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white font-pixel-heading text-[10px] cursor-pointer transition-none disabled:opacity-50"
          >
            <FileUp className="size-3.5" />
            <span>OPEN FILE...</span>
          </button>

          <button
            type="button"
            onClick={handleImportText}
            data-testid="btn-submit-import"
            disabled={loading || !inputText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845] font-pixel-heading text-[10px] cursor-pointer transition-none disabled:opacity-40"
          >
            <Import className="size-3.5" />
            <span>{loading ? 'IMPORTING...' : 'IMPORT CODE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
