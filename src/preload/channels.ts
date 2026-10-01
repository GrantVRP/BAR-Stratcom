import { isIpcChannel, isIpcEventChannel, type IpcChannel, type IpcEventChannel } from '../shared/channels';

export function assertIpcChannel(channel: string): asserts channel is IpcChannel {
  if (!isIpcChannel(channel)) {
    throw new Error(`Unknown or disallowed IPC channel: ${channel}`);
  }
}

export function assertIpcEventChannel(event: string): asserts event is IpcEventChannel {
  if (!isIpcEventChannel(event)) {
    throw new Error(`Unknown or disallowed IPC event channel: ${event}`);
  }
}
