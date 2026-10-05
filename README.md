# Space Rescue 🚀

A lightweight mobile-first arcade game for a college technical-club event.
Players have 40 seconds to choose which incoming spacecraft should dock next. Successful docking adds the ship's reward; expired ships subtract the reward. Scores are submitted to Supabase and aggregated into a department leaderboard.

## Stack
- React 18 + Vite
- CSS
- Supabase
- Vercel-ready

## 1. Install
```bash
npm install
```

## 2. Configure Supabase
Create a Supabase project, open **SQL Editor**, and run `supabase.sql`.

Copy `.env.example` to `.env` and fill in:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the **publishable key**, not a service-role/secret key. Never put a service-role key in a Vite frontend.

## 3. Run locally
```bash
npm run dev
```

## 4. Build
```bash
npm run build
npm run preview
```

## 5. Deploy to Vercel
Push the project to GitHub, import it into Vercel, and add the same environment variables under:
**Project → Settings → Environment Variables**.

Build command: `npm run build`
Output directory: `dist`

## Game flow
QR → Landing → Player Details → 40-second Game → Result → Supabase → Department Leaderboard

## Important security note
The frontend uses only Supabase's public publishable key. RLS policies allow public score insertion and leaderboard reads because this is an event MVP. The client is not a trusted anti-cheat boundary. The included database constraint blocks absurd values, but a sophisticated anti-cheat system is intentionally out of scope.
