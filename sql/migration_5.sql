-- ============================================================
-- MENHERA — Migración 5
-- Añade: link externo en personajes y personas (al hacer clic en la foto)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

alter table characters add column if not exists link_url text;
alter table personas add column if not exists link_url text;
