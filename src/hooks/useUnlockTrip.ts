import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const unlockTrip = async (tripId: string, idToken: string): Promise<void> => {
  console.log('unlockTrip fired', { tripId, idToken });
  
  try {
    const response = await fetch('/api/payments/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ tripId })
    });
    
    console.log('fetch status', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`create-session failed: ${response.status} ${response.statusText}`);
    }
    
    const { url } = await response.json();
    console.log('✅ Checkout session created, redirecting to:', url);
    
    // Redirect to Stripe Checkout
    window.location.href = url;
  } catch (error) {
    console.error('unlockTrip error', error);
    throw error;
  }
}; 