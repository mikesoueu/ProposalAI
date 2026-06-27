/**
 * ProposalAI — Stripe Helpers
 * Redirects to Stripe Checkout for subscription plans
 */

const STRIPE = {
  // Open Stripe Checkout for a given plan
  checkout(plan) {
    const links = CONFIG?.STRIPE_LINKS;
    if (!links || !links[plan]) {
      alert('Stripe is not configured yet. Please update config.js with your Stripe payment links.');
      return;
    }
    window.open(links[plan], '_blank');
  },

  // Handle all pricing buttons
  init() {
    document.querySelectorAll('[data-stripe-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const plan = btn.dataset.stripePlan;
        STRIPE.checkout(plan);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => STRIPE.init());
