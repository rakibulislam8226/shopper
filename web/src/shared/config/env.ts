import { z } from 'zod';

/**
 * Boot-time validation of the browser-exposed environment. Only `VITE_`-prefixed
 * variables reach the client (Vite strips the rest). If a required var is
 * missing the app throws immediately rather than failing on the first API call.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
});

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid frontend environment configuration:\n${details}`);
  }

  return result.data;
}

export const env = parseEnv();
