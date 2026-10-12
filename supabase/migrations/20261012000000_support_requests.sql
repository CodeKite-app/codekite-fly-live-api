create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  prompt text not null,
  draft text not null,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'sent')),
  created_at timestamptz not null default now()
);

alter table public.support_requests enable row level security;
