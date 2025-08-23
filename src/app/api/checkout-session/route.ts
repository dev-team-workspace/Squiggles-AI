// app/api/checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export async function POST(req: NextRequest) {
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    console.error('Missing NEXT_PUBLIC_BASE_URL environment variable');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { priceId, userId, userEmail } = await req.json();

    // Validate required fields
    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and userId are required' },
        { status: 400 }
      );
    }

  const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  payment_method_options: {
    card: {
      installments: {
        enabled: true
      },
      request_three_d_secure: 'any'
    }
  },
  line_items: [{
    price: priceId, 
    quantity: 1
  }],
  mode: 'payment',
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
  client_reference_id: userId,
  customer_email: userEmail,
  billing_address_collection: 'auto',
  shipping_address_collection: {
    allowed_countries: ['US', 'CA', 'GB']
  },
  metadata: {
    user_id: userId,
    price_id: priceId
  },
  phone_number_collection: {
    enabled: true
  }
});


    // Validate session creation
    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('Stripe Checkout Session Error:', error);

    // More specific error messages
    const errorMessage = error.type === 'StripeInvalidRequestError'
      ? 'Invalid payment request. Please check your information.'
      : error.message || 'Payment processing error';

    return NextResponse.json(
      {
        error: errorMessage,
        code: error.code || 'unknown_error'
      },
      { status: error.statusCode || 500 }
    );
  }
}