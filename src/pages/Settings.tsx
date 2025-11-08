import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";

const DEFAULT_PROMPT = `You are a streaming data generator. Produce one realistic API error event in JSON format only.

Generate one JSON object with these fields:
timestamp, errorCode, error, errorCategory, errorLocation, apiName, errorReason,
awsCluster, actionToBeTaken, correlationId, orderId, serviceName, errorStackTrace.

Rules:
- Output strictly valid JSON (no code blocks or explanations)
- Use current UTC time for timestamp
- Use uppercase for API and service names
- Include realistic stack traces and random UUIDs
- errorCategory must be one of: API_FAILURE, VALIDATION_ERROR, SYSTEM_ERROR, NETWORK_FAILURE`;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [interval, setInterval] = useState(5000);
  const [template, setTemplate] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);

  // Load settings from server and localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to get from server first
        const response = await fetch(`${API_URL}/api/config`);
        if (response.ok) {
          const serverConfig = await response.json();
          setInterval(serverConfig.interval || 5000);
          setTemplate(serverConfig.template || DEFAULT_PROMPT);
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem("streamer-settings");
          if (stored) {
            const settings = JSON.parse(stored);
            setInterval(settings.interval || 5000);
            setTemplate(settings.template || DEFAULT_PROMPT);
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem("streamer-settings");
        if (stored) {
          const settings = JSON.parse(stored);
          setInterval(settings.interval || 5000);
          setTemplate(settings.template || DEFAULT_PROMPT);
        }
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Save to server
      const response = await fetch(`${API_URL}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interval, template }),
      });

      if (response.ok) {
        // Also save to localStorage as backup
        const settings = { interval, template };
        localStorage.setItem("streamer-settings", JSON.stringify(settings));
        toast.success("Settings saved successfully");
      } else {
        throw new Error("Failed to save settings to server");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      // Fallback: save to localStorage only
      const settings = { interval, template };
      localStorage.setItem("streamer-settings", JSON.stringify(settings));
      toast.warning("Settings saved locally (server unavailable)");
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    setInterval(5000);
    setTemplate(DEFAULT_PROMPT);
    localStorage.removeItem("streamer-settings");
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure stream interval, prompt template, and theme
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="interval">Stream Interval (ms)</Label>
          <Input
            id="interval"
            type="number"
            min={1000}
            max={10000}
            step={1000}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            Time between each generated log (1000-10000ms)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Prompt Template</Label>
          <Textarea
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            This prompt will be sent to Gemini AI to generate synthetic errors
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color scheme
          </p>
        </div>

        <div className="flex gap-4">
          <Button onClick={saveSettings} className="flex-1" disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
          <Button onClick={resetSettings} variant="outline" className="flex-1">
            Reset to Defaults
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
