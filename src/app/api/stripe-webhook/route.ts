
// src/app/api/stripe-webhook/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
}) : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Updated to match new credit pack structure
const priceIdToCreditsMap: Record<string, number> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_60_CREDITS || 'price_id_60_placeholder']: 60,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_130_CREDITS || 'price_id_130_placeholder']: 130,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_350_CREDITS || 'price_id_350_placeholder']: 350,
};

export async function POST(req: NextRequest) {
  if (!stripe) {
    console.error("Stripe webhook: Stripe not initialized. STRIPE_SECRET_KEY missing?");
    return NextResponse.json({ error: "Stripe configuration error on server." }, { status: 500 });
  }
  if (!webhookSecret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET not set.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }
  
  const buf = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id, 'Payment Status:', session.payment_status);

      const userId = session.client_reference_id;
      const paymentStatus = session.payment_status;

      if (paymentStatus === 'paid' && userId) {
        if (!session.line_items && session.id) {
            // Fetch line items if not already expanded
            try {
                const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
                    session.id,
                    { expand: ['line_items'] }
                );
                 if (!sessionWithLineItems.line_items || sessionWithLineItems.line_items.data.length === 0) {
                    console.error(`Webhook: No line items found for session ${session.id}. Cannot determine credits to add.`);
                    return NextResponse.json({ error: 'No line items found in paid session.' }, { status: 400 });
                }
                const priceId = sessionWithLineItems.line_items.data[0]?.price?.id;
                 if (!priceId) {
                    console.error(`Webhook: Price ID missing in line items for session ${session.id}.`);
                    return NextResponse.json({ error: 'Price ID missing in line items.' }, { status: 400 });
                }
                const creditsToAdd = priceIdToCreditsMap[priceId];

                if (creditsToAdd === undefined) {
                    console.error(`Webhook: Unknown Price ID ${priceId} for session ${session.id}. No credits added. Check priceIdToCreditsMap.`);
                    // Consider alerting an admin for unknown price IDs
                    return NextResponse.json({ error: 'Unknown product purchased.' }, { status: 400 });
                }
                
                try {
                  const userDocRef = doc(db, "users", userId);
                  const userDocSnap = await getDoc(userDocRef);
                  if (!userDocSnap.exists()) {
                    console.error(`Webhook: User document not found for UID: ${userId} after payment.`);
                    return NextResponse.json({ error: 'User profile not found for paid session.' }, { status: 404 });
                  }

                  await updateDoc(userDocRef, {
                    credits: increment(creditsToAdd),
                    updatedAt: new Date().toISOString()
                  });
                  console.log(`Successfully added ${creditsToAdd} credits to user ${userId} for price ID ${priceId}`);
                } catch (dbError: any) {
                  console.error(`Webhook: Firestore error updating credits for user ${userId}:`, dbError);
                  return NextResponse.json({ error: 'Database update failed after payment.' }, { status: 500 });
                }

            } catch (fetchError: any) {
                console.error(`Webhook: Error fetching session with line items ${session.id}:`, fetchError);
                return NextResponse.json({ error: 'Failed to retrieve session details.' }, { status: 500 });
            }
        } else if (session.line_items && session.line_items.data.length > 0) {
            // This block might not be hit if line_items are not expanded by default in the webhook event.
            // The above block with explicit retrieve is more robust.
            const priceId = session.line_items.data[0]?.price?.id;
             if (!priceId) {
                console.error(`Webhook: Price ID missing in line items for session ${session.id} (pre-expanded).`);
                return NextResponse.json({ error: 'Price ID missing in line items.' }, { status: 400 });
            }
            const creditsToAdd = priceIdToCreditsMap[priceId];
             if (creditsToAdd === undefined) {
                console.error(`Webhook: Unknown Price ID ${priceId} for session ${session.id} (pre-expanded). No credits added. Check priceIdToCreditsMap.`);
                return NextResponse.json({ error: 'Unknown product purchased.' }, { status: 400 });
            }
             // Duplicate DB logic here or refactor into a function
             try {
                  const userDocRef = doc(db, "users", userId);
                  const userDocSnap = await getDoc(userDocRef);
                  if (!userDocSnap.exists()) {
                    console.error(`Webhook: User document not found for UID: ${userId} after payment (pre-expanded).`);
                    return NextResponse.json({ error: 'User profile not found for paid session.' }, { status: 404 });
                  }
                  await updateDoc(userDocRef, { credits: increment(creditsToAdd) });
                  console.log(`Successfully added ${creditsToAdd} credits to user ${userId} for price ID ${priceId} (pre-expanded)`);
                } catch (dbError: any) {
                  console.error(`Webhook: Firestore error updating credits for user ${userId} (pre-expanded):`, dbError);
                  return NextResponse.json({ error: 'Database update failed after payment.' }, { status: 500 });
                }
        } else {
             console.error(`Webhook: No line items available for session ${session.id}, cannot determine credits.`);
             return NextResponse.json({ error: 'Line items missing from session.' }, { status: 400 });
        }


      } else {
        console.log(`Payment status for session ${session.id} is ${paymentStatus} or no userId. Not updating credits.`);
      }
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

    
