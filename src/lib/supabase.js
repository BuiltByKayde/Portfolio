import { createClient } from '@supabase/supabase-js';

// Both values come from your .env file (see .env.example).
// The publishable/anon key is meant to be public: what protects your data is
// Row Level Security in the database (supabase/schema.sql). Never put the
// service_role / secret key in this project.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;
