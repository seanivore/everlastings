// Single source of truth for "are we in production?" — drives is_test flag and R2 path namespacing.
export const isTest = process.env.VERCEL_ENV !== 'production';

// Vercel env values were imported with trailing newlines on this project; trim defensively.
// Returns '' for unset keys so call sites can decide between throw / fallback / pass-through.
export function env(key: string): string {
  return (process.env[key] ?? '').trim();
}
