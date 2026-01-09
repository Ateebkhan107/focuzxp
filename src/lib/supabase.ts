// This file creates and exports a Supabase client
// The client is used throughout the app to interact with the database and authentication
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client using environment variables
// This client handles all database queries and authentication
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
