import axios from "axios";

// Initialize Demo Mode if on a remote web domain or if not set
if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  if (localStorage.getItem("demoMode") === null) {
    localStorage.setItem("demoMode", "true");
  }
} else {
  if (localStorage.getItem("demoMode") === null) {
    localStorage.setItem("demoMode", "false");
  }
}

// Check helper
const isDemoModeActive = () => {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return false;
  }
  return localStorage.getItem("demoMode") === "true";
};

// Helper to notify the App of state transitions
const triggerDemoModeChange = () => {
  window.dispatchEvent(new Event("demoModeChanged"));
};

// ==========================================
// SIMULATED SYSTEM STATE (Local Storage)
// ==========================================
const loadState = (key, defaultData) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultData;
};

const saveState = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Simulated Containers
let mockContainers = loadState("mock_containers", [
  { id: "e10a28f413bc", names: "redis-cache", image: "redis:alpine", state: "running", status: "Up 3 hours" },
  { id: "f290d98ac20b", names: "payment-gateway", image: "node:18-alpine", state: "running", status: "Up 45 minutes" },
  { id: "c7782da91fef", names: "postgres-db", image: "postgres:15-alpine", state: "running", status: "Up 3 hours" },
  { id: "a569d1230bef", names: "nginx-proxy", image: "nginx:latest", state: "exited", status: "Exited (137) 5 minutes ago" }
]);

// Simulated Kubernetes context & namespace
let activeContext = loadState("mock_k8s_context", "docker-desktop");
// eslint-disable-next-line no-unused-vars
let activeNamespace = loadState("mock_k8s_namespace", "default");

// Simulated Kubernetes resources
let mockPods = loadState("mock_k8s_pods", [
  { namespace: "default", name: "auth-service-pod-5f78bdf-ab12", ready: "1/1", status: "Running", restarts: "0", age: "2h" },
  { namespace: "default", name: "payment-worker-pod-9c01f3e-de45", ready: "1/1", status: "Running", restarts: "1", age: "45m" },
  { namespace: "default", name: "postgres-db-pod-7d88c2b-gh78", ready: "1/1", status: "Running", restarts: "0", age: "2h" },
  { namespace: "default", name: "nginx-ingress-pod-1a2b3c4-ij90", ready: "1/1", status: "Running", restarts: "0", age: "5h" },
  { namespace: "kube-system", name: "kube-dns-5f78bdf-zxcv", ready: "3/3", status: "Running", restarts: "2", age: "14d" },
  { namespace: "kube-system", name: "kube-proxy-abcde", ready: "1/1", status: "Running", restarts: "0", age: "14d" },
  { namespace: "monitoring", name: "prometheus-server-0", ready: "2/2", status: "Running", restarts: "0", age: "4d" }
]);

let mockDeployments = loadState("mock_k8s_deployments", [
  { namespace: "default", name: "auth-service", ready: "1/1", upToDate: "1", available: "1", age: "2h" },
  { namespace: "default", name: "payment-worker", ready: "1/1", upToDate: "1", available: "1", age: "45m" },
  { namespace: "default", name: "postgres-db", ready: "1/1", upToDate: "1", available: "1", age: "2h" }
]);

let mockServices = loadState("mock_k8s_services", [
  { namespace: "default", name: "auth-service-svc", type: "ClusterIP", clusterIp: "10.96.14.23", externalIp: "<none>", ports: "8080/TCP", age: "2h" },
  { namespace: "default", name: "payment-worker-svc", type: "ClusterIP", clusterIp: "10.96.44.89", externalIp: "<none>", ports: "3000/TCP", age: "45m" },
  { namespace: "default", name: "postgres-db-svc", type: "ClusterIP", clusterIp: "10.96.100.5", externalIp: "<none>", ports: "5432/TCP", age: "2h" }
]);

// Simulated Settings
let mockSettings = loadState("mock_settings", {
  slackWebhookUrl: "https://hooks.slack.com/services/T00/B00/X00",
  smtpHost: "smtp.mailtrap.io",
  smtpPort: "2525",
  smtpUser: "demo-user",
  smtpPass: "demo-pass",
  smtpRecipient: "devops@example.com",
  autoHealingEnabled: true,
  githubToken: "ghp_demoToken123456789",
  githubRepo: "google-deepmind/devgenai-platform",
  jenkinsUrl: "http://jenkins.local:8080",
  jenkinsUser: "jenkins-admin",
  jenkinsToken: "jkn_demoToken556677"
});

// Simulated Alerts and Notifications
let mockAlerts = loadState("mock_alerts", [
  "[INFO] Docker Daemon connected successfully",
  "[INFO] Kubernetes Cluster connection synced (context: docker-desktop)",
  "[INFO] AI Monitor is Active - TinyLlama (local/simulated) reachable",
  "[WARNING] System RAM is high (76.8% active usage)",
  "[CRITICAL] Docker Container Offline: 'nginx-proxy' is in 'exited' state"
]);

let mockNotifications = loadState("mock_notifications", [
  "Docker Daemon connected successfully",
  "Kubernetes Cluster connection synced (context: docker-desktop)",
  "AI Monitor is Active - TinyLlama (local/simulated) reachable",
  "System RAM is high (76.8% active usage)",
  "Docker Container Offline: 'nginx-proxy' is in 'exited' state"
]);

// Simulated Healing Timeline Logs
let mockHealingLogs = loadState("mock_healing_logs", [
  {
    id: 1718220000000,
    resourceName: "nginx-proxy",
    resourceType: "docker",
    issue: "Container 'nginx-proxy' went offline (state: exited)",
    diagnosis: "Container terminated due to configuration reload mismatch. Exit code 137 (SIGKILL).",
    actionTaken: "Manual intervention mode selected. Waiting for administrator approval or start trigger.",
    status: "Action Suggestion",
    timestamp: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 1718210000000,
    resourceName: "auth-service-pod-5f78bdf-ab12",
    resourceType: "kubernetes",
    issue: "Kubernetes pod 'auth-service-pod-5f78bdf-ab12' in status 'CrashLoopBackOff'",
    diagnosis: "Liveness probe failed repeatedly. JVM Heap memory exhaustion.",
    actionTaken: "Executed autonomous pod recreation (kubectl delete pod auth-service-pod-5f78bdf-ab12 -n default). Pod restarted and healthy.",
    status: "Resolved",
    timestamp: new Date(Date.now() - 1200000).toISOString()
  }
]);

// Simulated Pipeline Runs
let mockPipelineRuns = loadState("mock_pipeline_runs", [
  {
    id: "run-104",
    pipelineName: "Production Release Pipeline",
    branch: "main",
    commit: "fe89c42 Merge pull request #45 from devops/hotfix",
    status: "success",
    duration: "4m 12s",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    stages: [
      { name: "Lint Check", status: "success" },
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
      { name: "Lint Check", status: "success" },
      { name: "Docker Build", status: "success" },
      { name: "Unit Test", status: "failed" },
      { name: "Helm Deploy", status: "skipped" }
    ]
  }
]);

// Simulated AI Prompts history
let mockPrompts = loadState("mock_prompts", [
  { id: 1, version: 1, prompt: "Deploy a production-grade Redis cluster with replication and persistence", date: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, version: 2, prompt: "Deploy a production-grade Redis cluster with persistence, security, and a web UI", date: new Date(Date.now() - 3600000).toISOString() }
]);

let mockAiLogs = loadState("mock_ai_logs", [
  { id: 1, prompt: "Incident Resolution: nginx-proxy", responseTime: 2350, status: "success", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 2, prompt: "YAML Generation: Redis cluster", responseTime: 1840, status: "success", timestamp: new Date(Date.now() - 3600000).toISOString() }
]);

// Brief CPU load multiplier for actions
let cpuSpikeTime = 0;

// Dynamic CPU/RAM values helper
const getSystemMetrics = () => {
  const now = Date.now();
  let baseCpu = 12.5 + Math.sin(now / 5000) * 3;
  if (now < cpuSpikeTime) {
    baseCpu += 45; // Simulated spike on container action
  }
  const cpu = Math.min(98.5, Math.max(1.2, baseCpu)).toFixed(2);
  const activeRam = (4.2 + Math.cos(now / 8000) * 0.4).toFixed(2);
  return {
    cpu,
    ram: activeRam,
    totalRam: "16.00",
    platform: "win32",
    hostname: "devops-showcase-pc"
  };
};

// Add container action logs
const logActivity = (msg, level = "info") => {
  const formatted = `[${level.toUpperCase()}] ${msg}`;
  mockAlerts.unshift(formatted);
  if (mockAlerts.length > 50) mockAlerts.pop();
  saveState("mock_alerts", mockAlerts);

  mockNotifications.unshift(msg);
  if (mockNotifications.length > 50) mockNotifications.pop();
  saveState("mock_notifications", mockNotifications);
};

// Background simulation loop for active healing
setInterval(() => {
  if (!isDemoModeActive()) return;

  // Periodically crash a container to show auto healing
  const running = mockContainers.filter(c => c.state === "running");
  if (running.length > 2 && Math.random() < 0.08 && mockSettings.autoHealingEnabled) {
    // Choose one to crash (except payment-gateway)
    const target = running.find(c => c.names !== "payment-gateway" && c.names !== "postgres-db");
    if (target) {
      target.state = "exited";
      target.status = "Exited (137) Just now";
      saveState("mock_containers", mockContainers);
      
      const containerName = target.names;
      logActivity(`Docker Container Offline: '${containerName}' is in 'exited' state`, "critical");
      triggerDemoModeChange();

      // Trigger simulated healing log
      const newLog = {
        id: Date.now(),
        resourceName: containerName,
        resourceType: "docker",
        issue: `Container '${containerName}' went offline (state: exited)`,
        diagnosis: "Checking container memory parameters... AI diagnosis: Process terminated due to OOM limit.",
        actionTaken: "Executing autonomous container recovery (docker start)...",
        status: "Applied",
        timestamp: new Date().toISOString()
      };
      mockHealingLogs.unshift(newLog);
      saveState("mock_healing_logs", mockHealingLogs);

      // Auto start it back up in 8 seconds
      setTimeout(() => {
        const c = mockContainers.find(x => x.names === containerName);
        if (c) {
          c.state = "running";
          c.status = "Up 1 second (Auto-Healed)";
          saveState("mock_containers", mockContainers);
          
          // Resolve healing log
          const log = mockHealingLogs.find(l => l.resourceName === containerName && l.status === "Applied");
          if (log) {
            log.status = "Resolved";
            saveState("mock_healing_logs", mockHealingLogs);
          }
          
          logActivity(`Auto-Healer: Container '${containerName}' started successfully.`, "success");
          triggerDemoModeChange();
        }
      }, 8000);
    }
  }
}, 15000);

// ==========================================
// MOCK HTTP REQUEST HANDLER
// ==========================================
const handleMockRequest = async (config) => {
  const method = (config.method || "GET").toUpperCase();
  const url = config.url || "";
  
  // Clean url to path
  const path = url.replace("http://localhost:5000", "");

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

  console.log(`[Demo Interceptor] ${method} ${path}`, config.data);

  let responseData = {};
  let status = 200;

  // System Stats
  if (path === "/system-stats") {
    responseData = getSystemMetrics();
  }
  // Alerts
  else if (path === "/alerts") {
    responseData = {
      alerts: mockAlerts,
      history: mockAlerts.map((a, idx) => ({
        id: idx,
        message: a.replace(/\[[A-Z]+\]\s/, ""),
        severity: a.includes("[CRITICAL]") ? "critical" : a.includes("[WARNING]") ? "warning" : "info",
        timestamp: new Date().toISOString()
      }))
    };
  }
  // Notifications
  else if (path === "/notifications") {
    responseData = { notifications: mockNotifications };
  }
  // Settings
  else if (path === "/settings") {
    if (method === "GET") {
      responseData = mockSettings;
    } else {
      const data = JSON.parse(config.data || "{}");
      mockSettings = { ...mockSettings, ...data };
      saveState("mock_settings", mockSettings);
      responseData = { success: true, settings: mockSettings };
    }
  }
  // Docker Stats
  else if (path === "/docker-stats") {
    responseData = {
      totalContainers: mockContainers.length,
      containers: mockContainers
    };
  }
  // Docker Control Start/Stop/Restart
  else if (path.startsWith("/docker/container/") && (path.endsWith("/start") || path.endsWith("/stop") || path.endsWith("/restart"))) {
    const parts = path.split("/");
    const id = parts[3];
    const action = parts[4];
    const container = mockContainers.find(c => c.id === id);
    
    cpuSpikeTime = Date.now() + 3000; // Trigger system CPU spike

    if (container) {
      if (action === "start" || action === "restart") {
        container.state = "running";
        container.status = "Up Just now";
        logActivity(`Docker Container started manually: '${container.names}'`, "info");
      } else {
        container.state = "exited";
        container.status = "Exited (0) Just now";
        logActivity(`Docker Container stopped manually: '${container.names}'`, "warning");
      }
      saveState("mock_containers", mockContainers);
      responseData = { success: true, message: `Container ${id} ${action}ed` };
    } else {
      status = 404;
      responseData = { error: "Container not found" };
    }
  }
  // Docker Logs
  else if (path.startsWith("/docker/container/") && path.endsWith("/logs")) {
    const parts = path.split("/");
    const id = parts[3];
    const container = mockContainers.find(c => c.id === id);
    if (container) {
      responseData = {
        logs: `2026-06-12T20:00:01.002Z Starting application listener...
2026-06-12T20:00:02.108Z Connecting to database pool host...
2026-06-12T20:00:03.245Z Database successfully connected. Ready for queries.
2026-06-12T20:02:15.549Z GET /api/v1/health - 200 OK - 1.24ms
2026-06-12T20:05:40.902Z GET /api/v1/resources - 200 OK - 15.68ms
2026-06-12T20:10:00.000Z Running scheduled cache invalidation job...
2026-06-12T20:10:00.104Z Cache cleared: 14 keys evicted. Status: Success.
${container.state === "exited" ? "2026-06-12T20:25:00.000Z Service shutdown requested (SIGTERM / SIGKILL)\n2026-06-12T20:25:01.050Z Process exited with status 137" : "2026-06-12T20:25:00.000Z Server running in stable condition."}`
      };
    } else {
      status = 404;
      responseData = { error: "Container not found" };
    }
  }
  // K8s Namespaces
  else if (path === "/kubernetes/namespaces") {
    responseData = { namespaces: ["default", "kube-system", "monitoring", "devgenai-apps"] };
  }
  // K8s Contexts
  else if (path === "/api/kubernetes/contexts") {
    responseData = {
      contexts: ["docker-desktop", "minikube-cluster", "aws-eks-production"],
      active: activeContext
    };
  }
  // K8s Context Switch
  else if (path === "/api/kubernetes/context") {
    const data = JSON.parse(config.data || "{}");
    activeContext = data.context;
    saveState("mock_k8s_context", activeContext);
    logActivity(`Kubernetes switched context to '${activeContext}'`, "info");
    responseData = { success: true, message: `Switched context to ${activeContext}` };
  }
  // K8s Pods
  else if (path.startsWith("/kubernetes/pods")) {
    const nsParam = config.params?.namespace || "";
    responseData = {
      pods: nsParam ? mockPods.filter(p => p.namespace === nsParam) : mockPods
    };
  }
  // K8s Deployments
  else if (path.startsWith("/kubernetes/deployments")) {
    const nsParam = config.params?.namespace || "";
    responseData = {
      deployments: nsParam ? mockDeployments.filter(d => d.namespace === nsParam) : mockDeployments
    };
  }
  // K8s Services
  else if (path.startsWith("/kubernetes/services")) {
    const nsParam = config.params?.namespace || "";
    responseData = {
      services: nsParam ? mockServices.filter(s => s.namespace === nsParam) : mockServices
    };
  }
  // K8s Scale deployment
  else if (path === "/api/kubernetes/scale") {
    const data = JSON.parse(config.data || "{}");
    const { namespace, deployment, replicas } = data;
    const dep = mockDeployments.find(d => d.name === deployment && d.namespace === (namespace || "default"));
    if (dep) {
      dep.ready = `${replicas}/${replicas}`;
      dep.available = String(replicas);
      saveState("mock_k8s_deployments", mockDeployments);
      
      // Update associated mock pods
      mockPods = mockPods.filter(p => !(p.name.startsWith(deployment) && p.namespace === (namespace || "default")));
      for (let i = 0; i < replicas; i++) {
        const podId = Math.random().toString(36).substring(2, 6);
        mockPods.push({
          namespace: namespace || "default",
          name: `${deployment}-pod-${podId}`,
          ready: "1/1",
          status: "Running",
          restarts: "0",
          age: "Just now"
        });
      }
      saveState("mock_k8s_pods", mockPods);

      logActivity(`Kubernetes Deployment '${deployment}' scaled to ${replicas} replicas`, "info");
      responseData = { success: true, message: `Deployment ${deployment} scaled successfully` };
    } else {
      status = 404;
      responseData = { error: "Deployment not found" };
    }
  }
  // K8s Scaling Suggestions
  else if (path === "/api/kubernetes/scaling-suggestions") {
    // Return scaling suggestions depending on simulated system load
    const cpu = parseFloat(getSystemMetrics().cpu);
    const suggestions = [];
    if (cpu > 70.0) {
      mockDeployments.forEach(d => {
        suggestions.push({
          id: `scale-up-${d.name}`,
          deploymentName: d.name,
          namespace: d.namespace,
          currentReplicas: parseInt(d.available) || 1,
          suggestedReplicas: (parseInt(d.available) || 1) + 1,
          reason: `High simulated node CPU usage (${cpu}%). Scale up recommended.`,
          severity: "warning"
        });
      });
    } else {
      // Suggest cost savings scaling down
      mockDeployments.forEach(d => {
        const reps = parseInt(d.available) || 1;
        if (reps > 1) {
          suggestions.push({
            id: `scale-down-${d.name}`,
            deploymentName: d.name,
            namespace: d.namespace,
            currentReplicas: reps,
            suggestedReplicas: reps - 1,
            reason: `Resource utilization is low. Scale down to 1 replica to optimize costs.`,
            severity: "info"
          });
        }
      });
    }
    responseData = { suggestions };
  }
  // Auto Healing Logs
  else if (path === "/api/auto-healing/logs") {
    responseData = mockHealingLogs;
  }
  // CI/CD Pipelines runs
  else if (path === "/api/pipelines/runs") {
    responseData = { runs: mockPipelineRuns };
  }
  // Trigger CI/CD Pipeline
  else if (path === "/api/pipelines/trigger") {
    const data = JSON.parse(config.data || "{}");
    const { pipelineName, branch } = data;
    const runId = "run-" + Math.floor(Math.random() * 900 + 100);
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
    saveState("mock_pipeline_runs", mockPipelineRuns);
    logActivity(`Pipeline '${newRun.pipelineName}' run #${runId} triggered`, "info");

    // Simulate pipeline runner in background
    let currentStage = 0;
    const interval = setInterval(() => {
      const run = mockPipelineRuns.find(r => r.id === runId);
      if (!run) {
        clearInterval(interval);
        return;
      }
      run.stages[currentStage].status = "success";
      currentStage++;
      if (currentStage < run.stages.length) {
        run.stages[currentStage].status = "running";
        run.duration = (currentStage * 12) + "s";
      } else {
        run.status = "success";
        run.duration = "48s";
        logActivity(`Pipeline '${run.pipelineName}' run #${runId} completed successfully`, "success");
        clearInterval(interval);
      }
      saveState("mock_pipeline_runs", mockPipelineRuns);
      triggerDemoModeChange(); // trigger update in UI
    }, 3000);

    responseData = { success: true, run: newRun };
  }
  // Deploy app to Docker
  else if (path === "/api/deploy/docker") {
    const data = JSON.parse(config.data || "{}");
    const { name, image, port } = data;
    const id = Math.random().toString(16).substring(2, 14);
    const newContainer = {
      id: id.substring(0, 12),
      names: name,
      image: image,
      state: "running",
      status: "Up Just now"
    };
    mockContainers.push(newContainer);
    saveState("mock_containers", mockContainers);
    logActivity(`App Deployer: Deployed '${name}' on Docker (Port ${port})`, "success");
    
    responseData = {
      success: true,
      message: `Docker container started successfully.\nContainer ID: ${newContainer.id}\nCommand run: docker run -d --name ${name} -p ${port}:80 ${image}`
    };
  }
  // Deploy app to Kubernetes
  else if (path === "/api/deploy/kubernetes") {
    const data = JSON.parse(config.data || "{}");
    // eslint-disable-next-line no-unused-vars
    const { name, image, port, replicas } = data;
    
    // Add deployment
    mockDeployments.push({
      namespace: "default",
      name: name,
      ready: `${replicas}/${replicas}`,
      upToDate: String(replicas),
      available: String(replicas),
      age: "Just now"
    });
    saveState("mock_k8s_deployments", mockDeployments);

    // Add service
    mockServices.push({
      namespace: "default",
      name: `${name}-svc`,
      type: "ClusterIP",
      clusterIp: `10.96.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}`,
      externalIp: "<none>",
      ports: `${port}/TCP`,
      age: "Just now"
    });
    saveState("mock_k8s_services", mockServices);

    // Add pods
    for (let i = 0; i < parseInt(replicas); i++) {
      const podId = Math.random().toString(36).substring(2, 6);
      mockPods.push({
        namespace: "default",
        name: `${name}-pod-${podId}`,
        ready: "1/1",
        status: "Running",
        restarts: "0",
        age: "Just now"
      });
    }
    saveState("mock_k8s_pods", mockPods);

    logActivity(`App Deployer: Deployed '${name}' on Kubernetes (${replicas} replicas, Port ${port})`, "success");
    responseData = {
      success: true,
      message: `Kubernetes deployment applied successfully.\nManifest generated and kubectl apply executed.`
    };
  }
  // Ask AI
  else if (path === "/ask-ai") {
    const data = JSON.parse(config.data || "{}");
    const msg = data.message || "";
    let reply = "I am DevGenAI assistant. Can you specify your DevOps query?";
    
    if (msg.toLowerCase().includes("docker")) {
      reply = `To manage Docker containers, you can use these essential commands:
- **List running containers**: \`docker ps\`
- **List all containers**: \`docker ps -a\`
- **Run a new container**: \`docker run -d -p 80:80 --name my-app nginx\`
- **Stop a container**: \`docker stop <id-or-name>\`
- **View container logs**: \`docker logs -f <id-or-name>\``;
    } else if (msg.toLowerCase().includes("kubernetes") || msg.toLowerCase().includes("k8s") || msg.toLowerCase().includes("kubectl")) {
      reply = `Here are common Kubernetes commands to interact with your cluster:
- **Get pods**: \`kubectl get pods -A\`
- **Get services**: \`kubectl get svc -n default\`
- **Describe pod details**: \`kubectl describe pod <pod-name>\`
- **Scale deployment**: \`kubectl scale deployment <deploy-name> --replicas=3\`
- **Apply manifest file**: \`kubectl apply -f manifest.yaml\``;
    } else if (msg.toLowerCase().includes("ci/cd") || msg.toLowerCase().includes("pipeline") || msg.toLowerCase().includes("jenkins")) {
      reply = `A modern CI/CD pipeline consists of:
1. **Lint & Static Code Analysis**: Checks style guidelines and runs formatting checks.
2. **Build Stage**: Compiles source code or packages a Docker container.
3. **Unit & Integration Tests**: Runs tests to verify code stability.
4. **Deploy Stage**: Registers container images in Registry and applies Helm deployment templates to Kubernetes.`;
    } else {
      reply = `Thank you for asking! I'm here to support your DevOps monitoring and automation.
- **Current Node Health**: Running stable (CPU: ${getSystemMetrics().cpu}%, RAM: ${getSystemMetrics().ram} GB)
- **Active Alerts**: ${mockAlerts.filter(a => a.includes("[CRITICAL]")).length} critical issues active.
Let me know if you would like me to generate Kubernetes manifests, analyze Docker crash logs, or execute a ChatOps command!`;
    }
    
    mockAiLogs.push({
      id: Date.now(),
      prompt: `Chat: ${msg.slice(0, 40)}`,
      responseTime: 800,
      status: "success",
      timestamp: new Date().toISOString()
    });
    saveState("mock_ai_logs", mockAiLogs);

    responseData = { reply };
  }
  // Incident Resolver
  else if (path === "/incident-resolver") {
    const data = JSON.parse(config.data || "{}");
    const issue = data.issue || "";
    responseData = {
      reply: `### AI Diagnostic Report: Incident Diagnostics
      
**1. Probable Root Cause:**
The issue "${issue}" is typical of container memory limits restriction (OOM termination) or db connectivity socket timeout. If this is a pod crash, Kubernetes terminated the container because its memory usage exceeded the spec limit.

**2. Proposed Remediation:**
- **Step A**: Raise memory limits in the deployment template to at least 512Mi.
- **Step B**: Configure read/write timeouts on DB client parameters.
- **Step C**: Force a rollout restart of the target deployment.

**3. Execution command:**
\`\`\`bash
kubectl patch deployment <deployment-name> -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"512Mi"}}}]}}}}'
kubectl rollout restart deployment/<deployment-name>
\`\`\``
    };
  }
  // YAML Generator
  else if (path === "/generate-yaml") {
    const data = JSON.parse(config.data || "{}");
    const prompt = data.prompt || "";
    responseData = {
      reply: `Here are the configuration files generated for your request: "${prompt}":

### 1. Dockerfile
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD [ "node", "server.js" ]
\`\`\`

---

### 2. Kubernetes Deployment & Service Manifest
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: express-app
  namespace: default
  labels:
    app: express-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: express-app
  template:
    metadata:
      labels:
        app: express-app
    spec:
      containers:
      - name: web
        image: express-app:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: express-app-service
  namespace: default
spec:
  selector:
    app: express-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
\`\`\`

---

### 3. GitHub Actions CI/CD Pipeline Workflow
\`\`\`yaml
name: Node Build & Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
    - run: npm ci
    - run: npm test --if-present
    - name: Docker Login & Build
      run: |
        docker build -t express-app:latest .
        # docker push express-app:latest
\`\`\``
    };
  }
  // ChatOps Routing command
  else if (path === "/chatops") {
    const data = JSON.parse(config.data || "{}");
    const msg = data.message || "";
    let command = "kubectl get pods";
    
    if (msg.toLowerCase().includes("docker") || msg.toLowerCase().includes("container")) {
      command = "docker ps -a";
    } else if (msg.toLowerCase().includes("image")) {
      command = "docker images";
    } else if (msg.toLowerCase().includes("deployment")) {
      command = "kubectl get deployments -n default";
    } else if (msg.toLowerCase().includes("service")) {
      command = "kubectl get svc -A";
    }

    responseData = {
      reply: `I translated your ChatOps command request into the following executable shell command:
      
\`${command}\`

Click the run command button below to execute this safely.`,
      command: command
    };
  }
  // ChatOps Command Execution
  else if (path === "/chatops/execute") {
    const data = JSON.parse(config.data || "{}");
    const cmd = data.command || "";
    let stdout = "";
    
    if (cmd.startsWith("docker ps")) {
      stdout = `CONTAINER ID   IMAGE             COMMAND                  CREATED         STATUS         PORTS                  NAMES
e10a28f413bc   redis:alpine      "docker-entrypoint.s…"   3 hours ago     Up 3 hours     0.0.0.0:6379->6379/tcp redis-cache
f290d98ac20b   node:18-alpine    "docker-entrypoint.s…"   45 minutes ago  Up 45 minutes  0.0.0.0:80->80/tcp     payment-gateway
c7782da91fef   postgres:15-alp   "docker-entrypoint.s…"   3 hours ago     Up 3 hours     0.0.0.0:5432->5432/tcp postgres-db
a569d1230bef   nginx:latest      "/docker-entrypoint.…"   5 minutes ago   Exited (137)                          nginx-proxy`;
    } else if (cmd.startsWith("docker images")) {
      stdout = `REPOSITORY          TAG           IMAGE ID       CREATED         SIZE
redis               alpine        7f99d98bc100   3 days ago      32.4MB
nginx               latest        c38ac87920ab   1 week ago      142MB
postgres            15-alpine     f29da9f1a23b   2 weeks ago     379MB
node                18-alpine     e29fba900bc1   3 weeks ago     174MB`;
    } else if (cmd.includes("pods")) {
      stdout = `NAMESPACE     NAME                                      READY   STATUS    RESTARTS   AGE
default       auth-service-pod-5f78bdf-ab12             1/1     Running   0          2h
default       payment-worker-pod-9c01f3e-de45           1/1     Running   1          45m
default       postgres-db-pod-7d88c2b-gh78             1/1     Running   0          2h
default       nginx-ingress-pod-1a2b3c4-ij90            1/1     Running   0          5h
kube-system   kube-dns-5f78bdf-zxcv                     3/3     Running   2          14d
kube-system   kube-proxy-abcde                          1/1     Running   0          14d
monitoring    prometheus-server-0                       2/2     Running   0          4d`;
    } else if (cmd.includes("deployments")) {
      stdout = `NAMESPACE   NAME             READY   UP-TO-DATE   AVAILABLE   AGE
default     auth-service     1/1     1            1           2h
default     payment-worker   1/1     1            1           45m
default     postgres-db      1/1     1            1           2h`;
    } else if (cmd.includes("services") || cmd.includes("svc")) {
      stdout = `NAMESPACE     NAME                 TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                  AGE
default       kubernetes           ClusterIP   10.96.0.1      <none>        443/TCP                  14d
default       auth-service-svc     ClusterIP   10.96.14.23    <none>        8080/TCP                 2h
default       payment-worker-svc   ClusterIP   10.96.44.89    <none>        3000/TCP                 45m
default       postgres-db-svc      ClusterIP   10.96.100.5    <none>        5432/TCP                 2h`;
    } else {
      stdout = `Executing command: ${cmd}
Status: 0 Success
Output: Command completed on cluster node. No standard error output.`;
    }

    responseData = {
      stdout: stdout,
      stderr: "",
      exitCode: 0
    };
  }
  // Generate docs
  else if (path === "/generate-docs") {
    const data = JSON.parse(config.data || "{}");
    const content = data.content || "";
    responseData = {
      reply: `# DevOps Documentation: System Architecture & Deployment Instructions

This documentation provides configuration blueprints, build requirements, and runtime properties generated based on: *"${content.slice(0, 50)}..."*.

---

## 1. Runtime Environment Requirements
- **Container Host**: Docker Desktop (Engine 24.0+) or Kubernetes Cluster (v1.26+)
- **System Memory Profile**: Recommended 4GiB for staging, 8GiB for cluster pods
- **Base Image Stack**: Linux alpine optimized configurations for reduced surface vulnerabilities

## 2. Infrastructure Setup & Steps
1. **Verify daemon connection**:
   \`\`\`bash
   docker info
   kubectl cluster-info
   \`\`\`
2. **Apply configurations**:
   Review generated YAML values, confirm ingress endpoints, then run \`kubectl apply -f manifest.yaml\`.
3. **Logs Monitoring**:
   Monitor rollout lifecycle using \`kubectl rollout status deployment/app\`.

## 3. Maintenance Guide
- Ensure active probes are configured to run health-checks.
- Review memory pressure alerts on dashboard and scale replicas accordingly.
- Rotate service tokens and access certificates every 90 days.`
    };
  }
  // Prompt templates
  else if (path === "/prompts") {
    responseData = mockPrompts;
  }
  // Save AI Prompt template
  else if (path === "/save-prompt") {
    const data = JSON.parse(config.data || "{}");
    const prompt = data.prompt;
    const newPrompt = {
      id: Date.now(),
      version: mockPrompts.length + 1,
      prompt: prompt,
      date: new Date().toISOString()
    };
    mockPrompts.push(newPrompt);
    saveState("mock_prompts", mockPrompts);
    responseData = { success: true, prompts: mockPrompts };
  }
  // Rollback Prompt
  else if (path === "/rollback") {
    if (mockPrompts.length > 0) {
      mockPrompts.pop();
      saveState("mock_prompts", mockPrompts);
    }
    responseData = { success: true, prompts: mockPrompts };
  }
  // PromptOps analytics
  else if (path === "/promptops/analytics") {
    const total = mockAiLogs.length;
    const success = mockAiLogs.filter(l => l.status === "success").length;
    const failed = total - success;
    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 100;
    const avgLatency = total > 0 
      ? (mockAiLogs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / total).toFixed(0) 
      : 0;

    responseData = {
      totalRequests: total,
      successRate,
      avgLatency,
      success,
      failed,
      logs: mockAiLogs.slice(-20)
    };
  }

  return {
    data: responseData,
    status: status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
    config: config,
    request: {}
  };
};

// ==========================================
// INTERCEPT AXIOS REQUESTS
// ==========================================
const originalAdapter = axios.defaults.adapter;

axios.defaults.adapter = async function (config) {
  if (isDemoModeActive() && config.url && (config.url.startsWith("http://localhost:5000") || config.url.startsWith("/"))) {
    return handleMockRequest(config);
  }

  try {
    // If not in demo mode, perform normal request
    if (typeof originalAdapter === "function") {
      return await originalAdapter(config);
    }
    // Fallback if config adapter exists
    if (config.adapter) {
      return await config.adapter(config);
    }
    throw new Error("Axios default adapter not found");
  } catch (error) {
    // Intercept network/connection errors and auto fall back
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal && (error.message === "Network Error" || error.code === "ERR_NETWORK" || error.message.includes("network"))) {
      console.warn("[Demo Interceptor] Live backend is unreachable. Activating Demo Mode automatically.");
      localStorage.setItem("demoMode", "true");
      triggerDemoModeChange();
      return handleMockRequest(config);
    }
    throw error;
  }
};

// ==========================================
// INTERCEPT FETCH REQUESTS
// ==========================================
const originalFetch = window.fetch;

window.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : (input && input.url) ? input.url : "";
  
  if (isDemoModeActive() && url && (url.startsWith("http://localhost:5000") || url.startsWith("/"))) {
    console.log(`[Demo Fetch Interceptor] Intercepted: ${url}`);
    
    // Simulate config for mock handler
    const mockConfig = {
      url,
      method: init ? init.method : "GET",
      data: init ? init.body : undefined
    };
    
    const mockRes = await handleMockRequest(mockConfig);
    
    // Mock response object
    return {
      ok: mockRes.status === 200,
      status: mockRes.status,
      statusText: mockRes.statusText,
      json: async () => mockRes.data,
      text: async () => typeof mockRes.data === "string" ? mockRes.data : JSON.stringify(mockRes.data),
      headers: new Headers({ "content-type": "application/json" })
    };
  }

  try {
    return await originalFetch(input, init);
  } catch (error) {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal && (error.message === "Failed to fetch" || error.message.includes("fetch") || error.message.includes("NetworkError"))) {
      console.warn("[Demo Fetch Interceptor] Live backend is unreachable. Activating Demo Mode automatically.");
      localStorage.setItem("demoMode", "true");
      triggerDemoModeChange();
      
      // Handle using mock
      const mockConfig = {
        url,
        method: init ? init.method : "GET",
        data: init ? init.body : undefined
      };
      
      const mockRes = await handleMockRequest(mockConfig);
      
      return {
        ok: mockRes.status === 200,
        status: mockRes.status,
        statusText: mockRes.statusText,
        json: async () => mockRes.data,
        text: async () => typeof mockRes.data === "string" ? mockRes.data : JSON.stringify(mockRes.data),
        headers: new Headers({ "content-type": "application/json" })
      };
    }
    throw error;
  }
};
