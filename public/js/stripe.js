import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async tourId => {
  const stripe = Stripe(
    'pk_test_51RPFzHFyXBqGwuZwPdrI116NJ19JCDQWBLqWS1TEE3V5Fbhzyv9LWZxn6Yyuz11UFGaeQ4xY5XvvQWvh54TjgBuQ001XyvFx8Q'
  );

  // 1. Get checkout session from API
  try {
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2. Create a checkout form  + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
