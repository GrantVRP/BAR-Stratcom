import { z } from 'zod';

export const SchemaVersionSchema = z.literal(1);

export const ProvenanceSchema = z.enum(['measured', 'simulated', 'estimated', 'ai-draft', 'unknown']);

export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ProfileSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type Profile = z.infer<typeof ProfileSchema>;
