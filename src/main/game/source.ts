import type {
  SessionFileDoc,
  StateDoc,
  WidgetEvent,
  WidgetHeartbeat
} from '../../core/schemas/protocol';

export type BridgeEventMap = {
  heartbeat: (heartbeat: WidgetHeartbeat) => void;
  state: (state: StateDoc) => void;
  events: (events: WidgetEvent[]) => void;
  session: (session: SessionFileDoc) => void;
};

export type BridgeEventName = keyof BridgeEventMap;

export interface BridgeSource {
  start(): void;
  stop(): void;
  on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this;
  off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this;
}
