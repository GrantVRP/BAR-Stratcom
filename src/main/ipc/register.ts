import { ipcMain } from 'electron';
import {
  ipcContract,
  type IpcChannel,
  type IpcRequest,
  type IpcResponse,
  type IpcResponseData
} from '../../shared';

export async function executeIpcHandler<C extends IpcChannel>(
  channel: C,
  rawReq: unknown,
  handler: (req: IpcRequest<C>) => Promise<IpcResponseData<C>> | IpcResponseData<C>
): Promise<IpcResponse<IpcResponseData<C>>> {
  const contract = ipcContract[channel];
  const parseResult = contract.request.safeParse(rawReq);
  if (!parseResult.success) {
    return {
      ok: false,
      code: 'E_BAD_REQUEST',
      message: parseResult.error.issues.map((i) => i.message).join('; ')
    };
  }

  try {
    const data = await handler(parseResult.data as IpcRequest<C>);
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      code: 'E_HANDLER_ERROR',
      message
    };
  }
}

export function handle<C extends IpcChannel>(
  channel: C,
  handler: (req: IpcRequest<C>) => Promise<IpcResponseData<C>> | IpcResponseData<C>
): void {
  ipcMain.handle(channel, (_event, rawReq) => executeIpcHandler(channel, rawReq, handler));
}
