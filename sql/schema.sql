-- ============================================================
-- MENHERA — Esquema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) Lista de administradores permitidos (tú + tu amigo)
--    Se rellena con los UUID de auth.users tras crear sus cuentas.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  label text
);

-- Función helper: ¿el usuario actual es admin?
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- 2) Personajes (roster)
create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtype text,              -- ej: "Seaside", "Tropical"
  role text,                 -- ej: "DPS", "Support", "Wonder"
  avatar_url text,
  color_bg text not null default '#2c1f21',
  color_text text not null default '#efe6dd',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3) Acciones/skills catalogadas por personaje (para el desplegable del constructor)
create table if not exists character_actions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters(id) on delete cascade,
  label text not null,       -- ej: "Skill 3", "Rebelión", "Cohesión", "Golpe Especial"
  icon_url text,
  sort_order int default 0
);

-- 4) Jefes (para archivar rotaciones)
create table if not exists bosses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 4b) Modos de juego (para filtrar rotaciones)
create table if not exists game_modes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 4c) Personas (independientes de los personajes jugables)
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

-- 5) Rotaciones
create table if not exists rotations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  boss_id uuid references bosses(id) on delete set null,
  game_mode_id uuid references game_modes(id) on delete set null,
  dps_character_id uuid references characters(id) on delete set null,
  wonder_knife text,
  wonder_persona text,
  grid jsonb not null default '[]'::jsonb,  -- estructura de turnos/filas
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6) Puntuaciones semanales (2 compañías x 30 puestos)
create table if not exists leaderboard_weeks (
  id uuid primary key default gen_random_uuid(),
  week_label text not null,   -- ej: "Semana 27 (23-29 jun 2026)"
  created_at timestamptz default now()
);

create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references leaderboard_weeks(id) on delete cascade,
  company text not null check (company in ('A','B')),
  puesto int not null,
  nombre text not null,
  puntos bigint not null,
  unique (week_id, company, puesto)
);

-- 7) Buzón de mensajes (cualquiera escribe, solo el admin lee)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  author text,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security: todo el mundo puede LEER, solo admins ESCRIBEN
-- ============================================================
alter table characters enable row level security;
alter table character_actions enable row level security;
alter table bosses enable row level security;
alter table game_modes enable row level security;
alter table personas enable row level security;
alter table persona_skills enable row level security;
alter table rotations enable row level security;
alter table leaderboard_weeks enable row level security;
alter table leaderboard_entries enable row level security;
alter table admins enable row level security;
alter table messages enable row level security;

-- Lectura pública
create policy "public read characters" on characters for select using (true);
create policy "public read character_actions" on character_actions for select using (true);
create policy "public read bosses" on bosses for select using (true);
create policy "public read game_modes" on game_modes for select using (true);
create policy "public read personas" on personas for select using (true);
create policy "public read persona_skills" on persona_skills for select using (true);
create policy "public read rotations" on rotations for select using (true);
create policy "public read leaderboard_weeks" on leaderboard_weeks for select using (true);
create policy "public read leaderboard_entries" on leaderboard_entries for select using (true);

-- Escritura solo admin
create policy "admin write characters" on characters for all using (is_admin()) with check (is_admin());
create policy "admin write character_actions" on character_actions for all using (is_admin()) with check (is_admin());
create policy "admin write bosses" on bosses for all using (is_admin()) with check (is_admin());
create policy "admin write game_modes" on game_modes for all using (is_admin()) with check (is_admin());
create policy "admin write personas" on personas for all using (is_admin()) with check (is_admin());
create policy "admin write persona_skills" on persona_skills for all using (is_admin()) with check (is_admin());
create policy "admin write rotations" on rotations for all using (is_admin()) with check (is_admin());
create policy "admin write leaderboard_weeks" on leaderboard_weeks for all using (is_admin()) with check (is_admin());
create policy "admin write leaderboard_entries" on leaderboard_entries for all using (is_admin()) with check (is_admin());

-- Buzón: cualquiera envía, solo el admin lee/gestiona
create policy "anyone can send messages" on messages for insert with check (true);
create policy "admin read messages" on messages for select using (is_admin());
create policy "admin update messages" on messages for update using (is_admin()) with check (is_admin());
create policy "admin delete messages" on messages for delete using (is_admin());

-- admins: nadie puede leer/escribir esta tabla desde el cliente (se gestiona a mano desde el dashboard)
create policy "no client access to admins" on admins for all using (false);

-- ============================================================
-- Storage: bucket para imágenes de personajes
-- Ejecutar aparte, o crear el bucket "character-images" desde
-- Supabase Dashboard > Storage > New bucket (marcarlo como Public)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('character-images', 'character-images', true)
on conflict (id) do nothing;

create policy "public read character images"
on storage.objects for select
using (bucket_id = 'character-images');

create policy "admin upload character images"
on storage.objects for insert
with check (bucket_id = 'character-images' and is_admin());

create policy "admin update character images"
on storage.objects for update
using (bucket_id = 'character-images' and is_admin());

create policy "admin delete character images"
on storage.objects for delete
using (bucket_id = 'character-images' and is_admin());
