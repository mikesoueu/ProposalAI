-- ============================================================
-- ProposalAI — Supabase Schema
-- Execute este SQL no Supabase Dashboard:
-- Dashboard → SQL Editor → New Query → Cole e clique em Run
-- ============================================================

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email                   TEXT NOT NULL UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'starter',  -- 'starter' | 'pro' | 'agency'
  billing                 TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly' | 'annual'
  status                  TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'canceled' | 'past_due'
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  proposals_used          INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  expires_at              TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de propostas geradas (histórico)
CREATE TABLE IF NOT EXISTS public.proposals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  title       TEXT,
  client_name TEXT,
  data        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário só vê seus próprios dados
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR email = auth.email());

CREATE POLICY "Users can view own proposals"
  ON public.proposals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Permitir que service_role (webhook) escreva em subscriptions
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Índices para performance
CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS proposals_user_id_idx ON public.proposals(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
