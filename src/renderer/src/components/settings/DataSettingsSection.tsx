import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ipcClient } from '../../lib/ipc-client';

export function DataSettingsSection(): React.JSX.Element {
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const handleOpenFolder = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await ipcClient.invoke('data:openFolder');
      if (res.ok) {
        setMessage(`Opened data folder: ${res.data.path}`);
      } else {
        setMessage(res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExportPlans = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await ipcClient.invoke('data:exportAllPlans');
      if (res.ok) {
        if (!res.data.filePath) {
          setMessage('Export cancelled.');
        } else {
          setMessage(`Successfully exported ${res.data.count} plans to ${res.data.filePath}.`);
        }
      } else {
        setMessage(res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClearSessions = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await ipcClient.invoke('data:clearSessions');
      if (res.ok) {
        setMessage('Session recordings cleared successfully.');
      } else {
        setMessage(res.message);
      }
    } finally {
      setBusy(false);
      setConfirmClear(false);
    }
  };

  return (
    <div data-testid="settings-section-data" className="space-y-6 font-mono text-xs">
      {/* App Storage Folder */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
          LOCAL STORAGE & USER DATA
        </span>

        <p className="text-xs text-[#a1a1aa]">
          StratCom stores your custom build orders, encrypted keys, telemetry caches, and session
          logs locally in your user profile.
        </p>

        <div>
          <Button
            variant="default"
            size="sm"
            disabled={busy}
            onClick={() => void handleOpenFolder()}
            data-testid="open-data-folder-btn"
          >
            OPEN APP DATA FOLDER
          </Button>
        </div>
      </div>

      {/* Export All Plans */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
          BACKUP BUILD ORDERS
        </span>

        <p className="text-xs text-[#a1a1aa]">
          Export all your build plans, community imports, and AI drafts as a single zip archive.
        </p>

        <div>
          <Button
            variant="armada"
            size="sm"
            disabled={busy}
            onClick={() => void handleExportPlans()}
            data-testid="export-all-plans-btn"
          >
            EXPORT ALL PLANS (.ZIP)
          </Button>
        </div>
      </div>

      {/* Clear Sessions */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#f87171]">
          SESSION HISTORY & LOGS
        </span>

        <p className="text-xs text-[#a1a1aa]">
          Deletes all recorded match sessions, ndjson telemetry logs, and post-game reports.
          Your build plans and settings will be preserved.
        </p>

        <div className="flex items-center gap-3">
          {!confirmClear ? (
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmClear(true)}
              data-testid="clear-sessions-btn"
            >
              CLEAR SAVED SESSIONS
            </Button>
          ) : (
            <>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => void handleClearSessions()}
                data-testid="confirm-clear-sessions-btn"
              >
                CONFIRM WIPE ALL SESSIONS
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmClear(false)}
              >
                CANCEL
              </Button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div data-testid="data-settings-feedback" className="rounded border border-[#38bdf8]/30 bg-[#0c1929] p-2.5 text-xs text-[#38bdf8]">
          {message}
        </div>
      )}
    </div>
  );
}
