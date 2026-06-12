# DevGenAI - AI-Powered DevOps Platform

DevGenAI is a desktop-packaged AI-Powered DevOps Monitoring & Automation Platform built with React, Node.js, and Electron. It enables real-time system monitoring, AI-based incident diagnostics/healing, CI/CD pipeline automation, YAML generation, and container orchestrator management (Docker & Kubernetes).

---

## 📋 Prerequisites

Before running the application, please make sure you have the following installed on your system:

1. **Node.js (v18 or higher)**: [Download Node.js](https://nodejs.org/)
2. **Docker Desktop**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - **Crucial**: Ensure Docker Desktop is active and running on your machine.
3. **Ollama (Local AI Models)**: [Download Ollama](https://ollama.com/)
   - Install Ollama and download the tinyllama model (`ollama run tinyllama`) to enable the AI assistant, incident resolver, YAML generator, and ChatOps commands.
4. **Kubernetes (Optional)**: If you want to use the Kubernetes dashboard, ensure `kubectl` is configured and connected to a cluster (like Minikube, Docker Desktop K8s, or a cloud cluster).

---

## ⚡ Quick Start (Automated Startup)

For maximum convenience, the application includes automated startup scripts that will install dependencies, build the frontend correctly with relative assets, start the backend server, and launch the Electron desktop app.

### On Windows
Double-click `run.bat` or run it via PowerShell/Command Prompt:
```cmd
.\run.bat
```

### On macOS / Linux
Give execute permissions and run `run.sh` in your terminal:
```bash
chmod +x run.sh
./run.sh
```

---

## 🛠️ Manual Installation & Launch

If you prefer to run the components manually, follow these steps:

### 1. Start the Backend Server
Open a terminal in the project directory:
```bash
cd backend
npm install
npm start
```
The backend server runs on `http://localhost:5000`.

### 2. Build & Launch the Frontend Electron App
Open a separate terminal in the project directory:
```bash
cd frontend
npm install
npm run build      # Pre-builds the React files with relative paths
npm run electron   # Launches the Electron app shell
```

---

## 💡 Troubleshooting

### 1. The application window is showing a blank white screen
* **Cause**: React assets were built with absolute paths `/static` instead of relative paths `./static`, or the React build directory was missing.
* **Fix**: We have resolved this by setting `"homepage": "."` in the frontend config. Make sure you run `npm run build` inside the `frontend` folder before running `npm run electron`.

### 2. Docker container management shows "Docker is not running" or errors
* **Cause**: Docker Desktop is not started, or the daemon endpoint isn't accessible.
* **Fix**: Start Docker Desktop and ensure it is fully initialized. Once active, refresh the Docker Management page in the app. The backend will automatically pick up the local socket/pipe.

### 3. Switch between Developer Mode and Supabase Auth
* If the Supabase cloud authentication service is unreachable or there is no active internet connection, the login window will show a notice and automatically log you in using **Local Developer Mode** so you can test all platform features offline.

### 4. AI Assistant shows "AI Backend Failed"
* **Cause**: Ollama is not installed, or the Ollama local service is not running.
* **Fix**: Ensure Ollama is running on your machine and you have pulled the tinyllama model (`ollama run tinyllama`). If you do not have Ollama installed, the app will continue to run normally, but any AI-related queries will respond with a default "AI Backend Failed" message without crashing the app.
