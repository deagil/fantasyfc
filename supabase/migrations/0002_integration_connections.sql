create table public.integration_connections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  provider       text not null,
  access_token   text not null,
  refresh_token  text,
  expires_at     timestamptz,
  scopes         text[],
  account_label  text,
  connected_at   timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.integration_connections enable row level security;

grant select, insert, update, delete on public.integration_connections to authenticated;
grant select, insert, update, delete on public.integration_connections to service_role;

create policy "connections readable by owner"
  on public.integration_connections for select
  to authenticated
  using (auth.uid() = user_id);

create policy "connections writable by owner"
  on public.integration_connections for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
