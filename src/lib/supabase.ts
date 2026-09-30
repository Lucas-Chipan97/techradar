import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase en lecture seule (clé anon + règles RLS).
 * Vaut null tant que les variables d'environnement ne sont pas renseignées :
 * le site bascule alors sur les données d'exemple.
 */
export const supabase =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
