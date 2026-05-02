// Single source of truth for "are we in production?" — drives is_test flag and R2 path namespacing.
export const isTest = process.env.VERCEL_ENV !== 'production';
