import { z } from 'zod';

export const accountSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  newsletter: z.boolean(),
});

export type AccountFormData = z.infer<typeof accountSchema>;
