import type {
  IpcChannel,
  IpcEventChannel,
  IpcEventData,
  IpcRequest,
  IpcResponse,
  IpcResponseData
} from '../../../shared';

export interface IpcClientInterface {
  invoke<C extends IpcChannel>(
    channel: C,
    req?: IpcRequest<C>
  ): Promise<IpcResponse<IpcResponseData<C>>>;
  on<E extends IpcEventChannel>(
    event: E,
    cb: (data: IpcEventData<E>) => void
  ): () => void;
  isAvailable(): boolean;
}

let clientOverride: IpcClientInterface | null = null;

export function setIpcClientOverride(override: IpcClientInterface | null): void {
  clientOverride = override;
}

export const ipcClient: IpcClientInterface = {
  async invoke<C extends IpcChannel>(
    channel: C,
    req?: IpcRequest<C>
  ): Promise<IpcResponse<IpcResponseData<C>>> {
    if (clientOverride) {
      return clientOverride.invoke(channel, req);
    }
    if (typeof window !== 'undefined' && window.stratcom?.invoke) {
      try {
        return await window.stratcom.invoke(channel, req);
      } catch (err: unknown) {
        return {
          ok: false,
          code: 'INVOKE_FAILED',
          message: err instanceof Error ? err.message : String(err)
        };
      }
    }
    return {
      ok: false,
      code: 'NO_IPC',
      message: 'stratcom IPC bridge is not available'
    };
  },

  on<E extends IpcEventChannel>(
    event: E,
    cb: (data: IpcEventData<E>) => void
  ): () => void {
    if (clientOverride) {
      return clientOverride.on(event, cb);
    }
    if (typeof window !== 'undefined' && window.stratcom?.on) {
      return window.stratcom.on(event, cb);
    }
    return () => {};
  },

  isAvailable(): boolean {
    if (clientOverride) {
      return clientOverride.isAvailable();
    }
    return typeof window !== 'undefined' && Boolean(window.stratcom?.invoke);
  }
};
