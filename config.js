/**
 * ProposalAI — Configuration File
 * ================================
 * ✅ Supabase: CONFIGURED
 * ✅ Stripe Links: CONFIGURED
 * ⬜ OpenRouter Key: Add yours below (openrouter.ai/keys)
 * ⬜ Stripe Webhook Secret: Set in Supabase Dashboard → Edge Functions → Secrets
 */

const CONFIG = {
  // ─── AI (Edge Function) ─────────────────────────────────────────────────────
  // The API key is now securely stored in Supabase Edge Function secrets.
  AI_API_KEY:  "",
  AI_BASE_URL: "https://qxnifzehbcyidgvludbl.supabase.co/functions/v1/generate-proposal",

  // ── Choose your AI model ────────────────────────────────────────────────
  // Recommended options (from cheapest to best quality):
  //   "google/gemini-flash-1.5"          → Very fast, cheap (~$0.001/proposal)
  //   "meta-llama/llama-3.1-8b-instruct:free" → FREE (limited)
  //   "anthropic/claude-3-haiku"         → Great quality, cheap
  //   "openai/gpt-4o-mini"               → Good quality, cheap
  //   "openai/gpt-4o"                    → Best quality (more expensive)
  //   "anthropic/claude-sonnet-4-5"      → Excellent quality
  AI_MODEL: "google/gemini-2.5-flash",

  // ─── Supabase ─────────────────────────────────────────────────────────────
  SUPABASE_URL:      "https://qxnifzehbcyidgvludbl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_o0Og94OOTWY0wKqKDpInJw_kDii0Y0Y",

  //     Monthly plans
  STRIPE_LINKS: {
    starter:        "https://buy.stripe.com/7sYfZg6lP4LU67R9N12kw00", // $29
    pro:            "https://buy.stripe.com/8x214mh0t6U23ZJaR52kw01", // $79
    agency:         "https://buy.stripe.com/7sYbJ07pTbai2VF7ET2kw02", // $149
    portal:         "https://billing.stripe.com/p/login/7sYfZg6lP4LU67R9N12kw00",  // Customer Portal
    credits_5:      "", // $5 for 10 Extra Proposals
  },

  //     Annual plans (20% discount)
  STRIPE_LINKS_ANNUAL: {
    starter_annual: "https://buy.stripe.com/28E3cu25z7Y67bVe3h2kw03", // $276
    pro_annual:     "https://buy.stripe.com/aFa14m8tXdiqdAj6AP2kw04", // $756
    agency_annual:  "https://buy.stripe.com/7sY4gy25z4LU67RbV92kw05", // $1428
  },

  // ─── App Settings ─────────────────────────────────────────────────────────
  APP_NAME: "ProposalAI",
  APP_URL:  "https://proposalai.app", // Your deployed URL (for email links)
  DEFAULT_LANGUAGE: "en",             // "en" | "pt" | "es" | "fr" | "de" | "it" | "zh" | "ja"

  // ─── Plans & Pricing ──────────────────────────────────────────────────────
  PLANS: {
    starter: { name: "Starter", price_monthly: 29,  price_annual: 23,  proposals: 5  },
    pro:     { name: "Pro",     price_monthly: 79,  price_annual: 63,  proposals: -1 }, // -1 = unlimited
    agency:  { name: "Agency",  price_monthly: 149, price_annual: 119, proposals: -1 },
  },

  CREDIT_PACK: { price: 5, amount: 10 },
};
