create table public.integration_oauth_pending (
  state          text primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  code_verifier  text not null,
  app_origin     text not null,
  created_at     timestamptz not null default now()
);

create index integration_oauth_pending_user_id_idx
  on public.integration_oauth_pending (user_id);

alter table public.integration_oauth_pending enable row level security;

-- Rows are only accessed via service role in server OAuth handlers.
revoke all on public.integration_oauth_pending from public;
grant all on public.integration_oauth_pending to service_role;
