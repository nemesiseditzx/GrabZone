# GRABZONE Production Setup
1. Put your Supabase Project URL and Publishable key into config.js.
2. Do NOT put the Supabase secret/service_role key in the site.
3. Upload these files to the GitHub repository root.
4. Vercel will redeploy from GitHub.
5. Open /admin.html and sign in with the Supabase Auth admin account.
6. Add Product -> choose an image -> Upload & Save Product.
7. Images go to Supabase Storage bucket product-images; product data goes to Supabase Database.
Customer accounts are not used. Orders/referrals remain in Google Sheets.
