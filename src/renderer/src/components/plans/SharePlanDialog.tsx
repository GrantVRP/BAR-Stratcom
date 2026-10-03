import React, { useState, useEffect, useMemo } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { BuildPlan } from '../../../../core/schemas';
import { encodePlan } from '../../../../core/sharecode';
import { planToDiscordText } from '../../../../core/plans/files';
import { useSnapshot } from '../../stores';
import { getClientRegistry } from '../../lib/registry';
import { ipcClient } from '../../lib/ipc-client';

export interface SharePlanDialogProps {
  plan: BuildPlan;
  isOpen: boolean;
  onClose: () => void;
}

export function SharePlanDialog({
  plan,
  isOpen,
  onClose
}: SharePlanDialogProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'code' | 'discord'>('code');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const snapshot = useSnapshot((s) => s.snapshot);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const shareCode = useMemo(() => {
    try {
      return encodePlan(plan);
    } catch {
      return 'Error generating share code';
    }
  }, [plan]);

  const discordText = useMemo(() => {
    try {
      const reg = snapshot ? getClientRegistry(snapshot) : undefined;
      return planToDiscordText(plan, reg);
    } catch {
      return 'Error generating discord text';
    }
  }, [plan, snapshot]);

  const handleCopyCode = async (): Promise<void> => {
    await navigator.clipboard.writeText(shareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyDiscord = async (): Promise<void> => {
    await navigator.clipboard.writeText(discordText);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  const handleExportFile = async (): Promise<void> => {
    setExportError(null);
    try {
      const res = await ipcClient.invoke('plans:export', { id: plan.id, saveDialog: true });
      if (res.ok && res.data.savedPath) {
        setExportPath(res.data.savedPath);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4"
      data-testid="dialog-share-plan"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0c0e18] border-2 border-zinc-700 pixel-box shadow-[4px_4px_0px_#000] p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="font-pixel-heading text-xs text-white">SHARE BUILD PLAN</h2>
            <div className="text-[10px] text-zinc-400 truncate mt-0.5">{plan.title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-share-dialog"
            className="p-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 cursor-pointer transition-none"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 font-pixel-heading text-[10px] cursor-pointer transition-none ${
              activeTab === 'code'
                ? 'border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed]'
                : 'border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            SHARE CODE (BSC1)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`px-3 py-1 font-pixel-heading text-[10px] cursor-pointer transition-none ${
              activeTab === 'discord'
                ? 'border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed]'
                : 'border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            DISCORD TEXT
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'code' ? (
          <div className="space-y-3">
            <textarea
              readOnly
              data-testid="textarea-share-code"
              value={shareCode}
              rows={4}
              className="w-full bg-[#080910] border border-zinc-800 p-2.5 font-mono text-[10px] text-zinc-300 select-all focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyCode}
                data-testid="btn-copy-share-code"
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845] font-pixel-heading text-[10px] cursor-pointer transition-none"
              >
                {copiedCode ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                <span>{copiedCode ? 'COPIED!' : 'COPY CODE'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportFile}
                data-testid="btn-export-file"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white font-pixel-heading text-[10px] cursor-pointer transition-none"
              >
                <Download className="size-3.5" />
                <span>SAVE AS .JSON</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              readOnly
              data-testid="textarea-discord-text"
              value={discordText}
              rows={6}
              className="w-full bg-[#080910] border border-zinc-800 p-2.5 font-mono text-[10px] text-zinc-300 select-all focus:outline-none whitespace-pre"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyDiscord}
                data-testid="btn-copy-discord-text"
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845] font-pixel-heading text-[10px] cursor-pointer transition-none"
              >
                {copiedDiscord ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                <span>{copiedDiscord ? 'COPIED!' : 'COPY DISCORD TEXT'}</span>
              </button>
              <span className="font-mono text-[10px] text-zinc-500" data-num="true">
                {discordText.length}/1900 CHARS
              </span>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {exportPath && (
          <div className="p-2 border border-green-800 bg-green-950/40 text-green-300 text-[10px] font-mono break-all">
            Saved to: {exportPath}
          </div>
        )}
        {exportError && (
          <div className="p-2 border border-red-800 bg-red-950/40 text-red-300 text-[10px] font-mono">
            {exportError}
          </div>
        )}
      </div>
    </div>
  );
}
