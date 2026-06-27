import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') as string;

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is missing");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { credits } = await req.json();
    let numCredits = parseInt(credits);
    if (isNaN(numCredits) || numCredits < 10) {
       numCredits = 10;
    }

    // $0.50 per credit
    const unitPriceCents = 50; 
    const totalAmountCents = numCredits * unitPriceCents;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${numCredits} Extra Proposals`,
              description: 'AI Proposal Generation Credits',
            },
            unit_amount: unitPriceCents,
          },
          quantity: numCredits,
        },
      ],
      metadata: {
        extra_credits: numCredits.toString(),
        user_id: user.id
      },
      success_url: `${req.headers.get('origin') || 'https://proposalai.app'}/dashboard.html?success=true`,
      cancel_url: `${req.headers.get('origin') || 'https://proposalai.app'}/dashboard.html?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
