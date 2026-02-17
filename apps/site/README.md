# BinanceXI Marketing Site

This is the marketing site (Next.js). Deploy it as a separate Vercel project with the root directory set to `apps/site`.

## Environment Variables (Vercel)
- `NEXT_PUBLIC_DEMO_POS_URL` = your demo POS URL (example: `https://<demo-pos>.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL` = production Supabase URL (used for public pricing fetch)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = production Supabase anon key (public)

## Pages
- `/` landing page
- `/pricing` pulls `pricing_plans` from Supabase (public select)
- `/demo` demo explainer + link
- `/contact` placeholder contact page
- `/privacy`, `/terms` placeholders

