-- ============================================================
-- MENHERA — Migración 2
-- Añade: Modos de juego, Personas (con sus skills)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- (Esto NO borra nada de lo que ya tienes, solo añade lo nuevo)
-- ============================================================

-- Modos de juego (para filtrar en la Biblioteca)
create table if not exists game_modes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

alter table rotations add column if not exists game_mode_id uuid references game_modes(id) on delete set null;

-- Personas (independientes de los personajes)
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists persona_skills (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas(id) on delete cascade,
  label text not null,
  sort_order int default 0
);

-- Row Level Security (mismas reglas que el resto: leer todo el mundo, escribir solo admin)
alter table game_modes enable row level security;
alter table personas enable row level security;
alter table persona_skills enable row level security;

create policy "public read game_modes" on game_modes for select using (true);
create policy "admin write game_modes" on game_modes for all using (is_admin()) with check (is_admin());

create policy "public read personas" on personas for select using (true);
create policy "admin write personas" on personas for all using (is_admin()) with check (is_admin());

create policy "public read persona_skills" on persona_skills for select using (true);
create policy "admin write persona_skills" on persona_skills for all using (is_admin()) with check (is_admin());

-- Las imágenes de personas se guardan en el mismo almacén que ya existe
-- (character-images), no hace falta crear un bucket nuevo.
