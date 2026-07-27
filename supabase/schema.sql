-- Run this in the Supabase SQL Editor to create the transactions table.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text not null,
  created_at timestamptz not null default now()
);

-- Run on an existing database as well. `amount` remains the total including VAT.
alter table public.transactions
  add column if not exists tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  add column if not exists tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0);

alter table public.transactions enable row level security;

create policy "Allow public read access"
  on public.transactions
  for select
  using (true);

create policy "Allow public insert access"
  on public.transactions
  for insert
  with check (true);

create policy "Allow public delete access"
  on public.transactions
  for delete
  using (true);

-- Optional seed data (matches the original mock transactions)
insert into public.transactions (date, type, category, amount, note)
values
  ('2026-05-30', 'income', 'Sales', 4820, 'Weekend dinner service'),
  ('2026-05-30', 'expense', 'COGS', 1240, 'Fresh produce delivery'),
  ('2026-05-29', 'income', 'Sales', 2150, 'Catering — corporate lunch'),
  ('2026-05-29', 'expense', 'Operations', 680, 'Kitchen equipment maintenance'),
  ('2026-05-28', 'expense', 'COGS', 920, 'Wine & beverage restock');
