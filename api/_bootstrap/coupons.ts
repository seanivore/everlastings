// Creates the two base coupons. Safe to run multiple times (409 on duplicate is caught).
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const COUPONS = [
  { id: 'cart-recovery-10',     name: 'Haven Finder Apology',             percent_off: 10 },
  { id: 'newsletter-welcome-5', name: 'Welcome to the Firelight Council', percent_off: 5  },
];

export async function bootstrapCoupons() {
  for (const c of COUPONS) {
    try {
      await stripe.coupons.create({
        id: c.id,
        name: c.name,
        percent_off: c.percent_off,
        duration: 'forever',
      });
      console.log(`Created coupon: ${c.id}`);
    } catch (err: any) {
      if (err.code === 'resource_already_exists') {
        console.log(`Coupon already exists, skipping: ${c.id}`);
      } else {
        throw err;
      }
    }
  }
}

// Run as: npx tsx api/_bootstrap/coupons.ts
if (require.main === module) bootstrapCoupons().catch(console.error);
