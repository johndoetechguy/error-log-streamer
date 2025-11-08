import { useCallback, useEffect, useState } from "react";
import { StreamControls } from "@/components/StreamControls";
import { JsonViewer } from "@/components/JsonViewer";
import { ErrorAnalytics } from "@/components/ErrorAnalytics";
import { StatsCards } from "@/components/StatsCards";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useStreamingContext } from "@/context/StreamingContext";

interface ErrorLog {
  timestamp: string;
  errorCode: string;
  error: string;
  errorCategory: string;
  errorLocation: string;
  apiName: string;
  errorReason: string;
  awsCluster: string;
  actionToBeTaken: string;
  correlationId: string;
  orderId: string;
  serviceName: string;
  errorStackTrace: string;
}

const HARD_DEFAULT_API_URL = "http://localhost:3000";
const RAW_ENV_API_URL = import.meta.env.VITE_API_URL || HARD_DEFAULT_API_URL;

function normalizeApiBase(url: string): string {
  if (!url) {
    return HARD_DEFAULT_API_URL;
  }

  return url.trim().replace(/\/+$/, "");
}

function buildWebSocketUrl(baseUrl: string): string {
  const normalized = normalizeApiBase(baseUrl);

  try {
    const url = new URL(normalized);
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    }
    url.pathname = url.pathname.replace(/\/+$/, "") + "/ws/stream";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${normalized}/ws/stream`;
  }
}

const DEFAULT_API_URL = normalizeApiBase(RAW_ENV_API_URL);
const DEFAULT_WS_URL = buildWebSocketUrl(DEFAULT_API_URL);

const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  gemini: "gemini-2.5-flash-preview-05-20",
  ollama: "llama3.2:3b",
};

const Dashboard = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(DEFAULT_API_URL);
  const [wsUrl, setWsUrl] = useState<string>(DEFAULT_WS_URL);
  const { isConnected, isStreaming, lastMessage } = useWebSocket(wsUrl);
  const { setProviderInfo, setIsStreaming: setContextStreaming } = useStreamingContext();

  const applyProviderFromSettings = useCallback(
    (active: string | null, providers?: Record<string, { modelName?: string }>) => {
      if (!active) {
        return;
      }
      const modelName =
        providers?.[active]?.modelName ?? DEFAULT_MODEL_BY_PROVIDER[active] ?? null;

      setProviderInfo({
        type: active,
        modelName: modelName ?? null,
      });
    },
    [setProviderInfo],
  );

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "error-log" && lastMessage.data) {
        setLogs((prev) => [lastMessage.data, ...prev]);
      } else if (lastMessage.type === "error") {
        toast.error(lastMessage.message || "Error occurred");
      } else if (lastMessage.type === "status") {
        setContextStreaming(lastMessage.isStreaming ?? false);
        if (lastMessage.provider) {
          setProviderInfo({
            type: lastMessage.provider.type ?? null,
            modelName: lastMessage.provider.modelName ?? null,
          });
        }
      }
    }
  }, [lastMessage, setContextStreaming, setProviderInfo]);

  // Show connection status (only on initial connect/disconnect)
  const [hasShownConnectionStatus, setHasShownConnectionStatus] = useState(false);
  useEffect(() => {
    if (!hasShownConnectionStatus) {
      if (isConnected) {
        setHasShownConnectionStatus(true);
      }
    } else if (!isConnected) {
      toast.warning("WebSocket disconnected. Attempting to reconnect...");
    }
  }, [isConnected, hasShownConnectionStatus]);

  // Hydrate base URL from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("streamer-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedApi = parsed?.appConfig?.VITE_API_URL;
        if (typeof storedApi === "string" && storedApi.trim().length > 0) {
          setApiBaseUrl(normalizeApiBase(storedApi));
        }
        applyProviderFromSettings(parsed?.aiProvider?.activeProvider ?? null, parsed?.aiProvider?.providers);
      }
    } catch (error) {
      console.error("Error reading stored settings:", error);
    }
  }, [applyProviderFromSettings]);

  // Fetch configuration from backend to pick up server-side base URL
  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch(`${DEFAULT_API_URL}/api/config`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const configuredApiUrl = data?.appConfig?.VITE_API_URL;
        if (!cancelled && typeof configuredApiUrl === "string" && configuredApiUrl.trim().length > 0) {
          setApiBaseUrl(normalizeApiBase(configuredApiUrl));
        }
        if (!cancelled) {
          applyProviderFromSettings(data?.aiProvider?.activeProvider ?? null, data?.aiProvider?.providers);
        }
      } catch (error) {
        console.error("Error loading app configuration:", error);
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [applyProviderFromSettings]);

  // Keep websocket endpoint in sync with base API URL
  useEffect(() => {
    const nextWsUrl = buildWebSocketUrl(apiBaseUrl);
    setWsUrl((prev) => (prev === nextWsUrl ? prev : nextWsUrl));
  }, [apiBaseUrl]);

  const fetchSettings = () => {
    const stored = localStorage.getItem("streamer-settings");
    return stored
      ? JSON.parse(stored)
      : { interval: 5000, template: "" };
  };

  const toggleStream = async () => {
    try {
      const settings = fetchSettings();
      const baseUrl = apiBaseUrl || DEFAULT_API_URL;
      
      if (isStreaming) {
        // Stop stream
        const response = await fetch(`${baseUrl}/api/stop-stream`);
        if (response.ok) {
          toast.info("Stream stopped");
        } else {
          throw new Error("Failed to stop stream");
        }
      } else {
        // Start stream
        const response = await fetch(`${baseUrl}/api/start-stream?interval=${settings.interval}`);
        if (response.ok) {
          toast.success("Stream started");
        } else {
          throw new Error("Failed to start stream");
        }
      }
    } catch (error) {
      console.error("Error toggling stream:", error);
      const message = error instanceof Error ? error.message : "Failed to toggle stream";
      toast.error(message);
    }
  };

  const generateLog = async () => {
    try {
      const baseUrl = apiBaseUrl || DEFAULT_API_URL;
      const response = await fetch(`${baseUrl}/api/generate-error`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate log");
      }

      const data = await response.json();

      if (data?.log) {
        setLogs((prev) => [data.log, ...prev]);
      }
    } catch (error) {
      console.error("Error generating log:", error);
      const message = error instanceof Error ? error.message : "Failed to generate log";
      toast.error(message);
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `error-logs-${new Date().toISOString()}.json`;
    link.click();
    toast.success("Logs exported successfully");
  };

  const clearLogs = () => {
    setLogs([]);
    toast.info("Logs cleared");
  };

  useEffect(() => {
    setContextStreaming(isStreaming);
  }, [isStreaming, setContextStreaming]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time synthetic error log streaming with analytics
        </p>
      </div>

      <StatsCards logs={logs} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <StreamControls
          isStreaming={isStreaming}
          onToggleStream={toggleStream}
          onExport={exportLogs}
          onClear={clearLogs}
          logCount={logs.length}
        />
        
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="logs">Raw Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics" className="mt-6">
            <ErrorAnalytics logs={logs} />
          </TabsContent>
          
          <TabsContent value="logs" className="mt-6">
            <JsonViewer logs={logs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
