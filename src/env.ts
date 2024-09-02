import { z } from 'zod';

export const envSchema = z.object({
	APPLICATION_PORT: z.coerce.number().optional().default(3000),
	ENCRYPTION_ROUNDS: z.coerce.number().optional().default(12),
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),
	CLIENT_URL: z.string().url(),
	SMTP_HOST: z.string(),
	SMTP_USER: z.string(),
	SMTP_PASS: z.string(),
});

export type Env = z.infer<typeof envSchema>;
