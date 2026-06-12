const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

// Ensure data directory exists
function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      prompts: [],
      ai_logs: [],
      alerts: [],
      auto_healing_logs: [],
      settings: {
        slackWebhookUrl: "",
        smtpHost: "",
        smtpPort: "",
        smtpUser: "",
        smtpPass: "",
        smtpRecipient: "",
        autoHealingEnabled: false,
        githubToken: "",
        githubRepo: "",
        jenkinsUrl: "",
        jenkinsUser: "",
        jenkinsToken: ""
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
}

function readDb() {
  initDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading database:", error);
    return {
      prompts: [],
      ai_logs: [],
      alerts: [],
      auto_healing_logs: [],
      settings: {}
    };
  }
}

function writeDb(data) {
  initDb();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

const db = {
  // PROMPTS
  getPrompts() {
    const data = readDb();
    return data.prompts || [];
  },

  savePrompt(promptText) {
    const data = readDb();
    if (!data.prompts) data.prompts = [];
    const nextVersion = data.prompts.length + 1;
    const newPrompt = {
      id: Date.now(),
      version: nextVersion,
      prompt: promptText,
      date: new Date().toISOString()
    };
    data.prompts.push(newPrompt);
    writeDb(data);
    return data.prompts;
  },

  rollbackPrompt() {
    const data = readDb();
    if (data.prompts && data.prompts.length > 0) {
      data.prompts.pop();
      writeDb(data);
    }
    return data.prompts || [];
  },

  // AI LOGS
  getAiLogs() {
    const data = readDb();
    return data.ai_logs || [];
  },

  addAiLog(logEntry) {
    const data = readDb();
    if (!data.ai_logs) data.ai_logs = [];
    const entry = {
      id: Date.now(),
      prompt: logEntry.prompt,
      responseTime: logEntry.responseTime || 0,
      status: logEntry.status,
      timestamp: new Date().toISOString()
    };
    data.ai_logs.push(entry);
    writeDb(data);
    return entry;
  },

  // ALERTS
  getAlerts() {
    const data = readDb();
    return data.alerts || [];
  },

  addAlert(alertText, severity = "info") {
    const data = readDb();
    if (!data.alerts) data.alerts = [];
    const newAlert = {
      id: Date.now(),
      message: alertText,
      severity,
      timestamp: new Date().toISOString()
    };
    // Keep last 100 alerts to save space
    data.alerts.push(newAlert);
    if (data.alerts.length > 100) {
      data.alerts.shift();
    }
    writeDb(data);
    return newAlert;
  },

  // SETTINGS
  getSettings() {
    const data = readDb();
    return data.settings || {
      slackWebhookUrl: "",
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: "",
      smtpRecipient: "",
      autoHealingEnabled: false,
      githubToken: "",
      githubRepo: "",
      jenkinsUrl: "",
      jenkinsUser: "",
      jenkinsToken: ""
    };
  },

  saveSettings(newSettings) {
    const data = readDb();
    data.settings = { ...data.settings, ...newSettings };
    writeDb(data);
    return data.settings;
  },

  // AUTO HEALING LOGS
  getHealingLogs() {
    const data = readDb();
    return data.auto_healing_logs || [];
  },

  addHealingLog(logEntry) {
    const data = readDb();
    if (!data.auto_healing_logs) data.auto_healing_logs = [];
    const newLog = {
      id: Date.now(),
      resourceName: logEntry.resourceName,
      resourceType: logEntry.resourceType, // 'docker' | 'kubernetes'
      issue: logEntry.issue,
      diagnosis: logEntry.diagnosis || "Pending",
      actionTaken: logEntry.actionTaken || "Pending",
      status: logEntry.status || "Investigating", // 'Investigating' | 'Diagnosing' | 'Action Suggestion' | 'Applied' | 'Resolved' | 'Failed'
      timestamp: new Date().toISOString()
    };
    data.auto_healing_logs.push(newLog);
    if (data.auto_healing_logs.length > 50) {
      data.auto_healing_logs.shift();
    }
    writeDb(data);
    return newLog;
  },

  updateHealingLog(id, updates) {
    const data = readDb();
    if (!data.auto_healing_logs) return;
    const logIndex = data.auto_healing_logs.findIndex(l => l.id === id);
    if (logIndex !== -1) {
      data.auto_healing_logs[logIndex] = { ...data.auto_healing_logs[logIndex], ...updates };
      writeDb(data);
    }
    return data.auto_healing_logs;
  }
};

module.exports = db;
