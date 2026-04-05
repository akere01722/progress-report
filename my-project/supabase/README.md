## Supabase Setup

1. Create a Supabase project.
2. In SQL Editor, run `supabase/schema.sql`.
3. If you are not using Supabase Auth, run:
   - `supabase/attendance_rpcs.sql`
   - `supabase/attendance_no_auth_policies.sql`
4. In project root, edit `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Install deps:
   - `npm install`
6. Start app:
   - `npm run dev`

Current app state:
- Supabase client and schema are prepared.
- Most feature pages still read/write localStorage and need service-layer migration table-by-table.
