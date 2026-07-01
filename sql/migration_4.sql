-- ============================================================
-- MENHERA — Migración 4
-- Hace que las Puntuaciones sean solo visibles para admins
-- (antes cualquiera con el link podía leerlas)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

drop policy if exists "public read leaderboard_weeks" on leaderboard_weeks;
drop policy if exists "public read leaderboard_entries" on leaderboard_entries;

-- No hace falta crear políticas nuevas: la política
-- "admin write leaderboard_weeks/entries" (for all) ya cubre
-- la lectura para los administradores.
