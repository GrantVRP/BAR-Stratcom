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
  end?: (info: { reason: string }) => void;
};

export type BridgeEventName = keyof BridgeEventMap;

export interface BridgeSource {
  start(): void;
  stop(): void;
  on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this;
  off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this;
  /** A session doc this source has already emitted (lets a coach that starts mid-game find its teams). */
  getSession?(sessionId: string): SessionFileDoc | null;
}
