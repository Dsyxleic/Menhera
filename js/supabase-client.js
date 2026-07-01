// ============================================================
// MENHERA — Conexión a Supabase
// Rellena estos dos valores con los de TU proyecto de Supabase:
// Project Settings > API > Project URL / anon public key
// ============================================================

const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY-AQUI";

// El cliente se expone en window.sb para que todas las páginas lo usen
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
