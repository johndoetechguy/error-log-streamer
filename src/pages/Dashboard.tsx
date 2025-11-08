import { useState, useEffect } from "react";
import { StreamControls } from "@/components/StreamControls";
import { JsonViewer } from "@/components/JsonViewer";
import { ErrorAnalytics } from "@/components/ErrorAnalytics";
import { StatsCards } from "@/components/StatsCards";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocket } from "@/hooks/useWebSocket";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WS_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/^http/, "ws") + "/ws/stream";

const Dashboard = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const { isConnected, isStreaming, lastMessage } = useWebSocket(WS_URL);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "error-log" && lastMessage.data) {
        setLogs((prev) => [lastMessage.data, ...prev]);
      } else if (lastMessage.type === "error") {
        toast.error(lastMessage.message || "Error occurred");
      }
    }
  }, [lastMessage]);

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

  const fetchSettings = () => {
    const stored = localStorage.getItem("streamer-settings");
    return stored
      ? JSON.parse(stored)
      : { interval: 5000, template: "" };
  };

  const toggleStream = async () => {
    try {
      const settings = fetchSettings();
      
      if (isStreaming) {
        // Stop stream
        const response = await fetch(`${API_URL}/api/stop-stream`);
        if (response.ok) {
          toast.info("Stream stopped");
        } else {
          throw new Error("Failed to stop stream");
        }
      } else {
        // Start stream
        const response = await fetch(`${API_URL}/api/start-stream?interval=${settings.interval}`);
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
      const response = await fetch(`${API_URL}/api/generate-error`, {
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
