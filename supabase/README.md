# Supabase migrations

Migrations add `user_id`, RLS, `display_id`, and other columns so the app works correctly.

## If you see "Database needs an update"

Your app uses the project in **.env.local** (`NEXT_PUBLIC_SUPABASE_URL`). That database must have the schema applied.

### Option A – Apply via Dashboard (use this if CLI is linked to a different project)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select **the same project** whose URL is in your `.env.local`.
2. Go to **SQL Editor** → **New query**.
3. Copy the entire contents of **`APPLY_TO_PROJECT.sql`** (in this folder), paste into the editor, and click **Run**.
4. Restart your dev server (`npm run dev`).

### Option B – Supabase CLI (when the project in .env.local is the one you link)

1. From the **todo-app** folder:
   ```bash
   npx supabase link
   ```
   When prompted, use the **Reference ID** of the project in your `.env.local` (Dashboard → Project Settings → General).

2. Push migrations:
   ```bash
   npx supabase db push
   ```
3. Restart your dev server.
