-- ============================================================
-- MENHERA — Migración 3
-- Añade: Buzón de mensajes (cualquiera escribe, solo el admin lee)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  author text,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

-- Cualquiera (incluso sin iniciar sesión) puede enviar un mensaje
create policy "anyone can send messages" on messages for insert with check (true);

-- Solo el admin puede leer, marcar como leído o borrar mensajes
create policy "admin read messages" on messages for select using (is_admin());
create policy "admin update messages" on messages for update using (is_admin()) with check (is_admin());
create policy "admin delete messages" on messages for delete using (is_admin());
