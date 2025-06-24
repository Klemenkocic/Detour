import Stripe from 'stripe';
import express from 'express';
import { authMiddleware } from '../middleware/firebaseAuth';
import { Request, Response } from 'express';

const router = express.Router();
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('FATAL: STRIPE_SECRET_KEY environment variable is not set');
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' });

// Create checkout session
// Temporarily disabling auth middleware for debugging
// router.post('/create-session', authMiddleware, async (req: Request & { user?: any }, res: Response): Promise<void> => {
router.post('/create-session', async (req: Request & { user?: any }, res: Response): Promise<void> => {
  console.log('[create-session] body=', req.body);  // <-- Debug log
  console.log('[create-session] headers=', req.headers);
  console.log('[create-session] user=', req.user);
  
  try {
    const { tripId } = req.body;
    
    // Temporary: set a dummy user for testing
    if (!req.user) {
      req.user = { uid: 'test-user-123' };
      console.log('[create-session] Using dummy user for testing');
    }

    // Check required environment variables
    if (!process.env.STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID not set');
      res.status(500).send('Server misconfiguration: STRIPE_PRICE_ID missing');
      return;
    }
    
    // Validate price ID format
    if (!process.env.STRIPE_PRICE_ID.startsWith('price_')) {
      console.error('Invalid STRIPE_PRICE_ID format. It should start with "price_", not "prod_"');
      console.error('You provided a product ID. Please create a price for this product in Stripe Dashboard.');
      res.status(500).send('Server misconfiguration: Invalid STRIPE_PRICE_ID format');
      return;
    }
    if (!process.env.CLIENT_URL) {
      console.error('CLIENT_URL not set');
      res.status(500).send('Server misconfiguration: CLIENT_URL missing');
      return;
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&trip=${tripId}`,
      cancel_url:  `${process.env.CLIENT_URL}/trip/${tripId}`,
      metadata: { tripId },
      locale: 'auto',
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send('Failed to create checkout session');
    return;
  }
});

// Handle webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  console.log('[webhook] Processing webhook event...');
  const sig = req.headers['stripe-signature'] as string;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('❌  Webhook sig verify failed', err);
    res.sendStatus(400);
    return;
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tripId = session.metadata?.tripId!;
    // TODO: update Supabase trips set premium=true where id=tripId
  }
  res.sendStatus(200);
});

export default router; 