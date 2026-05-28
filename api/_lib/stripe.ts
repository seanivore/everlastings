import Stripe from 'stripe';
import { env } from './env';

// Pinned to a dated Basil release so an SDK bump can't silently shift the API contract.
// To migrate to the next named release: bump the `stripe` package, update this string,
// update the client script tag in checkout.html, and walk Stripe's migration guide.
export const STRIPE_API_VERSION = '2025-08-27.basil' as const;

export const stripe = new Stripe(env('STRIPE_SECRET_KEY'), {
  apiVersion: STRIPE_API_VERSION,
});
