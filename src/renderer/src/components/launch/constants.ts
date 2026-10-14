/**
 * The launch scene's cast: which bundled models play in it. These are
 * asset keys (BAR unit ids, as the asset files are named), not names shown to the player; any name
 * shown comes from the snapshot.
 */
export const LAUNCH_RUNNER = { armada: 'armfast', cortex: 'corpyro' } as const;
export const LAUNCH_TURBINE = { armada: 'armwin', cortex: 'corwin' } as const;
