import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcChannel,
  IpcEventChannel,
  IpcEventData,
  IpcRequest,
  IpcResponse,
  IpcResponseData
} from '../shared';
import { assertIpcChannel, assertIpcEventChannel } from './channels';

export const stratcomAPI = {
  invoke: <C extends IpcChannel>(
    channel: C,
    req?: IpcRequest<C>
  ): Promise<IpcResponse<IpcResponseData<C>>> => {
    assertIpcChannel(channel);
    return ipcRenderer.invoke(channel, req);
  },
  on: <E extends IpcEventChannel>(event: E, cb: (data: IpcEventData<E>) => void): (() => void) => {
    assertIpcEventChannel(event);
    const listener = (_event: Electron.IpcRendererEvent, data: IpcEventData<E>) => {
      cb(data);
    };
    ipcRenderer.on(event, listener);
    return () => {
      ipcRenderer.removeListener(event, listener);
    };
  }
};

contextBridge.exposeInMainWorld('stratcom', stratcomAPI);
