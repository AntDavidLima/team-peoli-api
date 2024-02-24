import { z } from 'zod';

export const envSchema = z.object({
	APPLICATION_PORT: z.coerce.number().optional().default(3000),
	ENCRIPTION_ROUNDS: z.coerce.number().optional().default(12),
});

export type Env = z.infer<typeof envSchema>;
