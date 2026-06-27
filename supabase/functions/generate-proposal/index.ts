import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    
    // Admin client for checking limits and deducting credits safely
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    // User client to verify the token
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') as string, {
      global: { headers: { Authorization: authHeader } }
    });

    // 3. Get User
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Bypass check for admin
    const isAdmin = (user.email === 'mikemovell2.0@gmail.com' || user.email === 'mikemovel2.0@gmail.com');

    let usedExtraCredit = false;

    if (!isAdmin) {
      // 4. Check Limits & Subscription
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'active')
        .maybeSingle();

      if (!sub) {
        return new Response(JSON.stringify({ error: 'No active plan. Please upgrade or buy credits.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const planType = sub.plan; // 'free', 'starter', 'pro', 'agency'
      const extraCredits = sub.extra_credits || 0;

      // Calculate proposals generated this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      const proposalsUsedThisMonth = count || 0;

      // Define limits
      const LIMITS: Record<string, number> = {
        'free': 1,
        'starter': 5,
        'pro': -1, // unlimited
        'agency': -1 // unlimited
      };

      const limit = LIMITS[planType] !== undefined ? LIMITS[planType] : 0;

      if (limit !== -1 && proposalsUsedThisMonth >= limit) {
        // Plan limit reached, try to use extra credit
        if (extraCredits > 0) {
          // Deduct 1 credit securely
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({ extra_credits: extraCredits - 1 })
            .eq('id', sub.id);

          if (updateError) {
            console.error("Failed to deduct credit:", updateError);
            return new Response(JSON.stringify({ error: 'Internal error while deducting credit.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          usedExtraCredit = true;
        } else {
          return new Response(JSON.stringify({ error: 'Limit reached. Please buy more credits or upgrade to Pro.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    // 5. Call OpenRouter
    const { messages, model, response_format } = await req.json();
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openRouterKey) {
       return new Response(JSON.stringify({ error: 'OpenRouter API Key not configured on server.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.5-flash",
        messages,
        response_format
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
       return new Response(JSON.stringify({ error: 'AI generation failed', details: aiData }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      data: aiData,
      usedExtraCredit
    }), {
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
