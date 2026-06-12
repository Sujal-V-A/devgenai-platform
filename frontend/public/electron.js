const {
  app,
  BrowserWindow
} = require("electron");

const path = require("path");
const { fork } = require("child_process");

let backendProcess = null;

function startBackend() {
  let backendPath;
  if (app.isPackaged) {
    backendPath = path.join(process.resourcesPath, "backend", "server.js");
  } else {
    // In dev, running electron from frontend directory
    backendPath = path.join(__dirname, "..", "..", "backend", "server.js");
  }

  console.log("Starting backend at path:", backendPath);
  
  try {
    backendProcess = fork(backendPath, [], {
      env: { 
        ...process.env, 
        PORT: 5000,
        NODE_ENV: app.isPackaged ? "production" : "development"
      },
      stdio: "inherit"
    });

    backendProcess.on("error", (err) => {
      console.error("Failed to start backend process:", err);
    });

    backendProcess.on("exit", (code, signal) => {
      console.log(`Backend process exited with code ${code} and signal ${signal}`);
    });
  } catch (err) {
    console.error("Error launching backend process:", err);
  }
}

function stopBackend() {
  if (backendProcess) {
    console.log("Stopping backend process...");
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(
    path.join(__dirname, "../build/index.html")
  );
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  stopBackend();
});