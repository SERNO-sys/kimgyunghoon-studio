import { z } from 'zod';

export interface DomainConfig {
  domain: string;
  sslStatus: 'pending' | 'active' | 'error';
}

export const domainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      'Invalid domain format'
    ),
});

export type DomainFormData = z.infer<typeof domainSchema>;
