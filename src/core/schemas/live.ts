import { z } from 'zod';

export const ResSchema = z
  .object({
    current: z.number(),
    storage: z.number(),
    pull: z.number(),
    income: z.number(),
    expense: z.number(),
    share: z.number(),
    sent: z.number(),
    received: z.number()
  })
  .strict();

export type Res = z.infer<typeof ResSchema>;

const emptyArrayToRecord = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (Array.isArray(val) && val.length === 0 ? {} : val), schema);

export const TeamStateSchema = z
  .object({
    teamId: z.number().int(),
    allyTeamId: z.number().int(),
    playerName: z.string(),
    factionId: z.string().nullable(),
    res: z
      .object({
        metal: ResSchema,
        energy: ResSchema
      })
      .strict(),
    counts: emptyArrayToRecord(
      z.record(
        z.string(),
        z
          .object({
            alive: z.number().int(),
            building: z.number().int()
          })
          .strict()
      )
    ),
    bp: z
      .object({
        total: z.number(),
        active: z.number()
      })
      .strict()
  })
  .strict();

export type TeamState = z.infer<typeof TeamStateSchema>;

export const LiveMeSchema = z
  .object({
    teamId: z.number().int(),
    allyTeamId: z.number().int(),
    factionId: z.string().nullable(),
    startUnitId: z.string().nullable(),
    playerName: z.string()
  })
  .strict();

export type LiveMe = z.infer<typeof LiveMeSchema>;

export const LiveSnapshotSchema = z
  .object({
    frame: z.number().int(),
    gameSeconds: z.number(),
    me: LiveMeSchema.nullable(),
    wind: z
      .object({
        current: z.number()
      })
      .strict(),
    res: z
      .object({
        metal: ResSchema,
        energy: ResSchema
      })
      .strict()
      .nullable(),
    counts: emptyArrayToRecord(
      z.record(
        z.string(),
        z
          .object({
            alive: z.number().int(),
            building: z.number().int()
          })
          .strict()
      )
    ),
    builders: z
      .object({
        total: z.number().int(),
        idle: z.number().int()
      })
      .strict(),
    factories: z
      .object({
        total: z.number().int(),
        idle: z.number().int()
      })
      .strict(),
    commander: z
      .object({
        alive: z.boolean(),
        idle: z.boolean()
      })
      .strict(),
    bp: z
      .object({
        total: z.number(),
        active: z.number()
      })
      .strict(),
    enemies: emptyArrayToRecord(z.record(z.string(), z.number().int())),
    teams: z.array(TeamStateSchema).optional()
  })
  .strict();

export type LiveSnapshot = z.infer<typeof LiveSnapshotSchema>;
