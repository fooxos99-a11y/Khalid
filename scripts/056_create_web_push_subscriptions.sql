CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_number text NOT NULL,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  user_agent text NULL,
  disabled_at timestamp with time zone NULL,
  failure_reason text NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone NULL,
  last_success_at timestamp with time zone NULL,
  CONSTRAINT web_push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_account_idx
ON public.web_push_subscriptions (user_account_number);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_active_idx
ON public.web_push_subscriptions (user_account_number, disabled_at);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;