import type { BuildPlan } from '../schemas/plans';

export type ShareErrorCode = 'E_PREFIX' | 'E_CRC' | 'E_INFLATE' | 'E_SCHEMA' | 'E_TOO_LONG';

export interface ShareError {
  code: ShareErrorCode;
  message: string;
}

export type Result<T, E> = { ok: true; value: T; plan?: T } | { ok: false; error: E };

export type ShareDecodeResult =
  { ok: true; value: BuildPlan; plan: BuildPlan } | { ok: false; error: ShareError };
