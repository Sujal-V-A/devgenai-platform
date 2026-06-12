# 🚀 DevGenAI Web Deployment Guide (Vercel)

This document provides simple instructions to host the DevGenAI platform online on Vercel so you can demonstrate the application on any device or laptop without doing any local setup or installation.

---

## ⚡ Deployment Methods

### Method 1: Using the Command Line (CLI)

Since we have preconfigured the build pipelines and added a `vercel.json` config, you can deploy the frontend directly from your terminal:

1. **Open your terminal** in the `frontend` folder.
2. **Install Vercel CLI** globally (if not already installed):
   ```bash
   npm install -g vercel
   ```
3. **Trigger the deploy script**:
   ```bash
   npm run deploy
   ```
4. **Follow the on-screen prompts**:
   - Log in to your Vercel account (or sign up).
   - Set up and link the project: `Set up and deploy “d:\AI-DevOps-Project\AI-DevOps-Project\frontend”? [y/n]` -> Enter `y`.
   - Link to existing project? -> Enter `n`.
   - What's your project's name? -> Press `Enter` (defaults to `devgenai-platform`).
   - In which directory is your code located? -> Press `Enter` (defaults to `./`).
   - Want to modify settings? -> Enter `n`.
5. **Your website is live!** Vercel will build the React bundle and output a public URL (e.g. `https://devgenai-platform.vercel.app`).

---

### Method 2: Import from GitHub (One-Click Deploy)

If your repository is pushed to GitHub, you can set up automated continuous deployments:

1. **Push your code to GitHub**:
   Ensure you commit and push the project files to a GitHub repository.
2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** -> **Project**.
   - Import your GitHub repository.
   - Select the **`frontend`** directory as the root folder.
   - Vercel will auto-detect the framework (Create React App) and build command (`npm run build`).
   - Click **Deploy**.
3. **Automatic Updates**: Every time you commit and push to your main branch, Vercel will rebuild and update the live website automatically.

---

## 💡 How it Works in Demo Mode

Once the website is live, anyone who visits your Vercel link will be able to interact with the platform without any setup or errors:

- **Automatic Interception**: The React frontend detects that it is hosted on a remote server (or that `localhost:5000` is unreachable) and automatically switches to **Showcase Demo Mode**.
- **Interactive Simulations**:
  - **Docker/K8s controls**: Toggling containers or scaling replicas updates the client-side state dynamically, showing visual updates immediately in the UI.
  - **Live charts**: Performance metrics (CPU, RAM) update in real-time with realistic fluctuations.
  - **AI Chat & Prompts**: Generates simulated DevOps diagnostic answers, YAML files, and documentation in-browser.
  - **CI/CD Pipelines**: Triggers mock builds that visually progress through Lint, Build, Test, and Deploy stages.

This lets you show off 100% of the platform features securely and instantly in any web browser!
