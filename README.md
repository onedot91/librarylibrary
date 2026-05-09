<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/89fc2530-4852-4ce0-a23d-d46f601e9b82

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. For realtime shared lending counts, create a Supabase project and run [supabase-schema.sql](supabase-schema.sql) in the Supabase SQL editor.
4. Add these values to `.env.local`:
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
5. Run the app:
   `npm run dev`

If Supabase variables are missing, the app falls back to browser-local storage and will not sync across devices.
