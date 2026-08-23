# GRABZONE — Final Free Starter

## What this version does
- Customer storefront with responsive design
- Product catalog and product detail pages
- DM-to-order flow
- Optional referral code in the DM message
- Auto-scrolling notice board
- Admin panel only for website control
- Products: add/edit/delete/publish/hide
- Notices: add/edit/delete/show/hide
- Store settings: store name and DM/social links
- JSON backup/restore
- No customer login
- No customer membership system
- Business/referral/order records are intentionally NOT stored in the website; keep those in Google Sheets.

## Admin login
Default:
Username: admin
Password: change-me

Change the password immediately in Admin > Store settings.

## Important
This free starter stores website content in the browser's localStorage. It is ideal for a prototype or a single-device admin workflow, but it is NOT a multi-device production database.

For a true production launch where all partners/admins can manage the same website from different devices, connect the same UI to Supabase (free tier) and add real authentication/RLS.

## How to run
Open index.html for the storefront.
Open admin.html for website control.

For local development, a simple static server is recommended:
python -m http.server 8080

Then visit:
http://localhost:8080/
http://localhost:8080/admin.html

## Google Sheets workflow
Keep these sheets:
1. Partners — Partner ID, Name, Referral Code, Contact, Commission
2. Customers — Customer, Contact, Referral Code, Referred By, Verification, Coupon
3. Orders — Order ID, Date, Customer, Product, Referral Code, Partner, Price, Coupon, Final Amount, Partner Profit, Status

The website's DM message carries the product and optional referral code. Admins verify it in DM and record the verified result in Google Sheets.


## Product direction
The demo catalog is oriented toward smart gadgets, home & kitchen, security accessories, fashion items and grooming products, matching the supplied storefront reference. Customer accounts/membership are intentionally not used.

Note: regulated weapons/self-defense weapons should not be added to the storefront.


## Final brand
Store name: GRABZONE
Tagline: Grab What's Trending.

Customer login/membership is intentionally disabled. Customers browse products and order by DM. Referral codes are verified by the store team and business/referral/order records stay in Google Sheets.
