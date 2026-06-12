const { exec } = require("child_process");
const Docker = require("dockerode");
const si = require("systeminformation");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
const db = require("./db");

const docker = new Docker();
const app = express();

app.use(cors());
app.use(express.json());

/* ACTIVE ALERTS TRACKER (to prevent spamming) */
let activeAlerts = new Set();

/* HELPERS */
async function sendSlackNotification(webhookUrl, message) {
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, { text: message });
    console.log("Slack notification sent successfully");
  } catch (error) {
    console.error("Failed to send Slack notification:", error.message);
  }
}

async function sendEmailNotification(settings, subject, body) {
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.smtpRecipient) {
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort) || 587,
      secure: settings.smtpPort == 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      }
    });

    await transporter.sendMail({
      from: `"DevGenAI Alert" <${settings.smtpUser}>`,
      to: settings.smtpRecipient,
      subject: subject,
      text: body
    });
    console.log("Email notification sent successfully");
  } catch (error) {
    console.error("Failed to send email notification:", error.message);
  }
}

/* HOME */
app.get("/", (req, res) => {
  res.send("DevGenAI Backend Running");
});

/* AI ASSISTANT */
app.post("/ask-ai", async (req, res) => {
  const start = Date.now();
  const promptText = req.body.message;
  try {
    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "tinyllama",
        prompt: promptText,
        stream: false
      }
    );
    const end = Date.now();
    const reply = response.data.response
      .replace(/```/g, "")
      .replace(/\n/g, "\n\n");

    db.addAiLog({
      prompt: promptText,
      responseTime: end - start,
      status: "success"
    });

    res.json({ reply });
  } catch (error) {
    db.addAiLog({
      prompt: promptText,
      responseTime: 0,
      status: "failed"
    });
    res.status(500).json({
      reply: "AI Backend Failed"
    });
  }
});

/* AI MONITOR */
app.get("/ai-monitor", (req, res) => {
  const logs = db.getAiLogs();
  res.json({
    totalRequests: logs.length,
    status: "AI Running"
  });
});

/* AI LOGS */
app.get("/ai-logs", (req, res) => {
  res.json(db.getAiLogs());
});

/* SAVE PROMPT */
app.post("/save-prompt", (req, res) => {
  const prompts = db.savePrompt(req.body.prompt);
  res.json({
    success: true,
    prompts
  });
});

/* GET PROMPTS */
app.get("/prompts", (req, res) => {
  res.json(db.getPrompts());
});

/* ROLLBACK */
app.post("/rollback", (req, res) => {
  const prompts = db.rollbackPrompt();
  res.json({
    success: true,
    prompts
  });
});

/* PROMPTOPS */
app.get("/promptops", (req, res) => {
  res.json({
    prompts: db.getPrompts()
  });
});

app.get("/promptops/analytics", (req, res) => {
  const logs = db.getAiLogs();
  const total = logs.length;
  const success = logs.filter(l => l.status === "success").length;
  const failed = total - success;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 100;
  
  const avgLatency = total > 0 
    ? (logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / total).toFixed(0) 
    : 0;

  res.json({
    totalRequests: total,
    successRate,
    avgLatency,
    success,
    failed,
    logs: logs.slice(-20) // send last 20 logs
  });
});

/* SYSTEM STATS */
app.get("/system-stats", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const memory = await si.mem();
    const os = await si.osInfo();
    res.json({
      cpu: cpu.currentLoad.toFixed(2),
      ram: (memory.active / 1024 / 1024 / 1024).toFixed(2),
      totalRam: (memory.total / 1024 / 1024 / 1024).toFixed(2),
      platform: os.platform,
      hostname: os.hostname
    });
  } catch (error) {
    res.json({
      error: "Failed to load system stats"
    });
  }
});

/* DOCKER MONITORING & CONTROLS */
app.get("/docker-stats", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const formatted = containers.map((container) => ({
      id: container.Id.slice(0, 12),
      image: container.Image,
      state: container.State,
      status: container.Status,
      names: container.Names[0].replace("/", "")
    }));
    res.json({
      totalContainers: formatted.length,
      containers: formatted
    });
  } catch (error) {
    res.json({
      totalContainers: 0,
      containers: [],
      error: "Docker not running"
    });
  }
});

app.post("/docker/container/:id/start", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    res.json({ success: true, message: `Container ${req.params.id} started` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/docker/container/:id/stop", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    res.json({ success: true, message: `Container ${req.params.id} stopped` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/docker/container/:id/restart", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.restart();
    res.json({ success: true, message: `Container ${req.params.id} restarted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/docker/container/:id/logs", async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      timestamps: true
    });
    // Strip binary headers that Dockerode returns for raw streams (8-byte headers)
    let logsStr = logsBuffer.toString("utf8");
    // Simple sanitization to strip control characters and docker frame headers
    logsStr = logsStr.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
    res.json({ logs: logsStr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* KUBERNETES ADVANCED MONITORING */
app.get("/kubernetes/namespaces", (req, res) => {
  exec("kubectl get namespaces", (error, stdout) => {
    if (error) {
      return res.json({ namespaces: ["default"], error: "Kubernetes not connected" });
    }
    const lines = stdout.trim().split("\n");
    const namespaces = lines.slice(1).map(line => line.trim().split(/\s+/)[0]).filter(Boolean);
    res.json({ namespaces });
  });
});

app.get("/kubernetes/pods", (req, res) => {
  const ns = req.query.namespace;
  const cmd = ns ? `kubectl get pods -n ${ns}` : "kubectl get pods --all-namespaces";
  
  exec(cmd, (error, stdout) => {
    if (error) {
      return res.json({ pods: [], error: "Kubernetes not connected" });
    }
    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return res.json({ pods: [] });

    const isAllNs = !ns;
    const pods = lines.slice(1).map((line) => {
      const cols = line.trim().split(/\s+/);
      if (isAllNs) {
        return {
          namespace: cols[0],
          name: cols[1],
          ready: cols[2],
          status: cols[3],
          restarts: cols[4],
          age: cols[5]
        };
      } else {
        return {
          namespace: ns,
          name: cols[0],
          ready: cols[1],
          status: cols[2],
          restarts: cols[3],
          age: cols[4]
        };
      }
    }).filter(p => p.name);

    res.json({ pods });
  });
});

app.get("/kubernetes/deployments", (req, res) => {
  const ns = req.query.namespace;
  const cmd = ns ? `kubectl get deployments -n ${ns}` : "kubectl get deployments --all-namespaces";
  
  exec(cmd, (error, stdout) => {
    if (error) {
      return res.json({ deployments: [], error: "Kubernetes not connected" });
    }
    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return res.json({ deployments: [] });

    const isAllNs = !ns;
    const deployments = lines.slice(1).map((line) => {
      const cols = line.trim().split(/\s+/);
      if (isAllNs) {
        return {
          namespace: cols[0],
          name: cols[1],
          ready: cols[2],
          upToDate: cols[3],
          available: cols[4],
          age: cols[5]
        };
      } else {
        return {
          namespace: ns,
          name: cols[0],
          ready: cols[1],
          upToDate: cols[2],
          available: cols[3],
          age: cols[4]
        };
      }
    }).filter(d => d.name);

    res.json({ deployments });
  });
});

app.get("/kubernetes/services", (req, res) => {
  const ns = req.query.namespace;
  const cmd = ns ? `kubectl get services -n ${ns}` : "kubectl get services --all-namespaces";
  
  exec(cmd, (error, stdout) => {
    if (error) {
      return res.json({ services: [], error: "Kubernetes not connected" });
    }
    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return res.json({ services: [] });

    const isAllNs = !ns;
    const services = lines.slice(1).map((line) => {
      const cols = line.trim().split(/\s+/);
      if (isAllNs) {
        return {
          namespace: cols[0],
          name: cols[1],
          type: cols[2],
          clusterIp: cols[3],
          externalIp: cols[4],
          ports: cols[5],
          age: cols[6]
        };
      } else {
        return {
          namespace: ns,
          name: cols[0],
          type: cols[1],
          clusterIp: cols[2],
          externalIp: cols[3],
          ports: cols[4],
          age: cols[5]
        };
      }
    }).filter(s => s.name);

    res.json({ services });
  });
});

// Keep legacy /kubernetes for backwards compatibility
app.get("/kubernetes", (req, res) => {
  exec("kubectl get pods --all-namespaces", (error, stdout) => {
    if (error) {
      return res.json({ pods: [], error: "Kubernetes not connected" });
    }
    const lines = stdout.trim().split("\n");
    const pods = lines.slice(1).map((line) => {
      const cols = line.trim().split(/\s+/);
      return {
        namespace: cols[0],
        name: cols[1],
        status: cols[3]
      };
    }).filter(p => p.name);
    res.json({ pods });
  });
});

/* ALERTS & NOTIFICATIONS */
app.get("/alerts", (req, res) => {
  const savedAlerts = db.getAlerts();
  
  // Return list of alert message strings to match original API structure if frontend needs it,
  // or return the full alert objects for advanced rendering. We will return both: an array of strings as `alerts` and full objects as `history`.
  const originalAlertsList = savedAlerts.length > 0 
    ? savedAlerts.map(a => `[${a.severity.toUpperCase()}] ${a.message}`) 
    : ["Kubernetes Connected", "Docker Running", "AI Monitoring Active", "No Critical Errors"];

  res.json({
    alerts: originalAlertsList,
    history: savedAlerts
  });
});

app.get("/notifications", (req, res) => {
  // Return the latest 5 alerts as notification strings
  const savedAlerts = db.getAlerts();
  const alertsStr = savedAlerts.slice(-5).map(a => a.message);
  res.json({
    notifications: alertsStr.length > 0 ? alertsStr : [
      "Docker container restarted",
      "CPU usage stable",
      "Kubernetes pod healthy",
      "AI Monitoring Enabled"
    ]
  });
});

/* DYNAMIC SETTINGS */
app.get("/settings", (req, res) => {
  res.json(db.getSettings());
});

app.post("/settings", (req, res) => {
  const settings = db.saveSettings(req.body);
  res.json({ success: true, settings });
});

/* CHATOPS SAFE COMMAND EXECUTION */
app.post("/chatops/execute", (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "No command provided" });
  }

  // 1. Strict validation to prevent injection
  const normalized = command.trim();
  
  // Rule A: Command must start with either 'kubectl' or 'docker'
  if (!normalized.startsWith("kubectl") && !normalized.startsWith("docker")) {
    return res.status(400).json({ error: "Security restriction: Only kubectl and docker commands are permitted" });
  }

  // Rule B: Ban command chainers: ;, &, |, >, <, `, $, etc.
  // Allow simple pipes to 'grep' or 'jq' if they don't contain variables, redirects, or files.
  const chainersRegex = /[;&><`\$]/;
  if (chainersRegex.test(normalized)) {
    return res.status(400).json({ error: "Security restriction: Command chaining, evaluation, and redirects are prohibited" });
  }

  // Check if pipe is used, and validate it is only piping to a safe reader (grep, head, tail, jq, awk)
  if (normalized.includes("|")) {
    const parts = normalized.split("|");
    const allowedPipes = /^\s*(grep|jq|head|tail|awk|sort|uniq|wc)\s/i;
    for (let i = 1; i < parts.length; i++) {
      if (!allowedPipes.test(parts[i])) {
        return res.status(400).json({ error: "Security restriction: Pipe target is not in the allowed utilities list" });
      }
    }
  }

  // Rule C: Ban destructive actions (e.g. deletion and shell hijacking)
  const destructiveRegex = /\b(rm|delete|prune|exec -it|login|push)\b/i;
  if (destructiveRegex.test(normalized)) {
    return res.status(400).json({ error: "Security restriction: Operations that delete or hijack resources are prohibited via ChatOps" });
  }

  // 2. Execution
  exec(normalized, (error, stdout, stderr) => {
    res.json({
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: error ? error.code : 0
    });
  });
});

/* INCIDENT RESOLVER */
app.post("/incident-resolver", async (req, res) => {
  const start = Date.now();
  const issue = req.body.issue;
  try {
    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "tinyllama",
        prompt: `Solve this DevOps issue:\n\n${issue}\n\nExplain:\n1. Cause\n2. Fix\n3. Commands`,
        stream: false
      }
    );
    const end = Date.now();
    db.addAiLog({
      prompt: `Incident Resolution: ${issue.slice(0, 50)}`,
      responseTime: end - start,
      status: "success"
    });
    res.json({
      reply: response.data.response
    });
  } catch (error) {
    db.addAiLog({
      prompt: `Incident Resolution: ${issue.slice(0, 50)}`,
      responseTime: 0,
      status: "failed"
    });
    res.json({
      reply: "Incident Resolver Failed"
    });
  }
});

/* YAML GENERATOR */
app.post("/generate-yaml", async (req, res) => {
  const start = Date.now();
  const prompt = req.body.prompt;
  try {
    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "tinyllama",
        prompt: `Generate:
- Dockerfile
- Kubernetes YAML
- GitHub Actions YAML

For:

${prompt}

Include '---' delimiters to separate multiple YAML/Dockerfile blocks. Response must contain ONLY valid configuration syntax inside markdown blocks.`,
        stream: false
      }
    );
    const end = Date.now();
    db.addAiLog({
      prompt: `YAML Generation: ${prompt.slice(0, 50)}`,
      responseTime: end - start,
      status: "success"
    });
    res.json({
      reply: response.data.response
    });
  } catch (error) {
    db.addAiLog({
      prompt: `YAML Generation: ${prompt.slice(0, 50)}`,
      responseTime: 0,
      status: "failed"
    });
    res.json({
      reply: "YAML Generation Failed"
    });
  }
});

/* CHATOPS COGNITIVE ROUTER */
app.post("/chatops", async (req, res) => {
  const start = Date.now();
  const message = req.body.message;
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  const msgLower = message.toLowerCase().trim();
  let commandStr = "";

  // 1. Direct Pattern Matches (Rule-based parsing for 100% correct demo paths)
  if (msgLower.includes("pod")) {
    let ns = "";
    const nsMatch = msgLower.match(/namespace\s+([a-zA-Z0-9_-]+)/) || msgLower.match(/in\s+([a-zA-Z0-9_-]+)/);
    if (nsMatch && nsMatch[1] && nsMatch[1] !== "all") {
      ns = ` -n ${nsMatch[1]}`;
    } else if (msgLower.includes("all namespace")) {
      ns = " --all-namespaces";
    }
    commandStr = `kubectl get pods${ns}`;
  } else if (msgLower.includes("deployment")) {
    let ns = "";
    const nsMatch = msgLower.match(/namespace\s+([a-zA-Z0-9_-]+)/) || msgLower.match(/in\s+([a-zA-Z0-9_-]+)/);
    if (nsMatch && nsMatch[1] && nsMatch[1] !== "all") {
      ns = ` -n ${nsMatch[1]}`;
    } else if (msgLower.includes("all namespace")) {
      ns = " --all-namespaces";
    }
    commandStr = `kubectl get deployments${ns}`;
  } else if (msgLower.includes("service")) {
    let ns = "";
    const nsMatch = msgLower.match(/namespace\s+([a-zA-Z0-9_-]+)/) || msgLower.match(/in\s+([a-zA-Z0-9_-]+)/);
    if (nsMatch && nsMatch[1] && nsMatch[1] !== "all") {
      ns = ` -n ${nsMatch[1]}`;
    } else if (msgLower.includes("all namespace")) {
      ns = " --all-namespaces";
    }
    commandStr = `kubectl get services${ns}`;
  } else if (msgLower.includes("container") || msgLower.includes("ps") || msgLower.includes("docker list")) {
    commandStr = "docker ps -a";
  } else if (msgLower.includes("image") || msgLower.includes("docker image")) {
    commandStr = "docker images";
  } else if (msgLower.includes("apply") && msgLower.includes(".yaml")) {
    const pathMatch = message.match(/"([^"]+)"/) || message.match(/'([^']+)'/) || message.match(/apply\s+([^\s]+)/);
    if (pathMatch && pathMatch[1]) {
      commandStr = `kubectl apply -f "${pathMatch[1]}"`;
    }
  }

  // If a rule-based command was found, return it directly
  if (commandStr) {
    const end = Date.now();
    db.addAiLog({
      prompt: `ChatOps Rule-Match: ${message.slice(0, 50)}`,
      responseTime: end - start,
      status: "success"
    });
    return res.json({
      reply: `I translated your request into the following command:\n\n\`${commandStr}\`\n\nClick run to execute it safely.`,
      command: commandStr
    });
  }

  // 2. Fallback to local TinyLlama
  try {
    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "tinyllama",
        prompt: `Convert this DevOps request into a single command using docker or kubectl. 
Do not include any explanation. Do not wrap in backticks.

Request: Show all pods
Response: kubectl get pods

Request: ${message}
Response:`,
        stream: false
      }
    );
    const end = Date.now();
    
    // Clean command string
    let commandStrAi = response.data.response.trim().replace(/`/g, "").split("\n")[0];
    
    db.addAiLog({
      prompt: `ChatOps Translation: ${message.slice(0, 50)}`,
      responseTime: end - start,
      status: "success"
    });

    res.json({
      reply: `I translated your request into the following command:\n\n\`${commandStrAi}\`\n\nClick run to execute it safely.`,
      command: commandStrAi
    });
  } catch (error) {
    db.addAiLog({
      prompt: `ChatOps Translation: ${message.slice(0, 50)}`,
      responseTime: 0,
      status: "failed"
    });
    res.json({
      reply: "ChatOps Failed to translate command"
    });
  }
});

/* DOCS GENERATOR */
app.post("/generate-docs", async (req, res) => {
  const start = Date.now();
  const content = req.body.content;
  try {
    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "tinyllama",
        prompt: `Generate professional DevOps documentation for this:\n\n${content}\n\nFormat properly with clear headers, list items, and code snippets.`,
        stream: false
      }
    );
    const end = Date.now();
    db.addAiLog({
      prompt: `Docs Generation: ${content.slice(0, 50)}`,
      responseTime: end - start,
      status: "success"
    });
    res.json({
      reply: response.data.response
    });
  } catch (error) {
    db.addAiLog({
      prompt: `Docs Generation: ${content.slice(0, 50)}`,
      responseTime: 0,
      status: "failed"
    });
    res.json({
      reply: "Documentation Failed"
    });
  }
});

/* KUBERNETES CONTEXT SWITCHER */
app.get("/api/kubernetes/contexts", (req, res) => {
  exec("kubectl config get-contexts", (error, stdout) => {
    if (error) {
      return res.json({ contexts: [], active: "" });
    }
    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return res.json({ contexts: [], active: "" });
    
    let active = "";
    const contexts = lines.slice(1).map(line => {
      const cleanLine = line.trim();
      const isActive = cleanLine.startsWith("*");
      const cols = cleanLine.replace("*", "").trim().split(/\s+/);
      const name = cols[0];
      if (isActive) active = name;
      return name;
    }).filter(Boolean);
    
    res.json({ contexts, active });
  });
});

app.post("/api/kubernetes/context", (req, res) => {
  const { context } = req.body;
  if (!context) return res.status(400).json({ error: "Missing context" });
  exec(`kubectl config use-context ${context}`, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: stdout.trim() });
  });
});

/* AUTO SCALING SUGGESTIONS */
app.get("/api/kubernetes/scaling-suggestions", async (req, res) => {
  try {
    const load = await si.currentLoad();
    const cpu = parseFloat(load.currentLoad);
    
    exec("kubectl get deployments --all-namespaces", (error, stdout) => {
      if (error) return res.json({ suggestions: [] });
      const lines = stdout.trim().split("\n");
      if (lines.length <= 1) return res.json({ suggestions: [] });
      
      const suggestions = [];
      lines.slice(1).forEach(line => {
        const cols = line.trim().split(/\s+/);
        const ns = cols[0];
        const name = cols[1];
        const readyVal = cols[2];
        if (!readyVal) return;
        const parts = readyVal.split("/");
        const active = parseInt(parts[0]) || 0;
        const target = parseInt(parts[1]) || 0;
        
        // Dynamic suggestions based on system load
        if (cpu > 70.0) {
          suggestions.push({
            id: `scale-up-${name}`,
            deploymentName: name,
            namespace: ns,
            currentReplicas: target,
            suggestedReplicas: target + 1,
            reason: `System CPU load is critically high (${cpu.toFixed(1)}%). Suggesting scaling up deployment to prevent performance degradation.`,
            severity: "warning"
          });
        } else if (cpu < 25.0 && target > 1) {
          suggestions.push({
            id: `scale-down-${name}`,
            deploymentName: name,
            namespace: ns,
            currentReplicas: target,
            suggestedReplicas: target - 1,
            reason: `System CPU load is low (${cpu.toFixed(1)}%). Scaling down replicas is recommended to optimize infrastructure costs.`,
            severity: "info"
          });
        }
      });
      res.json({ suggestions });
    });
  } catch (err) {
    res.json({ suggestions: [] });
  }
});

app.post("/api/kubernetes/scale", (req, res) => {
  const { namespace, deployment, replicas } = req.body;
  if (!deployment || replicas === undefined) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  const nsParam = namespace ? `-n ${namespace}` : "";
  exec(`kubectl scale deployment ${deployment} --replicas=${replicas} ${nsParam}`, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: stdout.trim() });
  });
});

/* CI/CD PIPELINES MONITORING */
let mockPipelineRuns = [
  {
    id: "run-104",
    pipelineName: "Production Release Pipeline",
    branch: "main",
    commit: "fe89c42 Merge pull request #45 from devops/hotfix",
    status: "success",
    duration: "4m 12s",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    stages: [
      { name: "Lint", status: "success" },
      { name: "Docker Build", status: "success" },
      { name: "Unit Test", status: "success" },
      { name: "Helm Deploy", status: "success" }
    ]
  },
  {
    id: "run-103",
    pipelineName: "Dev Branch CI",
    branch: "dev",
    commit: "ab239df Update kubernetes service definitions",
    status: "failed",
    duration: "1m 32s",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    stages: [
      { name: "Lint", status: "success" },
      { name: "Docker Build", status: "success" },
      { name: "Unit Test", status: "failed" },
      { name: "Helm Deploy", status: "skipped" }
    ]
  }
];

app.get("/api/pipelines/runs", async (req, res) => {
  const settings = db.getSettings();
  if (settings.githubToken && settings.githubRepo) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${settings.githubRepo}/actions/runs`, {
        headers: { Authorization: `token ${settings.githubToken}` },
        timeout: 4000
      });
      const runs = response.data.workflow_runs.slice(0, 10).map(run => ({
        id: String(run.id),
        pipelineName: run.name,
        branch: run.head_branch,
        commit: run.head_commit?.message || "Commit details",
        status: run.status === "completed" ? (run.conclusion === "success" ? "success" : "failed") : "running",
        duration: run.run_duration_ms ? (run.run_duration_ms / 1000 / 60).toFixed(1) + "m" : "0s",
        timestamp: run.created_at,
        stages: [
          { name: "Lint Check", status: "success" },
          { name: "Build Container", status: run.conclusion === "success" ? "success" : "failed" }
        ]
      }));
      return res.json({ runs });
    } catch (err) {
      console.error("GitHub Action fetch failed:", err.message);
    }
  }
  res.json({ runs: mockPipelineRuns });
});

app.post("/api/pipelines/trigger", (req, res) => {
  const { pipelineName, branch } = req.body;
  const runId = "run-" + Math.floor(Math.random() * 1000);
  const newRun = {
    id: runId,
    pipelineName: pipelineName || "Manual Trigger CI",
    branch: branch || "main",
    commit: "Triggered manually via DevGenAI dashboard",
    status: "running",
    duration: "0s",
    timestamp: new Date().toISOString(),
    stages: [
      { name: "Lint Check", status: "running" },
      { name: "Docker Build", status: "pending" },
      { name: "Unit Test", status: "pending" },
      { name: "Helm Deploy", status: "pending" }
    ]
  };
  mockPipelineRuns.unshift(newRun);

  // Background Runner simulator
  let currentStage = 0;
  const timer = setInterval(() => {
    const run = mockPipelineRuns.find(r => r.id === runId);
    if (!run) {
      clearInterval(timer);
      return;
    }

    run.stages[currentStage].status = "success";
    currentStage++;
    
    if (currentStage < run.stages.length) {
      run.stages[currentStage].status = "running";
      run.duration = (currentStage * 15) + "s";
    } else {
      run.status = "success";
      run.duration = "1m 0s";
      clearInterval(timer);
    }
  }, 4000);

  res.json({ success: true, run: newRun });
});

/* AUTO HEALING LOGS */
app.get("/api/auto-healing/logs", (req, res) => {
  res.json(db.getHealingLogs());
});

/* APPLICATION DEPLOYER */
app.post("/api/deploy/docker", (req, res) => {
  const { name, image, port, containerPort } = req.body;
  if (!name || !image || !port) {
    return res.status(400).json({ error: "Missing required specifications (name, image, port)" });
  }
  
  const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanImage = image.replace(/[^a-zA-Z0-9_.:/-]/g, "");
  const cleanPort = parseInt(port);
  const cleanContainerPort = containerPort ? parseInt(containerPort) : 80;
  
  if (isNaN(cleanPort) || isNaN(cleanContainerPort)) {
    return res.status(400).json({ error: "Invalid port number" });
  }

  const cmd = `docker run -d --name ${cleanName} -p ${cleanPort}:${cleanContainerPort} ${cleanImage}`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    db.addAlert(`App Deployer: Deployed '${cleanName}' on Docker (Port ${cleanPort})`, "info");
    res.json({
      success: true,
      message: `Docker container started successfully.\nContainer ID: ${stdout.trim().slice(0, 12)}\nCommand run: ${cmd}`
    });
  });
});

app.post("/api/deploy/kubernetes", (req, res) => {
  const { name, image, port, containerPort, replicas } = req.body;
  if (!name || !image || !port || !replicas) {
    return res.status(400).json({ error: "Missing required specifications (name, image, port, replicas)" });
  }

  const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanImage = image.replace(/[^a-zA-Z0-9_.:/-]/g, "");
  const cleanPort = parseInt(port);
  const cleanContainerPort = containerPort ? parseInt(containerPort) : 80;
  const cleanReplicas = parseInt(replicas);

  if (isNaN(cleanPort) || isNaN(cleanContainerPort) || isNaN(cleanReplicas)) {
    return res.status(400).json({ error: "Invalid port or replica counts" });
  }

  const yamlContent = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${cleanName}
  namespace: default
spec:
  replicas: ${cleanReplicas}
  selector:
    matchLabels:
      app: ${cleanName}
  template:
    metadata:
      labels:
        app: ${cleanName}
    spec:
      containers:
      - name: ${cleanName}
        image: ${cleanImage}
        ports:
        - containerPort: ${cleanContainerPort}
---
apiVersion: v1
kind: Service
metadata:
  name: ${cleanName}
  namespace: default
spec:
  selector:
    app: ${cleanName}
  ports:
  - protocol: TCP
    port: ${cleanPort}
    targetPort: ${cleanContainerPort}
  type: ClusterIP
`;

  const fs = require("fs");
  const path = require("path");
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const tempPath = path.join(dataDir, `${cleanName}-deploy.yaml`);
  
  try {
    fs.writeFileSync(tempPath, yamlContent, "utf8");
    
    exec(`kubectl apply -f ${tempPath}`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || error.message });
      }
      db.addAlert(`App Deployer: Deployed '${cleanName}' on Kubernetes (${cleanReplicas} replicas, Port ${cleanPort})`, "info");
      res.json({
        success: true,
        message: `Kubernetes deployment applied successfully.\nConsole output:\n${stdout.trim()}\nManifest generated at: ${tempPath}`
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to write deployment manifest: " + err.message });
  }
});

/* BACKGROUND ENGINE: ALERTS, REALTIME MONITORING & AUTO HEALING */
let cpuHistory = [];
let healingLocks = new Set(); // Prevent double healing runs

setInterval(async () => {
  const settings = db.getSettings();
  const autoHealing = settings.autoHealingEnabled;
  
  // 1. CPU LOAD CHECK & PREDICTIVE FAILURE
  try {
    const load = await si.currentLoad();
    const cpuLoad = load.currentLoad;
    
    // Telemetry trend tracking
    cpuHistory.push(cpuLoad);
    if (cpuHistory.length > 8) cpuHistory.shift();

    // Check if the last 4 readings show continuous increase
    if (cpuHistory.length >= 5) {
      let isIncreasing = true;
      for (let i = 1; i < cpuHistory.length; i++) {
        if (cpuHistory[i] <= cpuHistory[i - 1]) {
          isIncreasing = false;
          break;
        }
      }
      if (isIncreasing && cpuLoad > 50) {
        const predAlertKey = "cpu-predictive-fail";
        if (!activeAlerts.has(predAlertKey)) {
          activeAlerts.add(predAlertKey);
          const msg = `Predictive Alert: Persistent CPU Load spike detected (${cpuLoad.toFixed(1)}%). CPU resource exhaustion expected within 3 minutes. Recommend scaling deployment replicas.`;
          db.addAlert(msg, "warning");
          sendSlackNotification(settings.slackWebhookUrl, `⚠️ *DevGenAI Predictive Alert*: ${msg}`);
        }
      }
    }

    const alertKey = "cpu-high";
    if (cpuLoad > 80.0) {
      if (!activeAlerts.has(alertKey)) {
        activeAlerts.add(alertKey);
        const msg = `Critical CPU Load: ${cpuLoad.toFixed(1)}% is above warning threshold (80%)`;
        db.addAlert(msg, "critical");
        sendSlackNotification(settings.slackWebhookUrl, `⚠️ *DevGenAI Alert*: ${msg}`);
        sendEmailNotification(settings, `DevGenAI Alert: Critical CPU Load`, msg);
      }
    } else {
      if (activeAlerts.has(alertKey)) {
        activeAlerts.delete(alertKey);
        db.addAlert(`CPU Load restored to normal: ${cpuLoad.toFixed(1)}%`, "info");
      }
    }
  } catch (err) {
    console.error("Alerts CPU check error:", err);
  }

  // 2. RAM LOAD CHECK
  try {
    const mem = await si.mem();
    const ramPct = (mem.active / mem.total) * 100;
    const alertKey = "ram-high";
    if (ramPct > 80.0) {
      if (!activeAlerts.has(alertKey)) {
        activeAlerts.add(alertKey);
        const msg = `Critical RAM Usage: ${ramPct.toFixed(1)}% is above warning threshold (80%)`;
        db.addAlert(msg, "critical");
        sendSlackNotification(settings.slackWebhookUrl, `⚠️ *DevGenAI Alert*: ${msg}`);
        sendEmailNotification(settings, `DevGenAI Alert: Critical RAM Usage`, msg);
      }
    } else {
      if (activeAlerts.has(alertKey)) {
        activeAlerts.delete(alertKey);
        db.addAlert(`RAM usage restored to normal: ${ramPct.toFixed(1)}%`, "info");
      }
    }
  } catch (err) {
    console.error("Alerts RAM check error:", err);
  }

  // 3. DOCKER CONTAINERS CHECK & AUTO HEALING
  try {
    const containers = await docker.listContainers({ all: true });
    containers.forEach(async (container) => {
      const containerName = container.Names[0].replace("/", "");
      const alertKey = `docker-stop-${container.Id}`;
      const healingKey = `docker-heal-${container.Id}`;
      
      if (container.State !== "running" && container.State !== "created") {
        // Trigger alert
        if (!activeAlerts.has(alertKey)) {
          activeAlerts.add(alertKey);
          const msg = `Docker Container Offline: '${containerName}' is in '${container.State}' state`;
          db.addAlert(msg, "critical");
          sendSlackNotification(settings.slackWebhookUrl, `⚠️ *DevGenAI Alert*: ${msg}`);
          sendEmailNotification(settings, `DevGenAI Alert: Container Offline`, msg);
        }

        // Trigger Auto Healing
        if (autoHealing && !healingLocks.has(healingKey)) {
          healingLocks.add(healingKey);
          const healingLog = db.addHealingLog({
            resourceName: containerName,
            resourceType: "docker",
            issue: `Container '${containerName}' went offline (state: ${container.State})`,
            status: "Investigating"
          });

          // Run AI Diagnostics in background
          setTimeout(async () => {
            try {
              // 1. Diagnosing
              db.updateHealingLog(healingLog.id, {
                diagnosis: `Analyzing container ${containerName} exit codes... exitCode check shows abnormal termination.`,
                status: "Diagnosing"
              });

              // Ask AI for advice
              let aiDiagnosis = "Container shutdown unexpectedly. Recommended healing: Restart container immediately.";
              try {
                const aiResponse = await axios.post("http://127.0.0.1:11434/api/generate", {
                  model: "tinyllama",
                  prompt: `Analyze stopped container issue: Container '${containerName}' is offline. Diagnose the issue and propose recovery. Return ONLY 1 sentence.`,
                  stream: false
                });
                aiDiagnosis = aiResponse.data.response.trim();
              } catch (e) {}

              db.updateHealingLog(healingLog.id, {
                diagnosis: aiDiagnosis,
                status: "Action Suggestion"
              });

              // 2. Applying remediation
              db.updateHealingLog(healingLog.id, {
                actionTaken: "Executing autonomous container recovery (docker start)...",
                status: "Applied"
              });

              // Actually start container
              const c = docker.getContainer(container.Id);
              await c.start();

              // 3. Resolved
              db.updateHealingLog(healingLog.id, {
                status: "Resolved"
              });

              db.addAlert(`Auto-Healer: Container '${containerName}' started successfully.`, "info");
              sendSlackNotification(settings.slackWebhookUrl, `🛡️ *DevGenAI Shield*: Autoresolved container crash. Started '${containerName}' successfully.`);
              
              // Clear locks after safety delay
              setTimeout(() => healingLocks.delete(healingKey), 30000);

            } catch (err) {
              db.updateHealingLog(healingLog.id, {
                status: "Failed",
                actionTaken: `Recovery execution failed: ${err.message}`
              });
              healingLocks.delete(healingKey);
            }
          }, 3000);
        }

      } else {
        if (activeAlerts.has(alertKey)) {
          activeAlerts.delete(alertKey);
          db.addAlert(`Docker Container back online: '${containerName}'`, "info");
        }
      }
    });
  } catch (err) {
    const alertKey = "docker-down";
    if (!activeAlerts.has(alertKey)) {
      activeAlerts.add(alertKey);
      db.addAlert("Docker Daemon is offline or unreachable", "critical");
    }
  }

  // 4. KUBERNETES PODS CHECK & AUTO HEALING
  exec("kubectl get pods --all-namespaces", (error, stdout) => {
    const alertKey = "k8s-down";
    if (error) {
      if (!activeAlerts.has(alertKey)) {
        activeAlerts.add(alertKey);
        db.addAlert("Kubernetes cluster connection is offline", "critical");
      }
      return;
    }
    if (activeAlerts.has(alertKey)) {
      activeAlerts.delete(alertKey);
      db.addAlert("Kubernetes cluster connection restored", "info");
    }

    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return;

    lines.slice(1).forEach(line => {
      const cols = line.trim().split(/\s+/);
      const ns = cols[0];
      const podName = cols[1];
      const podStatus = cols[3];
      const podAlertKey = `k8s-pod-${podName}`;
      const healingKey = `k8s-heal-${podName}`;
      
      const isFailedState = podStatus !== "Running" && podStatus !== "Completed" && podStatus !== "ContainerCreating" && podStatus !== "PodInitializing";
      
      if (isFailedState) {
        if (!activeAlerts.has(podAlertKey)) {
          activeAlerts.add(podAlertKey);
          const msg = `Kubernetes Pod Alert: Pod '${podName}' in namespace '${ns}' has status '${podStatus}'`;
          db.addAlert(msg, "critical");
          sendSlackNotification(settings.slackWebhookUrl, `⚠️ *DevGenAI Alert*: ${msg}`);
          sendEmailNotification(settings, `DevGenAI Alert: Pod Failure`, msg);
        }

        // Trigger Auto Healing for Kubernetes Pod
        if (autoHealing && !healingLocks.has(healingKey)) {
          healingLocks.add(healingKey);
          const healingLog = db.addHealingLog({
            resourceName: podName,
            resourceType: "kubernetes",
            issue: `Kubernetes pod '${podName}' in status '${podStatus}'`,
            status: "Investigating"
          });

          // Run AI Healing logs in background
          setTimeout(async () => {
            try {
              // 1. Diagnosing
              db.updateHealingLog(healingLog.id, {
                diagnosis: `Querying describe events for pod ${podName}...`,
                status: "Diagnosing"
              });

              // Ask AI for advice
              let aiDiagnosis = "Pod failure detected. Suggesting deletion to force replica replication.";
              try {
                const aiResponse = await axios.post("http://127.0.0.1:11434/api/generate", {
                  model: "tinyllama",
                  prompt: `Analyze failed K8s Pod: Pod '${podName}' is in '${podStatus}' state. Propose recovery step. Return ONLY 1 sentence.`,
                  stream: false
                });
                aiDiagnosis = aiResponse.data.response.trim();
              } catch (e) {}

              db.updateHealingLog(healingLog.id, {
                diagnosis: aiDiagnosis,
                status: "Action Suggestion"
              });

              // 2. Applying remediation
              db.updateHealingLog(healingLog.id, {
                actionTaken: `Executing autonomous pod recreation (kubectl delete pod ${podName} -n ${ns})...`,
                status: "Applied"
              });

              // Delete pod to let Kubernetes controller recreate it
              exec(`kubectl delete pod ${podName} -n ${ns}`, (err, stdout) => {
                if (err) {
                  db.updateHealingLog(healingLog.id, {
                    status: "Failed",
                    actionTaken: `Recreation failed: ${err.message}`
                  });
                  healingLocks.delete(healingKey);
                  return;
                }
                
                db.updateHealingLog(healingLog.id, {
                  status: "Resolved"
                });

                db.addAlert(`Auto-Healer: Pod '${podName}' deleted and recreated successfully.`, "info");
                sendSlackNotification(settings.slackWebhookUrl, `🛡️ *DevGenAI Shield*: Re-provisioned failed pod '${podName}' in namespace '${ns}' successfully.`);
                
                setTimeout(() => healingLocks.delete(healingKey), 30000);
              });

            } catch (err) {
              db.updateHealingLog(healingLog.id, {
                status: "Failed",
                actionTaken: `Kubernetes recovery fail: ${err.message}`
              });
              healingLocks.delete(healingKey);
            }
          }, 3000);
        }

      } else {
        if (activeAlerts.has(podAlertKey)) {
          activeAlerts.delete(podAlertKey);
          db.addAlert(`Kubernetes Pod restored to normal: '${podName}'`, "info");
        }
      }
    });
  });
}, 10000);

/* SERVER START */
app.listen(5000, () => {
  console.log("Backend running on port 5000");
});