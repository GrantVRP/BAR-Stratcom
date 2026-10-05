export const IPC_CHANNELS = [
  'app:getInfo',
  'settings:get',
  'settings:set',
  'game:locate',
  'game:widgetStatus',
  'game:installWidget',
  'game:uninstallWidget',
  'game:removeLegacyWidget',
  'coach:start',
  'coach:stop',
  'registry:getSnapshot',
  'registry:getMeta',
  'maps:list',
  'maps:get',
  'plans:list',
  'plans:get',
  'plans:save',
  'plans:delete',
  'plans:import',
  'plans:export',
  'demo:list',
  'coach:manual',
  'coach:markDone',
  'coach:toggleWindow',
  'coach:getShortcutStatus',
  'game:browse',
  'data:openFolder',
  'data:exportAllPlans',
  'data:clearSessions',
  'sessions:list',
  'sessions:get',
  'sessions:delete',
  'capture:listPlayers',
  'capture:toPlan',
  'benchmarks:get',
  'ai:listProviders',
  'ai:setKey',
  'ai:clearKey',
  'ai:hasKey',
  'ai:listModels',
  'ai:test',
  'intel:battles',
  'intel:leaderboard',
  'intel:replays',
  'intel:replay',
  'intel:balance'
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export const IPC_EVENT_CHANNELS = [
  'live:health',
  'live:state',
  'coach:update',
  'coach:cue',
  'review:ready'
] as const;

export type IpcEventChannel = (typeof IPC_EVENT_CHANNELS)[number];

const channelSet = new Set<string>(IPC_CHANNELS);
const eventChannelSet = new Set<string>(IPC_EVENT_CHANNELS);

export function isIpcChannel(channel: string): channel is IpcChannel {
  return channelSet.has(channel);
}

export function isIpcEventChannel(event: string): event is IpcEventChannel {
  return eventChannelSet.has(event);
}
