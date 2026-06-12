import axios from "axios";
import React, { useState, useEffect } from "react";
import "./App.css";
import supabase from "./supabase";

import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  Link
} from "react-router-dom";

import {
  FaRobot,
  FaDocker,
  FaCloud,
  FaServer,
  FaBell,
  FaMoon,
  FaSun,
  FaUserCircle,
  FaSearch,
  FaSignOutAlt,
  FaDownload,
  FaCogs,
  FaExclamationTriangle,
  FaTerminal,
  FaFileCode,
  FaBook,
  FaSync,
  FaPlay,
  FaStop,
  FaCheckCircle,
  FaInfoCircle,
  FaChevronRight
} from "react-icons/fa";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";

import {
  FaCodeBranch,
  FaUndo,
  FaFlask
} from "react-icons/fa";

/* LOGIN */

function Login({ setSession }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleAuth = async () => {
    const triggerDevMode = (isSilent = false) => {
      if (!isSilent) {
        alert("Notice: Supabase credentials bypassed. Logging in using Developer Mode.");
      }
      const devSession = {
        user: {
          email: email || "admin@example.com",
          user_metadata: {
            name: name || (email ? email.split("@")[0] : "Administrator")
          }
        }
      };
      setSession(devSession);
    };

    const isDemo = localStorage.getItem("demoMode") === "true";
    if (isDemo) {
      triggerDevMode(true);
      return;
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          triggerDevMode();
        } else {
          setSession(data.session);
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (error) {
          triggerDevMode();
        } else {
          alert("Registration Successful. Please check your email to verify your account or proceed to login.");
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.warn("Supabase Auth server failed, using local Developer Mode:", err);
      triggerDevMode();
    }
  };

  return (
    <div className="authPage">
      <div className="authBox">
        <h1>DevGenAI</h1>
        <p>AI Powered DevOps Platform</p>
        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="mainBtn" onClick={handleAuth}>
          {isLogin ? "Login" : "Register"}
        </button>
        <p className="switchAuth" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Create new account" : "Already have account?"}
        </p>
      </div>
    </div>
  );
}

/* CONTAINER LOGS MODAL */

function LogsModal({ container, onClose }) {
  const [logs, setLogs] = useState("Fetching logs...");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/docker/container/${container.id}/logs`);
      setLogs(response.data.logs || "No logs available.");
    } catch (error) {
      setLogs("Error loading logs: " + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.id]);

  return (
    <div className="modalOverlay">
      <div className="modalBox">
        <div className="modalHeader">
          <h3>Logs: {container.names} ({container.image})</h3>
          <button className="closeBtn" onClick={onClose}>&times;</button>
        </div>
        <div className="modalBody">
          <pre className="terminalLogs">
            {loading ? "Streaming standard output..." : logs}
          </pre>
        </div>
        <div className="modalFooter">
          <button className="mainBtn" onClick={fetchLogs} disabled={loading}>
            <FaSync className={loading ? "spin" : ""} /> Refresh Logs
          </button>
          <button className="secondaryBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* DASHBOARD */

function Dashboard({ darkMode, toggleTheme, session }) {
  const [dockerData, setDockerData] = useState([]);
  const [kubePods, setKubePods] = useState([]);
  const [kubeDeployments, setKubeDeployments] = useState([]);
  const [kubeServices, setKubeServices] = useState([]);
  const [kubeNamespaces, setKubeNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState("");
  
  // Context & suggestions & autohealing
  const [kubeContexts, setKubeContexts] = useState([]);
  const [activeContext, setActiveContext] = useState("");
  const [scalingSuggestions, setScalingSuggestions] = useState([]);
  const [healingLogs, setHealingLogs] = useState([]);
  const [autoHealingEnabled, setAutoHealingEnabled] = useState(false);

  const [stats, setStats] = useState({});
  const [dockerStats, setDockerStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // Tabs management
  const [monTab, setMonTab] = useState("docker"); // docker | kubernetes
  const [k8sSubTab, setK8sSubTab] = useState("pods"); // pods | deployments | services | optimizer

  // Container Log viewer state
  const [activeLogContainer, setActiveLogContainer] = useState(null);

  const fetchDocker = async () => {
    try {
      const response = await axios.get("http://localhost:5000/docker-stats");
      setDockerData(response.data.containers || []);
      setDockerStats(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchKubeNamespaces = async () => {
    try {
      const res = await axios.get("http://localhost:5000/kubernetes/namespaces");
      setKubeNamespaces(res.data.namespaces || []);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchKubeContexts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/kubernetes/contexts");
      setKubeContexts(res.data.contexts || []);
      setActiveContext(res.data.active || "");
    } catch (e) {
      console.log(e);
    }
  };

  const handleContextChange = async (contextName) => {
    try {
      await axios.post("http://localhost:5000/api/kubernetes/context", { context: contextName });
      setActiveContext(contextName);
      alert(`Kubernetes context switched to: ${contextName}`);
      fetchKubernetesData();
      fetchKubeNamespaces();
      fetchScalingSuggestions();
    } catch (error) {
      alert("Failed to switch context: " + (error.response?.data?.error || error.message));
    }
  };

  const fetchScalingSuggestions = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/kubernetes/scaling-suggestions");
      setScalingSuggestions(res.data.suggestions || []);
    } catch (e) {
      console.log(e);
    }
  };

  const handleApplyScale = async (suggestion) => {
    try {
      await axios.post("http://localhost:5000/api/kubernetes/scale", {
        namespace: suggestion.namespace,
        deployment: suggestion.deploymentName,
        replicas: suggestion.suggestedReplicas
      });
      alert(`Scaling suggestion applied: Scaled ${suggestion.deploymentName} to ${suggestion.suggestedReplicas} replicas.`);
      fetchKubernetesData();
      fetchScalingSuggestions();
    } catch (error) {
      alert("Failed to scale deployment: " + (error.response?.data?.error || error.message));
    }
  };

  const fetchHealingLogs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/auto-healing/logs");
      setHealingLogs(res.data || []);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get("http://localhost:5000/settings");
      setAutoHealingEnabled(res.data.autoHealingEnabled);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchKubernetesData = async () => {
    const nsParam = selectedNamespace ? `?namespace=${selectedNamespace}` : "";
    try {
      const podsRes = await axios.get(`http://localhost:5000/kubernetes/pods${nsParam}`);
      setKubePods(podsRes.data.pods || []);
      
      const deploysRes = await axios.get(`http://localhost:5000/kubernetes/deployments${nsParam}`);
      setKubeDeployments(deploysRes.data.deployments || []);

      const svcsRes = await axios.get(`http://localhost:5000/kubernetes/services${nsParam}`);
      setKubeServices(svcsRes.data.services || []);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/system-stats");
      const data = await response.json();
      setStats(data);
      setChartData((prev) => [
        ...prev.slice(-14),
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: parseFloat(data.cpu || 0),
          ram: parseFloat(((data.ram / data.totalRam) * 100).toFixed(1) || 0)
        }
      ]);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5000/alerts");
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:5000/notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDocker();
    fetchKubeNamespaces();
    fetchKubeContexts();
    fetchKubernetesData();
    fetchScalingSuggestions();
    fetchHealingLogs();
    fetchSettings();
    fetchSystemStats();
    fetchAlerts();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchDocker();
      fetchKubernetesData();
      fetchScalingSuggestions();
      fetchHealingLogs();
      fetchSystemStats();
      fetchAlerts();
      fetchNotifications();
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNamespace]);

  const handleContainerAction = async (id, action) => {
    try {
      await axios.post(`http://localhost:5000/docker/container/${id}/${action}`);
      alert(`Container ${action} command sent successfully.`);
      fetchDocker();
    } catch (error) {
      alert(`Failed to ${action} container: ` + (error.response?.data?.error || error.message));
    }
  };

  const showAlertsPopup = () => {
    const alertMsg = alerts.length > 0 ? alerts.join("\n") : "No active alerts.";
    const eventMsg = notifications.length > 0 ? notifications.join("\n") : "No recent events.";
    alert(`SYSTEM ALERTS STATUS:\n\n${alertMsg}\n\nRECENT ACTIVITY EVENTS:\n\n${eventMsg}`);
  };

  return (
    <div>
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1 className="title">DevGenAI Dashboard</h1>
          <p className="subtitle">AI-Powered DevOps Monitoring & Automation</p>
        </div>

        <div className="topActions">
          <div className="searchBox">
            <FaSearch />
            <input type="text" placeholder="Search resources..." />
          </div>

          <div className="notify" onClick={showAlertsPopup}>
            <FaBell />
            <span>{alerts.length}</span>
          </div>

          <button className="themeBtn" onClick={toggleTheme}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          <div className="profile">
            <FaUserCircle className="profileIcon" />
            <div>
              <h4>{session.user?.user_metadata?.name || "Administrator"}</h4>
              <p>DevOps Lead</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="cards">
        <div className="card">
          <FaCloud className="icon" style={{ color: "#00bfff" }} />
          <h3>CPU Usage</h3>
          <p>{stats.cpu || "0.00"}%</p>
        </div>

        <div className="card">
          <FaDocker className="icon" style={{ color: "#38bdf8" }} />
          <h3>Docker Containers</h3>
          <p>{dockerStats.totalContainers || 0}</p>
        </div>

        <div className="card">
          <FaRobot className="icon" style={{ color: "#22c55e" }} />
          <h3>Memory Usage</h3>
          <p>{stats.ram || 0} / {stats.totalRam || 0} GB</p>
        </div>

        <div className="card">
          <FaServer className="icon" style={{ color: "#a855f7" }} />
          <h3>System Host</h3>
          <p style={{ fontSize: "24px", marginTop: "30px" }}>{stats.hostname || "local-cluster"}</p>
          <span style={{ fontSize: "14px", color: "#94a3b8" }}>OS: {stats.platform || "linux"}</span>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="graphGrid">
        <div className="graphBox">
          <h2>System Performance (Real-time CPU/RAM %)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#00bfff" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="ram" name="RAM %" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="alertsBox" style={{ marginTop: 0 }}>
          <h2>Live Infrastructure Alerts</h2>
          <div className="alertsList">
            {alerts.map((alert, index) => {
              const isCrit = alert.toLowerCase().includes("[critical]") || alert.toLowerCase().includes("offline") || alert.toLowerCase().includes("alert");
              return (
                <div className={`alert ${isCrit ? "crit" : "info"}`} key={index}>
                  <FaExclamationTriangle />
                  <span>{alert}</span>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <p className="noAlerts"><FaCheckCircle /> All systems functional. No active alerts.</p>
            )}
          </div>
        </div>
      </div>

      {/* AI AUTO HEALING TIMELINE */}
      <div className="tableBox" style={{ marginBottom: "40px" }}>
        <div className="tabHeader">
          <div>
            <h2>🛡️ AI-Based Autonomous Healing Engine</h2>
            <p className="sectionHelp" style={{ margin: "5px 0 0 0" }}>
              Status: <span style={{ color: autoHealingEnabled ? "#22c55e" : "#e2e8f0", fontWeight: "bold" }}>
                {autoHealingEnabled ? "ACTIVE (Fully Autonomous Recovery Mode)" : "OFFLINE (Manual Intervention Mode)"}
              </span>
            </p>
          </div>
          <button className="secondaryBtn textBtn" onClick={fetchHealingLogs}><FaSync /> Refresh Log</button>
        </div>
        
        <div className="healingTimeline">
          {healingLogs.map((log) => {
            return (
              <div key={log.id} className={`timelineItem ${log.status}`}>
                <div className="timelineDot"></div>
                <div className="timelineContent">
                  <div className="timelineMeta">
                    <span className="resourceTag">{log.resourceType.toUpperCase()}: {log.resourceName}</span>
                    <span className="timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <h4>{log.issue}</h4>
                  <p><strong>AI Diagnosis:</strong> <em>{log.diagnosis}</em></p>
                  <p><strong>Remediation Taken:</strong> {log.actionTaken}</p>
                  <div className="timelineFooter">
                    <span className={`statusLabel ${log.status}`}>State: {log.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {healingLogs.length === 0 && (
            <div className="emptyState" style={{ padding: "10px" }}>
              <FaCheckCircle style={{ color: "#22c55e", fontSize: "20px", marginBottom: "8px" }} />
              <p>No active auto-healing events recorded. All nodes running within margins.</p>
            </div>
          )}
        </div>
      </div>

      {/* Infrastructure Monitoring Tabs */}
      <div className="tableBox">
        <div className="monitorTabs">
          <button className={`tabBtn ${monTab === "docker" ? "active" : ""}`} onClick={() => setMonTab("docker")}>
            <FaDocker /> Docker Management
          </button>
          <button className={`tabBtn ${monTab === "kubernetes" ? "active" : ""}`} onClick={() => setMonTab("kubernetes")}>
            <FaServer /> Kubernetes Clusters
          </button>
        </div>

        {/* DOCKER TAB */}
        {monTab === "docker" && (
          <div>
            <div className="tabHeader">
              <h2>Container Runtime States</h2>
              <button className="mainBtn textBtn" onClick={fetchDocker}><FaSync /> Refresh Docker</button>
            </div>
            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Container ID</th>
                    <th>Name</th>
                    <th>Docker Image</th>
                    <th>Status</th>
                    <th>State</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dockerData.map((item, index) => {
                    const isRunning = item.state === "running";
                    return (
                      <tr key={index}>
                        <td className="codeText">{item.id}</td>
                        <td><strong>{item.names}</strong></td>
                        <td className="codeText">{item.image}</td>
                        <td>{item.status}</td>
                        <td>
                          <span className={`badge ${isRunning ? "active" : "inactive"}`}>
                            {item.state}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="btnGroup">
                            {isRunning ? (
                              <button className="controlBtn stop" title="Stop Container" onClick={() => handleContainerAction(item.id, "stop")}>
                                <FaStop />
                              </button>
                            ) : (
                              <button className="controlBtn start" title="Start Container" onClick={() => handleContainerAction(item.id, "start")}>
                                <FaPlay />
                              </button>
                            )}
                            <button className="controlBtn restart" title="Restart Container" onClick={() => handleContainerAction(item.id, "restart")} disabled={!isRunning}>
                              <FaSync />
                            </button>
                            <button className="controlBtn logs" title="View Terminal Logs" onClick={() => setActiveLogContainer(item)}>
                              <FaTerminal />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {dockerData.length === 0 && (
                    <tr>
                      <td colSpan="6" className="emptyState">Docker is not running or no containers found on this system.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KUBERNETES TAB */}
        {monTab === "kubernetes" && (
          <div>
            <div className="tabHeader flexHeader">
              <h2>Kubernetes Cluster Resources</h2>
              <div className="k8sControls">
                <div className="selectBox">
                  <label>Cluster Context: </label>
                  <select value={activeContext} onChange={(e) => handleContextChange(e.target.value)}>
                    {kubeContexts.map((ctx, idx) => (
                      <option key={idx} value={ctx}>{ctx}</option>
                    ))}
                  </select>
                </div>
                <div className="selectBox">
                  <label>Namespace: </label>
                  <select value={selectedNamespace} onChange={(e) => setSelectedNamespace(e.target.value)}>
                    <option value="">All Namespaces</option>
                    {kubeNamespaces.map((ns, idx) => (
                      <option key={idx} value={ns}>{ns}</option>
                    ))}
                  </select>
                </div>
                <button className="mainBtn textBtn" onClick={fetchKubernetesData}><FaSync /> Sync</button>
              </div>
            </div>

            {/* K8S Sub-tabs */}
            <div className="subTabs">
              <button className={`subTabBtn ${k8sSubTab === "pods" ? "active" : ""}`} onClick={() => setK8sSubTab("pods")}>
                Pods ({kubePods.length})
              </button>
              <button className={`subTabBtn ${k8sSubTab === "deployments" ? "active" : ""}`} onClick={() => setK8sSubTab("deployments")}>
                Deployments ({kubeDeployments.length})
              </button>
              <button className={`subTabBtn ${k8sSubTab === "services" ? "active" : ""}`} onClick={() => setK8sSubTab("services")}>
                Services ({kubeServices.length})
              </button>
              <button className={`subTabBtn ${k8sSubTab === "optimizer" ? "active" : ""}`} onClick={() => { setK8sSubTab("optimizer"); fetchScalingSuggestions(); }}>
                📈 AI scaling suggestions ({scalingSuggestions.length})
              </button>
            </div>

            {/* PODS LIST */}
            {k8sSubTab === "pods" && (
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Namespace</th>
                      <th>Pod Name</th>
                      <th>Ready</th>
                      <th>Status</th>
                      <th>Restarts</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kubePods.map((pod, index) => {
                      const isRunning = pod.status === "Running" || pod.status === "Completed";
                      const isWarn = pod.status === "Pending" || pod.status === "ContainerCreating" || pod.status === "PodInitializing";
                      const badgeClass = isRunning ? "active" : isWarn ? "warn" : "crit-badge";
                      return (
                        <tr key={index}>
                          <td className="codeText">{pod.namespace}</td>
                          <td><strong>{pod.name}</strong></td>
                          <td>{pod.ready}</td>
                          <td>
                            <span className={`badge ${badgeClass}`}>
                              {pod.status}
                            </span>
                          </td>
                          <td>{pod.restarts}</td>
                          <td>{pod.age}</td>
                        </tr>
                      );
                    })}
                    {kubePods.length === 0 && (
                      <tr>
                        <td colSpan="6" className="emptyState">No pods found in the selected scope or cluster disconnected.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* DEPLOYMENTS LIST */}
            {k8sSubTab === "deployments" && (
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Namespace</th>
                      <th>Deployment Name</th>
                      <th>Ready Replicas</th>
                      <th>Up to Date</th>
                      <th>Available</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kubeDeployments.map((deploy, index) => {
                      const parts = (deploy.ready || "0/0").split("/");
                      const isFull = parts[0] === parts[1] && parts[0] !== "0";
                      return (
                        <tr key={index}>
                          <td className="codeText">{deploy.namespace}</td>
                          <td><strong>{deploy.name}</strong></td>
                          <td>{deploy.ready}</td>
                          <td>{deploy.upToDate}</td>
                          <td>
                            <span className={`badge ${isFull ? "active" : "warn"}`}>
                              {deploy.available} available
                            </span>
                          </td>
                          <td>{deploy.age}</td>
                        </tr>
                      );
                    })}
                    {kubeDeployments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="emptyState">No deployments found in the selected scope.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SERVICES LIST */}
            {k8sSubTab === "services" && (
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Namespace</th>
                      <th>Service Name</th>
                      <th>Type</th>
                      <th>Cluster IP</th>
                      <th>External IP</th>
                      <th>Port(s)</th>
                      <th>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kubeServices.map((svc, index) => (
                      <tr key={index}>
                        <td className="codeText">{svc.namespace}</td>
                        <td><strong>{svc.name}</strong></td>
                        <td><span className="typeLabel">{svc.type}</span></td>
                        <td className="codeText">{svc.clusterIp}</td>
                        <td>{svc.externalIp}</td>
                        <td className="codeText">{svc.ports}</td>
                        <td>{svc.age}</td>
                      </tr>
                    ))}
                    {kubeServices.length === 0 && (
                      <tr>
                        <td colSpan="7" className="emptyState">No services found in the selected scope.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* OPTIMIZER / SCALING SUGGESTIONS */}
            {k8sSubTab === "optimizer" && (
              <div className="optimizationPanel">
                {scalingSuggestions.map((s) => (
                  <div key={s.id} className={`optCard ${s.severity}`}>
                    <div className="optHeader">
                      <span className="optNamespace">Namespace: {s.namespace}</span>
                      <span className={`optBadge ${s.severity}`}>{s.severity.toUpperCase()}</span>
                    </div>
                    <h3>Deployment: {s.deploymentName}</h3>
                    <p className="optReason">{s.reason}</p>
                    <div className="optScaleMetrics">
                      <span>Current Replicas: <strong>{s.currentReplicas}</strong></span>
                      <FaChevronRight style={{ color: "#64748b" }} />
                      <span>Suggested Replicas: <strong style={{ color: "#10b981", fontSize: "16px" }}>{s.suggestedReplicas}</strong></span>
                    </div>
                    <button className="mainBtn" onClick={() => handleApplyScale(s)}>
                      Apply Scale Suggestion
                    </button>
                  </div>
                ))}
                {scalingSuggestions.length === 0 && (
                  <div className="emptyState">
                    <FaCheckCircle style={{ color: "#22c55e", fontSize: "28px", marginBottom: "10px" }} />
                    <p>Replica allocation is optimized. No auto-scaling recommendations at current CPU load levels.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Logs Modal if active */}
      {activeLogContainer && (
        <LogsModal container={activeLogContainer} onClose={() => setActiveLogContainer(null)} />
      )}
    </div>
  );
}

/* AI PAGE */

function AIPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (message.trim() === "") return;

    const userMessage = {
      role: "user",
      text: message
    };

    setChat((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      const aiMessage = {
        role: "ai",
        text: data.reply
      };

      setChat((prev) => [...prev, aiMessage]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "Error: AI service is currently unavailable. Ensure Ollama with tinyllama is running." }
      ]);
    }
    setLoading(false);
    setMessage("");
  };

  return (
    <div>
      <h1 className="title">AI Assistant</h1>
      <p className="subtitle">DevOps Knowledge Base & Assistant</p>
      
      <div className="chatContainer">
        <div className="chatMessages">
          <div className="aiChat">
            Hello! I am DevGenAI assistant. How can I help you deploy, configure, or monitor your servers today?
          </div>
          {chat.map((msg, index) => (
            <div key={index} className={msg.role === "user" ? "userChat" : "aiChat"}>
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="aiChat thinking">
              <FaRobot className="spin" /> TinyLlama is processing prompt...
            </div>
          )}
        </div>

        <div className="chatInputBox">
          <input
            type="text"
            placeholder="How do I troubleshoot a CrashLoopBackOff error?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="mainBtn" onClick={sendMessage} disabled={loading}>
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
}

/* INCIDENT RESOLVER */

function IncidentResolverPage() {
  const [log, setLog] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeError = async () => {
    if (!log.trim()) return;
    setLoading(true);
    setResult("AI Engine diagnosing issue and matching resolutions...");
    try {
      const response = await axios.post("http://localhost:5000/incident-resolver", {
        issue: log
      });
      setResult(response.data.reply);
    } catch (error) {
      setResult("Incident Resolver Backend offline. Ensure AI and Express Server are running.");
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="title">Incident Resolver</h1>
      <p className="subtitle">AI Automated Logs Analysis & Remediation Guides</p>

      <div className="chatContainer">
        <textarea
          rows="8"
          value={log}
          onChange={(e) => setLog(e.target.value)}
          placeholder="Paste Kubernetes events (kubectl describe pod), Docker container logs, or software crash stack traces here..."
          style={{
            padding: "20px",
            borderRadius: "15px",
            background: "#020617",
            color: "white",
            border: "1px solid rgba(255,255,255,0.05)",
            width: "100%",
            boxSizing: "border-box"
          }}
        />
        <button
          className="mainBtn"
          onClick={analyzeError}
          disabled={loading || !log.trim()}
          style={{ marginTop: "20px" }}
        >
          {loading ? "Diagnosing..." : "Analyze Logs & Auto-Heal"}
        </button>

        <pre className="aiChat mdBlock" style={{ marginTop: "30px", width: "100%", whiteSpace: "pre-wrap", wordBreak: "break-word", boxSizing: "border-box" }}>
          {result || "Diagnostics result will display here. The AI will output Cause, Fix instructions, and remediation Shell Commands."}
        </pre>
      </div>
    </div>
  );
}

/* YAML GENERATOR WITH VALIDATION */

function YAMLPage() {
  const [prompt, setPrompt] = useState("");
  const [yaml, setYaml] = useState("");
  const [loading, setLoading] = useState(false);
  const [yamlError, setYamlError] = useState(null);
  
  // Tab index for multi-resource generated yaml files
  const [yamlBlocks, setYamlBlocks] = useState([]);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(0);

  const generateYAML = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setYaml("Generating deployment structures...");
    setYamlError(null);
    setYamlBlocks([]);
    try {
      const response = await axios.post("http://localhost:5000/generate-yaml", {
        prompt
      });
      const generated = response.data.reply;
      setYaml(generated);
      
      // Parse blocks separated by ---
      // We also look for code blocks in markdown responses
      const cleanString = generated.replace(/```yaml/g, "").replace(/```/g, "").trim();
      const splitBlocks = cleanString.split(/\n---\s*\n/);
      
      const structured = splitBlocks.map((block, idx) => {
        // Detect kind or description
        const kindMatch = block.match(/kind:\s*(\w+)/);
        const nameMatch = block.match(/name:\s*([\w-]+)/);
        const kind = kindMatch ? kindMatch[1] : "Configuration";
        const name = nameMatch ? nameMatch[1] : `Resource-${idx+1}`;
        return {
          title: `${kind} (${name})`,
          content: block.trim()
        };
      });

      setYamlBlocks(structured);
      setSelectedBlockIdx(0);
      runLocalValidation(cleanString);

    } catch (error) {
      setYaml("Error generating YAML.");
    }
    setLoading(false);
  };

  const runLocalValidation = (yamlText) => {
    if (!yamlText) return;
    const lines = yamlText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("\t")) {
        setYamlError(`Indentation Error (Line ${i + 1}): Tab character detected. YAML requires space indentation.`);
        return;
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1 && colonIdx < line.length - 1) {
        const nextChar = line[colonIdx + 1];
        if (nextChar !== " " && nextChar !== "\n" && nextChar !== "\r" && nextChar !== "") {
          const isHttp = line.includes("http:") || line.includes("https:");
          if (!isHttp) {
            setYamlError(`Syntax Warning (Line ${i + 1}): Colon ':' must be followed by a space.`);
            return;
          }
        }
      }
    }
    setYamlError(null);
  };

  const downloadYaml = () => {
    if (!yaml) return;
    const cleanYaml = yaml.replace(/```[a-z]*/g, "").trim();
    const element = document.createElement("a");
    const file = new Blob([cleanYaml], { type: 'text/yaml' });
    element.href = URL.createObjectURL(file);
    element.download = `${prompt.toLowerCase().replace(/[^a-z0-9]/g, "_") || "deployment"}.yaml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div>
      <h1 className="title">YAML Generator</h1>
      <p className="subtitle">AI Deployment Manifest Builder & Syntax Checker</p>

      <div className="chatContainer">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Deploy an Nginx server with 3 replicas exposing port 80"
          onKeyDown={(e) => e.key === "Enter" && generateYAML()}
        />
        <div className="btnGroup" style={{ marginTop: "15px" }}>
          <button className="mainBtn" onClick={generateYAML} disabled={loading}>
            {loading ? "Creating Resources..." : "Generate Configs"}
          </button>
          {yaml && (
            <button className="secondaryBtn" onClick={downloadYaml}>
              <FaDownload /> Download Manifest File
            </button>
          )}
        </div>

        {yamlError && (
          <div className="alert crit" style={{ marginTop: "20px" }}>
            <FaExclamationTriangle /> {yamlError}
          </div>
        )}

        {yaml && !yamlError && (
          <div className="alert success" style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaCheckCircle style={{ color: "#22c55e" }} /> YAML syntax looks clean. Validation Passed.
          </div>
        )}

        {yamlBlocks.length > 0 && (
          <div className="multiYamlBox" style={{ marginTop: "25px" }}>
            <div className="subTabs">
              {yamlBlocks.map((block, idx) => (
                <button
                  key={idx}
                  className={`subTabBtn ${selectedBlockIdx === idx ? "active" : ""}`}
                  onClick={() => setSelectedBlockIdx(idx)}
                >
                  {block.title}
                </button>
              ))}
            </div>
            <pre className="aiChat yamlCode" style={{ marginTop: "10px", width: "100%", boxSizing: "border-box", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {yamlBlocks[selectedBlockIdx]?.content}
            </pre>
          </div>
        )}

        {yaml && yamlBlocks.length === 0 && (
          <pre className="aiChat yamlCode" style={{ marginTop: "30px", width: "100%", boxSizing: "border-box", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {yaml}
          </pre>
        )}
      </div>
    </div>
  );
}

/* CHATOPS TERMINAL */

function ChatOpsPage() {
  const [message, setMessage] = useState("");
  const [suggestedCommand, setSuggestedCommand] = useState("");
  const [aiExplain, setAiExplain] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [activeMode, setActiveMode] = useState("ai"); // "ai" or "direct"
  const [directCommand, setDirectCommand] = useState("");

  const translateRequest = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setTerminalOutput("");
    setSuggestedCommand("");
    try {
      const response = await axios.post("http://localhost:5000/chatops", {
        message
      });
      setAiExplain(response.data.reply);
      if (response.data.command) {
        setSuggestedCommand(response.data.command);
      }
    } catch (error) {
      setAiExplain("ChatOps failed to compile request. Please ensure Docker & K8s are configured.");
    }
    setLoading(false);
  };

  const executeCommand = async (cmdToRun) => {
    if (!cmdToRun) return;
    setExecuting(true);
    setTerminalOutput("Connecting to cluster and executing environment tools...\n$ " + cmdToRun + "\n");
    try {
      const res = await axios.post("http://localhost:5000/chatops/execute", {
        command: cmdToRun
      });
      let out = "";
      if (res.data.stdout) out += res.data.stdout;
      if (res.data.stderr) out += "ERROR:\n" + res.data.stderr;
      if (!res.data.stdout && !res.data.stderr) out += "Command executed successfully with no returned output.";
      setTerminalOutput(prev => prev + out + `\n\nProcess completed with Exit Code: ${res.data.exitCode}`);
    } catch (error) {
      setTerminalOutput(prev => prev + "EXECUTION ERROR: " + (error.response?.data?.error || error.message));
    }
    setExecuting(false);
  };

  return (
    <div>
      <h1 className="title">ChatOps Console</h1>
      <p className="subtitle">Execute Infrastructure Operations Using Natural Language or Direct Commands</p>

      {/* Mode Subtabs */}
      <div className="subTabs" style={{ marginTop: "20px", marginBottom: "20px" }}>
        <button 
          className={`subTabBtn ${activeMode === "ai" ? "active" : ""}`} 
          onClick={() => { setActiveMode("ai"); setTerminalOutput(""); }}
        >
          <FaRobot /> AI Request Translator
        </button>
        <button 
          className={`subTabBtn ${activeMode === "direct" ? "active" : ""}`} 
          onClick={() => { setActiveMode("direct"); setTerminalOutput(""); }}
        >
          <FaTerminal /> Direct Command Execution
        </button>
      </div>

      <div className="chatContainer">
        {activeMode === "ai" ? (
          <div>
            <div className="chatInputBox">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. List all deployments in namespace default, or show container ps"
                onKeyDown={(e) => e.key === "Enter" && translateRequest()}
                disabled={loading || executing}
              />
              <button className="mainBtn" onClick={translateRequest} disabled={loading || executing || !message.trim()}>
                {loading ? "Translating..." : "Translate Request"}
              </button>
            </div>

            {aiExplain && (
              <div className="aiChat" style={{ width: "100%", boxSizing: "border-box", marginTop: "20px" }}>
                {aiExplain}
              </div>
            )}

            {suggestedCommand && (
              <div className="suggestedCmdBox" style={{ marginTop: "20px" }}>
                <h3>Command Verification:</h3>
                <div className="commandShell">
                  <span className="shellPrompt">$</span>
                  <input
                    type="text"
                    className="commandInput"
                    value={suggestedCommand}
                    onChange={(e) => setSuggestedCommand(e.target.value)}
                  />
                </div>
                <p className="warnText"><FaInfoCircle /> Review command and edit if necessary before execution.</p>
                <button className="mainBtn runBtn" onClick={() => executeCommand(suggestedCommand)} disabled={executing}>
                  <FaTerminal /> Execute Terminal Command
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="suggestedCmdBox" style={{ marginTop: "0px" }}>
            <h3>Direct Shell Command:</h3>
            <div className="commandShell">
              <span className="shellPrompt">$</span>
              <input
                type="text"
                className="commandInput"
                value={directCommand}
                onChange={(e) => setDirectCommand(e.target.value)}
                placeholder="e.g. kubectl get pods -n default or docker ps"
                onKeyDown={(e) => e.key === "Enter" && executeCommand(directCommand)}
                disabled={executing}
              />
            </div>
            <p className="warnText"><FaInfoCircle /> Command must start with 'kubectl' or 'docker' and is verified for safety.</p>
            <button 
              className="mainBtn runBtn" 
              onClick={() => executeCommand(directCommand)} 
              disabled={executing || !directCommand.trim()}
            >
              <FaTerminal /> Execute Terminal Command
            </button>
          </div>
        )}

        {terminalOutput && (
          <div className="terminalBoxContainer">
            <h2>Command Output Console</h2>
            <pre className="consoleScreen">
              {terminalOutput}
              {executing && <span className="cursor-blink">|</span>}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* DOCS GENERATOR WITH PDF/DOCX DOWNLOADS */

function DocsGeneratorPage() {
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState("");
  const [loading, setLoading] = useState(false);

  const generateDocs = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setDocs("Structuring documentation blocks...");
    try {
      const response = await axios.post("http://localhost:5000/generate-docs", {
        content: input
      });
      setDocs(response.data.reply);
    } catch (error) {
      setDocs("Error generating documentation.");
    }
    setLoading(false);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([docs], { type: "text/markdown" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DevOps_Setup_Guide.md`;
    link.click();
  };

  const downloadDocx = () => {
    // Generate word friendly format
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>DevGenAI Export</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; } h1,h2 { color: #0284c7; }</style></head>
    <body>`;
    const footer = `</body></html>`;
    
    // Quick Markdown to HTML converter
    const htmlContent = docs
      .replace(/# (.*)\n/g, "<h1>$1</h1>")
      .replace(/## (.*)\n/g, "<h2>$1</h2>")
      .replace(/### (.*)\n/g, "<h3>$1</h3>")
      .replace(/- (.*)\n/g, "<li>$1</li>")
      .replace(/\n\n/g, "<p></p>")
      .replace(/\n/g, "<br>");

    const blob = new Blob([header + htmlContent + footer], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DevOps_Setup_Guide.doc`;
    link.click();
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>DevGenAI Exporter</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.8; }
            h1 { font-size: 28px; color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            h2 { font-size: 20px; color: #0f172a; margin-top: 30px; }
            pre { background: #f1f5f9; padding: 15px; border-radius: 8px; font-family: Consolas, monospace; overflow-x: auto; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; }
          </style>
        </head>
        <body>
          <h1>DevOps Platform Document</h1>
          <div style="white-space: pre-wrap;">${docs}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div>
      <h1 className="title">Docs Generator</h1>
      <p className="subtitle">AI-Powered Documentation & Project Setup Generator</p>

      <div className="chatContainer">
        <textarea
          rows="6"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your infrastructure setup (e.g. React frontend on Docker, NodeJS API connecting to Postgres backend on AWS, monitored with Grafana)..."
          disabled={loading}
        />
        <button
          className="mainBtn"
          onClick={generateDocs}
          disabled={loading || !input.trim()}
          style={{ marginTop: "15px" }}
        >
          {loading ? "Compiling Documentation..." : "Generate Setup Docs"}
        </button>

        {docs && (
          <div className="docsOutputContainer" style={{ marginTop: "30px" }}>
            <div className="docHeaderActions">
              <h3>Generated Document</h3>
              <div className="btnGroup">
                <button className="controlBtn" onClick={downloadMarkdown} title="Download Markdown (.md)">MD</button>
                <button className="controlBtn" onClick={downloadDocx} title="Download MS Word (.doc)">Word</button>
                <button className="controlBtn" onClick={exportPDF} title="Print / Save PDF">PDF</button>
              </div>
            </div>
            <pre className="aiChat mdBlock" style={{ whiteSpace: "pre-wrap", width: "100%", boxSizing: "border-box" }}>
              {docs}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* PROMPTOPS WITH ANALYTICS AND COMPARISON */

function PromptOpsPage() {
  const [prompt, setPrompt] = useState("");
  const [versions, setVersions] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalRequests: 0,
    successRate: 100,
    avgLatency: 0,
    success: 0,
    failed: 0,
    logs: []
  });

  const [activeTab, setActiveTab] = useState("versioning"); // versioning | comparison | analytics

  // Comparison State
  const [compVersion1, setCompVersion1] = useState("");
  const [compVersion2, setCompVersion2] = useState("");
  const [diffResults, setDiffResults] = useState([]);

  const fetchPrompts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/prompts");
      setVersions(response.data || []);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get("http://localhost:5000/promptops/analytics");
      setAnalytics(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchPrompts();
    fetchAnalytics();
  }, []);

  const savePrompt = async () => {
    if (!prompt.trim()) {
      alert("Enter prompt first");
      return;
    }
    try {
      const response = await axios.post("http://localhost:5000/save-prompt", {
        prompt
      });
      setVersions(response.data.prompts || []);
      setPrompt("");
      alert("Prompt version saved.");
      fetchAnalytics();
    } catch (error) {
      console.log(error);
    }
  };

  const rollbackPrompt = async () => {
    if (versions.length === 0) return;
    try {
      const response = await axios.post("http://localhost:5000/rollback");
      setVersions(response.data.prompts || []);
      alert("Prompt rolled back to previous state.");
    } catch (error) {
      console.log(error);
    }
  };

  const handleCompare = () => {
    const p1 = versions.find(v => String(v.version) === String(compVersion1))?.prompt || "";
    const p2 = versions.find(v => String(v.version) === String(compVersion2))?.prompt || "";
    
    const lines1 = p1.split("\n");
    const lines2 = p2.split("\n");
    const results = [];
    const max = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < max; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === l2) {
        results.push({ type: "match", text: l1 });
      } else {
        if (l1 !== undefined) results.push({ type: "deleted", text: l1 });
        if (l2 !== undefined) results.push({ type: "added", text: l2 });
      }
    }
    setDiffResults(results);
  };

  return (
    <div>
      <h1 className="title">PromptOps Portal</h1>
      <p className="subtitle">AI Prompts Lifecycle Versioning, Testing & Telemetry</p>

      {/* Main Tabs */}
      <div className="subTabs" style={{ marginTop: "20px" }}>
        <button className={`subTabBtn ${activeTab === "versioning" ? "active" : ""}`} onClick={() => setActiveTab("versioning")}>
          <FaCodeBranch /> Version Control & Rollbacks
        </button>
        <button className={`subTabBtn ${activeTab === "comparison" ? "active" : ""}`} onClick={() => setActiveTab("comparison")}>
          <FaFlask /> Prompt Comparison
        </button>
        <button className={`subTabBtn ${activeTab === "analytics" ? "active" : ""}`} onClick={() => { setActiveTab("analytics"); fetchAnalytics(); }}>
          <FaRobot /> Usage Telemetry & Logs
        </button>
      </div>

      {/* TABS CONTAINER */}
      <div className="promptContentBox">

        {/* VERSIONING TAB */}
        {activeTab === "versioning" && (
          <div>
            <div className="promptGrid">
              <div className="promptCard">
                <FaCodeBranch className="promptIcon" style={{ color: "#38bdf8" }} />
                <h2>Prompt Versions</h2>
                <p>Saved in Local Storage: <strong>{versions.length} versions</strong> available</p>
              </div>
              <div className="promptCard">
                <FaUndo className="promptIcon" style={{ color: "#f59e0b" }} />
                <h2>Rollbacks</h2>
                <p>Instantly hotfix deployment issues by rolling back active settings</p>
              </div>
              <div className="promptCard">
                <FaRobot className="promptIcon" style={{ color: "#10b981" }} />
                <h2>Total AI Ticks</h2>
                <p>Active Requests tracked: <strong>{analytics.totalRequests} executions</strong></p>
              </div>
            </div>

            <div className="chatContainer" style={{ marginTop: "30px" }}>
              <h2>Save Prompt Lifecycle</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste AI instructions system prompts here..."
                rows="4"
                style={{
                  background: "#0f172a",
                  color: "white",
                  padding: "15px",
                  borderRadius: "10px",
                  border: "none",
                  marginBottom: "15px"
                }}
              />
              <div className="btnGroup">
                <button className="mainBtn" onClick={savePrompt}>Save New Version</button>
                <button className="secondaryBtn" onClick={rollbackPrompt} disabled={versions.length === 0}>
                  Rollback Last Version
                </button>
              </div>

              <div className="versionHistory">
                <h3>Prompt Commit History</h3>
                {versions.map((v) => (
                  <div key={v.id} className="versionHistoryItem">
                    <div className="itemMeta">
                      <span className="versionTag">Version {v.version}</span>
                      <span className="versionDate">{new Date(v.date).toLocaleString()}</span>
                    </div>
                    <pre className="itemPrompt">{v.prompt}</pre>
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="emptyState">No prompt versions committed yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPARISON TAB */}
        {activeTab === "comparison" && (
          <div className="chatContainer">
            <h2>Prompt Diff Comparison Engine</h2>
            <div className="diffSelectors" style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div className="selectBox">
                <label>Baseline Prompt: </label>
                <select value={compVersion1} onChange={(e) => setCompVersion1(e.target.value)}>
                  <option value="">Select version</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.version}>Version {v.version}</option>
                  ))}
                </select>
              </div>
              <div className="selectBox">
                <label>Comparison Prompt: </label>
                <select value={compVersion2} onChange={(e) => setCompVersion2(e.target.value)}>
                  <option value="">Select version</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.version}>Version {v.version}</option>
                  ))}
                </select>
              </div>
              <button className="mainBtn" onClick={handleCompare} disabled={!compVersion1 || !compVersion2}>
                Compare Versions
              </button>
            </div>

            {diffResults.length > 0 && (
              <div className="diffContainer">
                <h3>Differences (- / +)</h3>
                <div className="diffOutput">
                  {diffResults.map((line, idx) => (
                    <div key={idx} className={`diffLine ${line.type}`}>
                      <span className="diffSign">{line.type === "added" ? "+" : line.type === "deleted" ? "-" : " "}</span>
                      <span className="diffText">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div>
            <div className="promptGrid">
              <div className="promptCard">
                <h2>{analytics.totalRequests}</h2>
                <p>AI Requests Made</p>
              </div>
              <div className="promptCard">
                <h2 style={{ color: "#22c55e" }}>{analytics.successRate}%</h2>
                <p>Model Success Rate</p>
              </div>
              <div className="promptCard">
                <h2 style={{ color: "#0ea5e9" }}>{analytics.avgLatency}ms</h2>
                <p>Average Latency Time</p>
              </div>
            </div>

            <div className="graphBox" style={{ marginTop: "30px" }}>
              <h2>AI System Latency History (Recent Ticks)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics.logs}>
                  <defs>
                    <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" name="Latency (ms)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Area type="monotone" dataKey="responseTime" name="Response (ms)" stroke="#0ea5e9" fillOpacity={1} fill="url(#latencyGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="tableBox" style={{ marginTop: "30px" }}>
              <h2>Recent AI Transaction Logs</h2>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Prompt Substring</th>
                    <th>Latency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td>{log.prompt?.slice(0, 75)}...</td>
                      <td>{log.responseTime} ms</td>
                      <td>
                        <span className={`badge ${log.status === "success" ? "active" : "inactive"}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {analytics.logs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="emptyState">No AI calls logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* CI/CD PIPELINES COMPONENT (FUTURE SCOPE) */

function PipelinesPage() {
  const [runs, setRuns] = useState([]);
  const [triggerName, setTriggerName] = useState("Dev Branch CI");
  const [triggerBranch, setTriggerBranch] = useState("main");
  const [loading, setLoading] = useState(false);

  const fetchRuns = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/pipelines/runs");
      setRuns(response.data.runs || []);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/pipelines/trigger", {
        pipelineName: triggerName,
        branch: triggerBranch
      });
      alert(`CI/CD Job triggered: ${triggerName} on branch ${triggerBranch}`);
      fetchRuns();
    } catch (error) {
      alert("Failed to trigger pipeline: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="title">CI/CD Pipelines Hub</h1>
      <p className="subtitle">Real-time Deployment Pipelines & Build Workflows</p>

      {/* Manual Trigger Panel */}
      <div className="page" style={{ marginBottom: "30px" }}>
        <h2>Trigger Build Job</h2>
        <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "15px" }}>
          <div className="inputField">
            <label>Pipeline Project</label>
            <select value={triggerName} onChange={(e) => setTriggerName(e.target.value)} style={{ padding: "12px", background: "#0b1329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "white" }}>
              <option value="Dev Branch CI">Dev Branch CI</option>
              <option value="Production Release Pipeline">Production Release Pipeline</option>
              <option value="Compliance Audit Check">Compliance Audit Check</option>
            </select>
          </div>
          <div className="inputField">
            <label>Branch / Commit Ref</label>
            <input type="text" value={triggerBranch} onChange={(e) => setTriggerBranch(e.target.value)} placeholder="main" />
          </div>
        </div>
        <button className="mainBtn" style={{ marginTop: "20px" }} onClick={handleTrigger} disabled={loading}>
          <FaPlay /> Trigger Workflow Run
        </button>
      </div>

      {/* Runs List */}
      <div className="tableBox">
        <h2>Recent Workflow Executions</h2>
        <div className="pipelineList">
          {runs.map((run) => (
            <div key={run.id} className={`pipelineCard ${run.status}`}>
              <div className="pipelineHeader">
                <div>
                  <h3>{run.pipelineName}</h3>
                  <span className="pipelineBranch">Branch: <strong>{run.branch}</strong> ({run.id})</span>
                </div>
                <span className={`badge ${run.status === "success" ? "active" : run.status === "failed" ? "crit-badge" : "warn"}`}>
                  {run.status}
                </span>
              </div>
              <p className="commitMsg">{run.commit}</p>
              
              {/* Stages Visual Track */}
              <div className="pipelineStages">
                {run.stages.map((stage, idx) => (
                  <div key={idx} className={`stageBubble ${stage.status}`}>
                    <div className="bubbleCircle">
                      {stage.status === "success" && <FaCheckCircle />}
                      {stage.status === "running" && <FaSync className="spin" />}
                      {stage.status === "failed" && <FaExclamationTriangle />}
                      {stage.status === "pending" && <span>•</span>}
                      {stage.status === "skipped" && <span>-</span>}
                    </div>
                    <span className="bubbleName">{stage.name}</span>
                  </div>
                ))}
              </div>

              <div className="pipelineFooter">
                <span>Duration: <strong>{run.duration}</strong></span>
                <span>Created: {new Date(run.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* APP DEPLOYER PAGE */

function DeployerPage() {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [port, setPort] = useState("");
  const [containerPort, setContainerPort] = useState("80");
  const [platform, setPlatform] = useState("docker");
  const [replicas, setReplicas] = useState("1");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("idle");

  const handleDeploy = async (e) => {
    e.preventDefault();
    if (!name || !image || !port || !containerPort) {
      alert("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setStatus("loading");
    setOutput("Initiating deployment request...\n");

    const url = platform === "docker"
      ? "http://localhost:5000/api/deploy/docker"
      : "http://localhost:5000/api/deploy/kubernetes";

    const payload = platform === "docker"
      ? { name, image, port, containerPort }
      : { name, image, port, containerPort, replicas };

    try {
      setOutput(prev => prev + `Target Platform: ${platform.toUpperCase()}\nImage Spec: ${image}\nHost Port: ${port} ➜ Container Port: ${containerPort}\nConnecting to backend API...\n`);
      const response = await axios.post(url, payload);
      if (response.data.success) {
        setStatus("success");
        setOutput(prev => prev + `\n[SUCCESS] Deployment applied successfully!\n\n${response.data.message}`);
      } else {
        setStatus("error");
        setOutput(prev => prev + `\n[ERROR] Deployment failed: ${response.data.error || "Unknown error"}`);
      }
    } catch (error) {
      setStatus("error");
      const errMsg = error.response?.data?.error || error.message;
      setOutput(prev => prev + `\n[ERROR] Request failed:\n${errMsg}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="title">App Deployer</h1>
      <p className="subtitle">Deploy application containers to Docker or Kubernetes with a single click</p>

      <div className="page" style={{ marginTop: "24px" }}>
        <form onSubmit={handleDeploy}>
          <h2>Deployment Specifications</h2>
          <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "15px" }}>
            <div className="inputField">
              <label>Application Name</label>
              <input
                type="text"
                placeholder="e.g. web-app"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="inputField">
              <label>Container Image</label>
              <input
                type="text"
                placeholder="e.g. nginx:alpine"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>
            <div className="inputField">
              <label>Host Port (External Access Port)</label>
              <input
                type="number"
                placeholder="e.g. 8080"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
              />
            </div>
            <div className="inputField">
              <label>Container Port (Internal Listening Port)</label>
              <input
                type="number"
                placeholder="e.g. 80"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                required
              />
            </div>
            <div className="inputField">
              <label>Target Platform</label>
              <div className="radioGroup" style={{ display: "flex", gap: "24px", marginTop: "12px" }}>
                <label className="radioLabel" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input
                    type="radio"
                    name="platform"
                    value="docker"
                    checked={platform === "docker"}
                    onChange={() => setPlatform("docker")}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  Docker Container
                </label>
                <label className="radioLabel" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input
                    type="radio"
                    name="platform"
                    value="kubernetes"
                    checked={platform === "kubernetes"}
                    onChange={() => setPlatform("kubernetes")}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  Kubernetes Pod
                </label>
              </div>
            </div>

            {platform === "kubernetes" && (
              <div className="inputField" style={{ gridColumn: "span 2" }}>
                <label>Replica Count</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={replicas}
                  onChange={(e) => setReplicas(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: "24px" }}>
            <button type="submit" className="mainBtn" disabled={loading}>
              {loading ? <FaSync className="spin" /> : <FaPlay />} Launch Deployment
            </button>
          </div>
        </form>
      </div>

      <div className="tableBox terminalBoxContainer" style={{ marginTop: "30px" }}>
        <h2>Deployment Console Log</h2>
        <div className={`consoleScreen ${status === "success" ? "successScreen" : status === "error" ? "errorScreen" : ""}`}>
          {output || "Awaiting deployment configurations to launch..."}
          {loading && <span className="cursor-blink"> █</span>}
        </div>
      </div>
    </div>
  );
}

/* SETTINGS PAGE */

function SettingsPage() {
  const [settings, setSettings] = useState({
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
  });

  const [loading, setLoading] = useState(false);

  const toggleTheme = () => {
    document.body.classList.toggle("lightMode");
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get("http://localhost:5000/settings");
      setSettings(res.data);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/settings", settings);
      alert("Settings and Integrations Saved Successfully.");
    } catch (error) {
      alert("Failed to save settings: " + error.message);
    }
    setLoading(false);
  };

  const handleChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleTestNotifications = async () => {
    alert("Triggering manual health checks. Critical infrastructure warnings will send alerts.");
  };

  return (
    <div>
      <h1 className="title">Settings & Control Panel</h1>
      <p className="subtitle">Configure Integrations, Theme Schemes and API Access</p>

      <div className="page">
        <div className="settingsSection">
          <h2>UI Themes</h2>
          <div className="themeButtons">
            <button className="mainBtn" onClick={toggleTheme}>
              Toggle Theme (Light / Dark)
            </button>
          </div>
        </div>

        <div className="settingsSection" style={{ marginTop: "40px" }}>
          <h2>Autonomous AI Auto-Healing</h2>
          <p className="sectionHelp">Enables the background daemon to invoke TinyLlama on logs, diagnostic issues, and auto-restart failed resources.</p>
          <div className="checkboxField" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
            <input
              type="checkbox"
              id="autoHealSwitch"
              checked={settings.autoHealingEnabled || false}
              onChange={(e) => handleChange("autoHealingEnabled", e.target.checked)}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
            <label htmlFor="autoHealSwitch" style={{ fontWeight: "bold", cursor: "pointer" }}>
              Enable Autonomous Auto-Healing (Docker restart / Kubectl delete pod)
            </label>
          </div>
        </div>

        <div className="settingsSection" style={{ marginTop: "40px" }}>
          <h2>CI/CD: GitHub Actions Integration</h2>
          <p className="sectionHelp">Fetch workflows telemetry dynamically from Github Actions API.</p>
          <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="inputField">
              <label>GitHub Repository Path (owner/repo)</label>
              <input
                type="text"
                placeholder="GoogleCloudPlatform/microservices-demo"
                value={settings.githubRepo || ""}
                onChange={(e) => handleChange("githubRepo", e.target.value)}
              />
            </div>
            <div className="inputField">
              <label>Personal Access Token (PAT)</label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.githubToken || ""}
                onChange={(e) => handleChange("githubToken", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="settingsSection" style={{ marginTop: "40px" }}>
          <h2>Slack Webhook Integration</h2>
          <p className="sectionHelp">Sends critical alerts dynamically to your DevOps Slack channel.</p>
          <div className="inputField">
            <label>Slack Webhook URL</label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/YOUR-WORKSPACE/YOUR-CHANNEL/YOUR-TOKEN"
              value={settings.slackWebhookUrl || ""}
              onChange={(e) => handleChange("slackWebhookUrl", e.target.value)}
            />
          </div>
        </div>

        <div className="settingsSection" style={{ marginTop: "40px" }}>
          <h2>SMTP Email Notifications</h2>
          <p className="sectionHelp">Configure outbound SMTP details to receive instant notification logs.</p>
          
          <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "15px" }}>
            <div className="inputField">
              <label>SMTP Host</label>
              <input
                type="text"
                placeholder="smtp.mailgun.org"
                value={settings.smtpHost || ""}
                onChange={(e) => handleChange("smtpHost", e.target.value)}
              />
            </div>
            <div className="inputField">
              <label>SMTP Port</label>
              <input
                type="text"
                placeholder="587"
                value={settings.smtpPort || ""}
                onChange={(e) => handleChange("smtpPort", e.target.value)}
              />
            </div>
            <div className="inputField">
              <label>SMTP Username / User Email</label>
              <input
                type="text"
                placeholder="postmaster@yourdomain.com"
                value={settings.smtpUser || ""}
                onChange={(e) => handleChange("smtpUser", e.target.value)}
              />
            </div>
            <div className="inputField">
              <label>SMTP Password</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={settings.smtpPass || ""}
                onChange={(e) => handleChange("smtpPass", e.target.value)}
              />
            </div>
            <div className="inputField" style={{ gridColumn: "span 2" }}>
              <label>Alerts Recipient Email</label>
              <input
                type="email"
                placeholder="devops-alerts@company.com"
                value={settings.smtpRecipient || ""}
                onChange={(e) => handleChange("smtpRecipient", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="btnGroup" style={{ marginTop: "40px" }}>
          <button className="mainBtn" onClick={handleSaveSettings} disabled={loading}>
            Save Configuration
          </button>
          <button className="secondaryBtn" onClick={handleTestNotifications}>
            Test System Alerts
          </button>
        </div>
      </div>
    </div>
  );
}

/* APP MAIN ROUTER */

function App() {
  const [session, setSession] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [demoMode, setDemoMode] = useState(
    localStorage.getItem("demoMode") === "true"
  );

  useEffect(() => {
    const handleDemoChange = () => {
      setDemoMode(localStorage.getItem("demoMode") === "true");
    };
    window.addEventListener("demoModeChanged", handleDemoChange);
    return () => {
      window.removeEventListener("demoModeChanged", handleDemoChange);
    };
  }, []);

  const toggleDemoMode = () => {
    const newMode = !demoMode;
    localStorage.setItem("demoMode", String(newMode));
    setDemoMode(newMode);
    window.dispatchEvent(new Event("demoModeChanged"));
    window.location.reload();
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        if (data && data.session) {
          setSession(data.session);
        }
      })
      .catch(err => {
        console.warn("Supabase local session recovery skipped:", err.message);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (listener && listener.subscription) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout failed, clearing local session:", e.message);
    }
    setSession(null);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("lightMode");
  };

  // PWA install prompt states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppMode, setIsAppMode] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsAppMode(!!isStandalone);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppMode(true);
      alert("DevGenAI App installed successfully!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowHelpModal(true);
    }
  };

  if (!session) {
    return <Login setSession={setSession} />;
  }

  return (
    <Router>
      <div className="container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebarTitle">
            <FaRobot className="robotLogo" />
            <h1 className="logo">DevGenAI</h1>
          </div>
          <div 
            className={`demoToggleContainer ${demoMode ? 'demoActive' : 'liveActive'}`} 
            onClick={toggleDemoMode}
            title="Click to toggle Demo Mode (simulated in-browser environment) vs Live Mode (connecting to localhost:5000)"
          >
            <span className="demoIndicatorDot"></span>
            <span className="demoToggleLabel">
              {demoMode ? "✨ Demo Mode" : "🔌 Live Node"}
            </span>
          </div>
          <ul>
            <li>
              <Link to="/"><FaCloud /> Dashboard</Link>
            </li>
            <li>
              <Link to="/ai"><FaRobot /> AI Assistant</Link>
            </li>
            <li>
              <Link to="/incident"><FaExclamationTriangle /> Incident Resolver</Link>
            </li>
            <li>
              <Link to="/yaml"><FaFileCode /> YAML Generator</Link>
            </li>
            <li>
              <Link to="/chatops"><FaTerminal /> ChatOps Console</Link>
            </li>
            <li>
              <Link to="/pipelines"><FaPlay /> CI/CD Pipelines</Link>
            </li>
            <li>
              <Link to="/docs"><FaBook /> Docs Generator</Link>
            </li>
            <li>
              <Link to="/promptops"><FaCodeBranch /> PromptOps</Link>
            </li>
            <li>
              <Link to="/deployer"><FaPlay /> App Deployer</Link>
            </li>
            <li>
              <Link to="/settings"><FaCogs /> Settings</Link>
            </li>
          </ul>

          {/* Sleek PWA Install Card */}
          {isAppMode ? (
            <div className="installCard">
              <h4>App Installed 📱</h4>
              <p>Running in desktop window with offline support.</p>
            </div>
          ) : (
            <div className="installCard">
              <h4>Install App</h4>
              <p>Run DevGenAI locally for offline support & better performance.</p>
              <button className="installBtn" onClick={handleInstallClick}>
                <FaDownload /> Download App
              </button>
            </div>
          )}

          <button className="logoutBtn sidebarLogout" onClick={logout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>

        {/* Main Content Area */}
        <div className="main">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  darkMode={darkMode}
                  toggleTheme={toggleTheme}
                  session={session}
                />
              }
            />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/incident" element={<IncidentResolverPage />} />
            <Route path="/yaml" element={<YAMLPage />} />
            <Route path="/chatops" element={<ChatOpsPage />} />
            <Route path="/pipelines" element={<PipelinesPage />} />
            <Route path="/docs" element={<DocsGeneratorPage />} />
            <Route path="/promptops" element={<PromptOpsPage />} />
            <Route path="/deployer" element={<DeployerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>

      {/* Install Instructions Modal */}
      {showHelpModal && (
        <div className="modalOverlay" onClick={() => setShowHelpModal(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modalHeader">
              <h3>How to Install DevGenAI</h3>
              <button className="closeBtn" onClick={() => setShowHelpModal(false)}>&times;</button>
            </div>
            <div className="modalBody" style={{ color: "#cbd5e1", lineHeight: "1.6" }}>
              <p>You can download and run <strong>DevGenAI</strong> as a desktop/mobile app directly from your browser:</p>
              <ol style={{ paddingLeft: "20px", margin: "15px 0" }}>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Google Chrome / Microsoft Edge / Brave:</strong> Click the 
                  <span style={{ color: "#38bdf8", padding: "0 4px" }}><FaDownload style={{ display: "inline", transform: "translateY(1px)" }} /> App Install</span> 
                  icon in the address bar at the top, or select "Install DevGenAI" from the browser menu.
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Safari (iOS / macOS):</strong> Tap the <strong>Share</strong> button (box with upward arrow) and select <strong>"Add to Home Screen"</strong>.
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Firefox:</strong> Open the menu (three lines) and select <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong> if available.
                </li>
              </ol>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "20px" }}>
                Once installed, the app runs in its own window and is accessible directly from your desktop or app drawer.
              </p>
            </div>
            <div className="modalFooter">
              <button className="mainBtn" onClick={() => setShowHelpModal(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;