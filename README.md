# UpdateBroAdmin — UPDATE BRO® Production Admin Portal ⚡

Dedicated, standalone administration dashboard for **UPDATE BRO®** (`https://admin.updatebro.in`), powered by **React 18 + Vite + TypeScript + Supabase + Cloudinary + Framer Motion + Tailwind CSS**.

---

## 🚀 Live Production Architecture

| Domain | Application | Repository |
| :--- | :--- | :--- |
| **`https://www.updatebro.in`** | Customer Storefront | `UpdateBro` |
| **`https://admin.updatebro.in`** | Dedicated Admin Portal | `UpdateBro-Admin` (this repository) |

Both apps connect to the exact same **Supabase** database and **Cloudinary** media bucket for instantaneous, real-time synchronization.

---

## 🛠️ Step 1: Push this Admin Folder to a New GitHub Repo

Because this is a completely separate application designed for `admin.updatebro.in`, follow these steps to initialize and push it to its own repository:

```bash
# 1. Open your terminal in this admin folder
cd updatebro-admin

# 2. Initialize a clean git repository
git init
git branch -M main

# 3. Stage and commit all admin files
git add .
git commit -m "feat: complete animated production admin portal for admin.updatebro.in"

# 4. Create a new empty repository on GitHub named 'UpdateBro-Admin'
# Then link and push:
git remote add origin https://github.com/<your-username>/UpdateBro-Admin.git
git push -u origin main
```

---

## 🌐 Step 2: Deploy to Vercel or Netlify

1. Go to [Vercel](https://vercel.com) (or Netlify).
2. Click **"Add New Project"** and import the `UpdateBro-Admin` GitHub repository.
3. Framework Preset: **Vite**.
4. Configure the Environment Variables:
   - `VITE_SUPABASE_URL`: `https://abtvblmuszrgjdijjgnm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_1VnBjaR2cNctsGW_5JcsBw_6Drr-15d`
   - `VITE_CLOUDINARY_CLOUD_NAME`: `ffqesytx`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`: `updatebro_unsigned`
   - `VITE_STOREFRONT_URL`: `https://www.updatebro.in`
5. Click **Deploy**.

---

## 🏷️ Step 3: Add `admin.updatebro.in` Subdomain (100% Free)

You **do not need to purchase another domain**. Subdomains are completely free to create in your existing domain's DNS manager (GoDaddy, Hostinger, Cloudflare, Namecheap, Google Domains, etc.):

1. In your **Vercel Project Settings** -> **Domains**:
   - Add `admin.updatebro.in`.
2. In your domain provider's **DNS Management** panel for `updatebro.in`:
   - Add a new **CNAME** record:
     - **Type**: `CNAME`
     - **Name / Host**: `admin`
     - **Value / Target**: `cname.vercel-dns.com` (or Netlify's DNS target)
     - **TTL**: Automatic or 3600
3. Vercel will automatically verify the CNAME, provision a free SSL certificate (HTTPS), and your admin portal will be live at `https://admin.updatebro.in`!

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local admin dev server on http://localhost:5174
npm run dev

# Build production bundle
npm run build
```

---

## 🛡️ Security & Admin Access

The Admin Portal is protected by `AdminGuard`:
- Only authenticated Supabase users with `profiles.role === 'admin'` can access management controls.
- Other accounts see a clean unauthorized screen with a secure 1-click bootstrap button for the initial developer account.
- Row-Level Security (RLS) on Postgres ensures raw Supabase API keys cannot manipulate products, categories, orders, or store settings without an authenticated admin session.
