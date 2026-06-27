// ============================================================
// ProposalAI — Stripe Webhook (Supabase Edge Function)
// Deploy: supabase functions deploy stripe-webhook
// ============================================================
// Variáveis de ambiente necessárias no Supabase Dashboard:
//   STRIPE_SECRET_KEY      = sk_live_...
//   STRIPE_WEBHOOK_SECRET  = whsec_...
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

// ── Clientes ─────────────────────────────────────────────────
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

// ── Mapeamento de preço → plano ───────────────────────────────
// Valores em CENTAVOS (ex: $29.00 = 2900)
function getPlanFromPrice(unitAmount: number, interval: string): { plan: string; billing: string } {
  const monthly: Record<number, string> = {
    2900:  "starter",
  };
  const annual: Record<number, string> = {
    2300:  "starter",  // $23/mês × 12
  };

  if (interval === "year" || annual[unitAmount]) {
    return { plan: "starter", billing: "annual" };
  }
  return { plan: "starter", billing: "monthly" };
}

// ── Calcular expiração ────────────────────────────────────────
function calcExpiry(billing: string): string {
  const d = new Date();
  if (billing === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Webhook secret not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Pagamento concluído ──────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          null;

        if (!email) {
          console.warn("checkout.session.completed: no email found");
          break;
        }

        // Buscar o user_id pelo email no Supabase Auth
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const user = usersData?.users?.find((u) => u.email === email);

        if (session.mode === "payment") {
          // PAGAMENTO AVULSO (Ex: Compra de Créditos Dinâmica)
          // Buscar a assinatura atual para somar os créditos
          const { data: currentSub } = await supabase
            .from("subscriptions")
            .select("extra_credits")
            .eq("email", email)
            .single();
            
          const currentCredits = currentSub?.extra_credits || 0;
          const creditsToAdd = parseInt(session.metadata?.extra_credits || "0", 10) || 10;
          
          const { error } = await supabase.from("subscriptions").upsert(
            {
              email,
              user_id: user?.id ?? null,
              extra_credits: currentCredits + creditsToAdd,
            },
            { onConflict: "email" }
          );
          
          if (error) console.error("Error adding credits:", error);
          else console.log(`✅ Added ${creditsToAdd} credits for: ${email}`);
          break;
        }

        // ASSINATURA RECORRENTE
        let plan = "pro";
        let billing = "monthly";

        // Buscar detalhes da assinatura para identificar o plano
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const price = sub.items.data[0].price;
          const result = getPlanFromPrice(
            price.unit_amount ?? 0,
            price.recurring?.interval ?? "month"
          );
          plan = result.plan;
          billing = result.billing;
        }

        // Salvar / atualizar assinatura
        const { error } = await supabase.from("subscriptions").upsert(
          {
            email,
            user_id: user?.id ?? null,
            plan,
            billing,
            status: "active",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            expires_at: calcExpiry(billing),
          },
          { onConflict: "email" }
        );

        if (error) console.error("Error upserting subscription:", error);
        else console.log(`✅ Subscription activated: ${email} → ${plan} (${billing})`);
        break;
      }

      // ── Assinatura cancelada ─────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          sub.customer as string
        );
        const email = (customer as Stripe.Customer).email;

        if (email) {
          await supabase
            .from("subscriptions")
            .update({ status: "canceled" })
            .eq("stripe_subscription_id", sub.id);

          console.log(`❌ Subscription canceled: ${email}`);
        }
        break;
      }

      // ── Assinatura atualizada (upgrade/downgrade) ────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const price = sub.items.data[0].price;
        const { plan, billing } = getPlanFromPrice(
          price.unit_amount ?? 0,
          price.recurring?.interval ?? "month"
        );

        await supabase
          .from("subscriptions")
          .update({ plan, billing, status: sub.status })
          .eq("stripe_subscription_id", sub.id);

        console.log(`🔄 Subscription updated: ${sub.id} → ${plan} (${billing})`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("Error handling webhook:", err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
