# AgriConnect AI — Express Backend Service

Production-ready Node.js & Express REST API for **AgriConnect AI** (Post-Harvest Decision Intelligence). Fully integrated with MongoDB Atlas, Google Gemini 3.8-Flash, WeatherAPI.com, Open-Meteo, and OpenRouteService.

---

## 🚀 Fast Deployment on Render (2 Options)

### Option A: 1-Click Render Blueprint (Recommended)
1. Push this `Backend` repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint**.
3. Select your backend repository.
4. Render will automatically read [`render.yaml`](./render.yaml) and configure the Node web service.
5. Provide your `MONGODB_URI` and API keys when prompted.
6. Click **Apply**.

---

### Option B: Manual Web Service Setup
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `agriconnect-backend`
   - **Region:** Any (e.g. Oregon / Singapore / Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** Leave empty (if this repo is root) or `Backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. In the **Environment Variables** section, add:

| Key | Recommended Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
| `JWT_SECRET` | `agriconnect_ai_dev_jwt_secret_2026` | Any secure random string |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Your deployed Vercel domain |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Model identifier |
| `WEATHER_API_KEY` | `ffc7f5d96164473cacf50621261910` | WeatherAPI.com key |
| `OPENROUTESERVICE_API_KEY` | `5b3ce3597851110001cf6248...` | Optional ORS routing key |

5. Click **Create Web Service**.
6. Once deployed, test your health check at:
   `https://<your-service-name>.onrender.com/health`

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run backend locally
npm start
```

Default local URL: `http://localhost:5000`  
Health check: `http://localhost:5000/health`
