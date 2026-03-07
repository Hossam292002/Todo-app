# Supabase migrations

Migrations add `user_id` and per-user security so each user only sees their own data.

## Apply migrations

**Option A – Supabase CLI (recommended)**

1. Link your project (one time):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   Get `YOUR_PROJECT_REF` from Supabase Dashboard → Project Settings → General → Reference ID.

2. Push migrations:
   ```bash
   npx supabase db push
   ```

**Option B – Supabase Dashboard**

1. Open your project → **SQL Editor** → **New query**.
2. Copy and run the contents of `migrations/20260307100000_add_user_id_rls.sql`.
