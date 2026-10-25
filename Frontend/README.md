# AgriConnect AI — Next.js Frontend Application

Production-ready frontend for **AgriConnect AI** (Post-Harvest Decision Intelligence). Built with Next.js 16 (Turbopack), Tailwind CSS, Lucide Icons, and client-side persistent authentication.

---

## 🚀 Fast Deployment on Vercel

1. Push this `Frontend` repository to GitHub.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Vercel automatically detects **Next.js**. Leave default build settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
5. In the **Environment Variables** section, add:

| Name | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://agriconnect-backend.onrender.com/api` | Your live Render backend API URL |

6. Click **Deploy**.
7. Vercel will build and assign a production URL (e.g., `https://your-app.vercel.app`).

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env.local and adjust backend URL if needed:
cp .env.example .env.local

# 3. Run development server
npm run dev
```

App runs at: `http://localhost:3000` (or `http://localhost:3001`).
