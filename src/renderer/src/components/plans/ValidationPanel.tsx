import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { PlanValidationResult } from '../../../../core/plans';

export interface ValidationPanelProps {
  validation: PlanValidationResult;
  className?: string;
}

export function ValidationPanel({
  validation,
  className = ''
}: ValidationPanelProps): React.JSX.Element {
  const { errors, warnings } = validation;
  const isValid = errors.length === 0;

  return (
    <div className={`p-3 pixel-box bg-[#0c0e18] space-y-2.5 ${className}`} data-testid="editor-validation-panel">
      <div className="flex items-center justify-between">
        <span className="font-pixel-heading text-[10px] text-zinc-400 uppercase tracking-wider">
          LIVE VALIDATION
        </span>
        {isValid ? (
          <span
            data-testid="editor-validation-valid"
            className="flex items-center gap-1 px-1.5 py-0.5 border border-[#4ade80] bg-[#0c2e17] text-[#4ade80] font-pixel-heading text-[10px]"
          >
            <CheckCircle2 className="size-3" />
            <span>VALID</span>
          </span>
        ) : (
          <span
            data-testid="editor-validation-errors"
            className="flex items-center gap-1 px-1.5 py-0.5 border border-red-500 bg-[#2b0c10] text-red-300 font-pixel-heading text-[10px]"
          >
            <AlertCircle className="size-3" />
            <span data-num="true">{errors.length}</span> ERRORS
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((err, idx) => (
            <div
              key={`err-${idx}`}
              data-testid="validation-error-item"
              className="p-1.5 border border-red-900 bg-red-950/40 text-red-300 text-xs flex items-start gap-2"
            >
              <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-red-400" />
              <div className="min-w-0 flex-1">
                <span className="font-pixel-heading text-[10px] text-red-400 mr-1.5">
                  [{err.code}]
                </span>
                <span className="text-zinc-300 leading-snug">{err.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1.5" data-testid="editor-validation-warnings">
          {warnings.map((warn, idx) => (
            <div
              key={`warn-${idx}`}
              className="p-1.5 border border-amber-900 bg-amber-950/40 text-amber-300 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
              <div className="min-w-0 flex-1">
                <span className="font-pixel-heading text-[10px] text-amber-400 mr-1.5">
                  [{warn.code}]
                </span>
                <span className="text-zinc-300 leading-snug">{warn.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
