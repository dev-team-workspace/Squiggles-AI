// src/lib/stripe-config.ts

export type CreditPackID = 'basic' | 'plus' | 'pro';

export const STRIPE_PRICE_IDS: Record<CreditPackID, string | undefined> = {
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_60_CREDITS,
  plus: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_130_CREDITS,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_350_CREDITS,
};
