// ============================================================
// MENHERA — Conexión a Supabase
// ============================================================

const SUPABASE_URL = "https://xdkhqbfuoxzwnrdhrhpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_umpU_EZLUMeRZDPOD1cLTA_wBTXhxza";

// El cliente se expone en window.sb para que todas las páginas lo usen
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
