/// <reference types="vite/client" />
import type {
  IpcChannel,
  IpcEventChannel,
  IpcEventData,
  IpcRequest,
  IpcResponse,
  IpcResponseData
} from '../../shared';

export interface StratcomAPI {
  invoke: <C extends IpcChannel>(channel: C, req?: IpcRequest<C>) => Promise<IpcResponse<IpcResponseData<C>>>;
  on: <E extends IpcEventChannel>(event: E, cb: (data: IpcEventData<E>) => void) => () => void;
}

declare global {
  interface Window {
    stratcom: StratcomAPI;
  }
}
