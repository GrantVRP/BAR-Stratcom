import React, { useEffect, useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';

export function ReportReadyToast(): React.JSX.Element | null {
  const [toastSessionId, setToastSessionId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = ipcClient.on('review:ready', (payload) => {
      setToastSessionId(payload.sessionId);
    });
    return () => {
      unsub();
    };
  }, []);

  if (!toastSessionId) return null;

  return (
    <div
      data-testid="report-ready-toast"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border-2 border-black bg-[#12131a] p-3 shadow-[3px_3px_0px_#000]"
    >
      <div className="font-['Press_Start_2P'] text-[10px] text-[#4ade80]">
        MATCH REPORT READY
      </div>
      <button
        type="button"
        data-testid="toast-view-report"
        onClick={() => {
          const sid = toastSessionId;
          setToastSessionId(null);
          window.location.hash = `#/review?sessionId=${sid}`;
        }}
        className="cursor-pointer border-2 border-black bg-[#449bed] px-2 py-1 font-['Press_Start_2P'] text-[10px] text-black hover:bg-[#60a5fa]"
      >
        VIEW REPORT
      </button>
      <button
        type="button"
        data-testid="toast-dismiss"
        onClick={() => setToastSessionId(null)}
        className="cursor-pointer border-2 border-black bg-[#27272a] px-2 py-1 font-['Press_Start_2P'] text-[10px] text-[#a1a1aa] hover:bg-[#3f3f46]"
        aria-label="Dismiss toast"
      >
        ✕
      </button>
    </div>
  );
}
