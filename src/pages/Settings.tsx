import { useState, useEffect, useCallback } from "react";
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
import { useStreamingContext } from "@/context/StreamingContext";

const DEFAULT_PROMPT = `You are a streaming data generator. Produce one realistic API error event in strict JSON format only.

Formatting requirements:
- errorCode, serviceName, errorCategory, errorLocation, and apiName must be uppercase with underscores (e.g. PAYMENT_GATEWAY_TIMEOUT_ERR).
- orderId and correlationId must be valid UUID v4 strings.
- errorStackTrace must be a realistic multi-line stack trace with at least 3 frames.
- Return valid JSON with double-quoted keys and no trailing commas.

Variation requirements:
- Maintain at most {{VARIATION_LIMIT}} distinct values across errorCode, serviceName, errorCategory, errorLocation, and apiName.
- After reaching the limit, reuse previously emitted values while still varying combinations and other fields.
- Keep the response coherent with the generated identifiers and timestamps.

Output rules:
- Emit a single JSON object only. No explanations, comments, or code fences.`;

type ProviderType = "gemini" | "ollama";

interface ProviderConfig {
  modelName: string;
  apiUrl: string;
  apiKey?: string;
}

interface AppConfigState {
  VITE_API_URL: string;
  ERROR_VARIATION_LIMIT: number;
}

const PROVIDER_TYPES: ProviderType[] = ["gemini", "ollama"];

const DEFAULT_PROVIDER_SETTINGS: Record<ProviderType, ProviderConfig> = {
  gemini: {
    modelName: "gemini-2.5-flash-preview-05-20",
    apiUrl: "https://generativelanguage.googleapis.com",
    apiKey: "",
  },
  ollama: {
    modelName: "llama3.2:3b",
    apiUrl: "http://localhost:11434",
    apiKey: "",
  },
};

const DEFAULT_APP_CONFIG: AppConfigState = {
  VITE_API_URL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  ERROR_VARIATION_LIMIT: 10,
};

const VARIATION_LIMIT_MIN = 1;
const VARIATION_LIMIT_MAX = 10;

const PROVIDER_METADATA: Record<
  ProviderType,
  { title: string; description: string; apiKeyHelper: string }
> = {
  gemini: {
    title: "Gemini",
    description: "Hosted Gemini API via Google AI Studio",
    apiKeyHelper: "API key required. Store securely in .env for production use.",
  },
  ollama: {
    title: "Ollama",
    description: "Self-hosted Ollama instance for local inference",
    apiKeyHelper: "Optional: only needed if your Ollama endpoint enforces authentication.",
  },
};

const createDefaultProviderSettings = (): Record<ProviderType, ProviderConfig> => ({
  gemini: { ...DEFAULT_PROVIDER_SETTINGS.gemini },
  ollama: { ...DEFAULT_PROVIDER_SETTINGS.ollama },
});

const mergeProviderSettings = (
  input?: Partial<Record<ProviderType, Partial<ProviderConfig>>>
): Record<ProviderType, ProviderConfig> => {
  const defaults = createDefaultProviderSettings();

  if (!input) {
    return defaults;
  }

  return PROVIDER_TYPES.reduce((acc, provider) => {
    const providerInput = input[provider] || {};
    acc[provider] = {
      modelName: providerInput.modelName || defaults[provider].modelName,
      apiUrl: providerInput.apiUrl || defaults[provider].apiUrl,
      apiKey: providerInput.apiKey ?? defaults[provider].apiKey,
    };
    return acc;
  }, {} as Record<ProviderType, ProviderConfig>);
};

const clampVariationLimit = (value: unknown): number => {
  const parsed =
    typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_APP_CONFIG.ERROR_VARIATION_LIMIT;
  }
  const intValue = Math.trunc(parsed);
  return Math.min(VARIATION_LIMIT_MAX, Math.max(VARIATION_LIMIT_MIN, intValue));
};

const mergeAppConfigState = (input?: Partial<Record<string, unknown>>): AppConfigState => {
  const base = input ?? {};
  const apiUrl =
    typeof base.VITE_API_URL === "string" && base.VITE_API_URL.trim().length > 0
      ? base.VITE_API_URL.trim()
      : DEFAULT_APP_CONFIG.VITE_API_URL;

  return {
    VITE_API_URL: apiUrl,
    ERROR_VARIATION_LIMIT: clampVariationLimit(base.ERROR_VARIATION_LIMIT),
  };
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [interval, setInterval] = useState(5000);
  const [template, setTemplate] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderType>("gemini");
  const [providerSettings, setProviderSettings] = useState<Record<ProviderType, ProviderConfig>>(
    () => createDefaultProviderSettings()
  );
  const [appConfig, setAppConfig] = useState<AppConfigState>(() => ({ ...DEFAULT_APP_CONFIG }));
  const { setProviderInfo } = useStreamingContext();

  const applyProviderToContext = useCallback(
    (provider: ProviderType, settings: Record<ProviderType, ProviderConfig>) => {
      const config = settings[provider];
      setProviderInfo({
        type: provider,
        modelName: config?.modelName ?? null,
      });
    },
    [setProviderInfo],
  );

  const updateProviderField = (
    provider: ProviderType,
    field: keyof ProviderConfig,
    value: string
  ) => {
    setProviderSettings((prev) => {
      const next = {
        ...prev,
        [provider]: {
          ...prev[provider],
          [field]: value,
        },
      };

      if (provider === activeProvider) {
        applyProviderToContext(provider, next);
      }

      return next;
    });
  };

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
          if (serverConfig.appConfig) {
            const mergedAppConfig = mergeAppConfigState(serverConfig.appConfig);
            setAppConfig(mergedAppConfig);
          }
          if (serverConfig.aiProvider) {
            const { activeProvider: active, providers } = serverConfig.aiProvider;
            if (active && PROVIDER_TYPES.includes(active)) {
              setActiveProvider(active);
            }
            {
              const merged = mergeProviderSettings(providers);
              setProviderSettings(merged);
              if (active && PROVIDER_TYPES.includes(active)) {
                applyProviderToContext(active, merged);
              }
            }
          }
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem("streamer-settings");
          if (stored) {
            const settings = JSON.parse(stored);
            setInterval(settings.interval || 5000);
            setTemplate(settings.template || DEFAULT_PROMPT);
            if (settings.appConfig) {
              const mergedAppConfig = mergeAppConfigState(settings.appConfig);
              setAppConfig(mergedAppConfig);
            }
            if (settings.aiProvider) {
              const { activeProvider: active, providers } = settings.aiProvider;
              if (active && PROVIDER_TYPES.includes(active)) {
                setActiveProvider(active);
              }
              const merged = mergeProviderSettings(providers);
              setProviderSettings(merged);
              if (active && PROVIDER_TYPES.includes(active)) {
                applyProviderToContext(active, merged);
              }
            }
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
          if (settings.appConfig) {
            const mergedAppConfig = mergeAppConfigState(settings.appConfig);
            setAppConfig(mergedAppConfig);
          }
          if (settings.aiProvider) {
            const { activeProvider: active, providers } = settings.aiProvider;
            if (active && PROVIDER_TYPES.includes(active)) {
              setActiveProvider(active);
            }
            const merged = mergeProviderSettings(providers);
            setProviderSettings(merged);
            if (active && PROVIDER_TYPES.includes(active)) {
              applyProviderToContext(active, merged);
            }
          }
        }
      }
    };

    loadSettings();
  }, [applyProviderToContext]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const payload = {
        interval,
        template,
        aiProvider: {
          activeProvider,
          providers: providerSettings,
        },
        appConfig,
      };

      // Save to server
      const response = await fetch(`${API_URL}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();

        let nextActiveProvider = activeProvider;
        let nextProviderSettings = providerSettings;

        if (data?.aiProvider) {
          if (data.aiProvider.activeProvider && PROVIDER_TYPES.includes(data.aiProvider.activeProvider)) {
            nextActiveProvider = data.aiProvider.activeProvider;
            setActiveProvider(data.aiProvider.activeProvider);
          }
          if (data.aiProvider.providers) {
            nextProviderSettings = mergeProviderSettings(data.aiProvider.providers);
            setProviderSettings(nextProviderSettings);
          }
        }

        let nextAppConfig = appConfig;
        if (data?.appConfig) {
          nextAppConfig = mergeAppConfigState(data.appConfig);
          setAppConfig(nextAppConfig);
        }

        const settingsToPersist = {
          interval: data.config?.interval ?? interval,
          template: data.config?.template ?? template,
          appConfig: nextAppConfig,
          aiProvider: {
            activeProvider: nextActiveProvider,
            providers: nextProviderSettings,
          },
        };
        localStorage.setItem("streamer-settings", JSON.stringify(settingsToPersist));
        applyProviderToContext(
          (nextActiveProvider as ProviderType) ?? activeProvider,
          nextProviderSettings as Record<ProviderType, ProviderConfig>,
        );
        toast.success("Settings saved successfully");
      } else {
        throw new Error("Failed to save settings to server");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      // Fallback: save to localStorage only
      const settings = {
        interval,
        template,
        appConfig,
        aiProvider: {
          activeProvider,
          providers: providerSettings,
        },
      };
      localStorage.setItem("streamer-settings", JSON.stringify(settings));
      applyProviderToContext(activeProvider, providerSettings);
      toast.warning("Settings saved locally (server unavailable)");
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    setInterval(5000);
    setTemplate(DEFAULT_PROMPT);
    setAppConfig({ ...DEFAULT_APP_CONFIG });
    setActiveProvider("gemini");
    const defaults = createDefaultProviderSettings();
    setProviderSettings(defaults);
    applyProviderToContext("gemini", defaults);
    localStorage.removeItem("streamer-settings");
    toast.info("Settings reset to defaults");
  };

  const purgeData = async () => {
    if (!window.confirm("This will delete all generated error logs and analytics. Continue?")) {
      return;
    }

    try {
      const baseUrl = appConfig.VITE_API_URL || API_URL;
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/logs`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to purge data");
      }

      toast.success("All stored logs and analytics were deleted.");
    } catch (error) {
      console.error("Error purging data:", error);
      const message = error instanceof Error ? error.message : "Failed to purge stored data";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 w-full">
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
          <Label htmlFor="app-api-url">VITE_API_URL</Label>
          <Input
            id="app-api-url"
            value={appConfig.VITE_API_URL}
            onChange={(e) =>
              setAppConfig((prev) => ({
                ...prev,
                VITE_API_URL: e.target.value,
              }))
            }
          />
          <p className="text-sm text-muted-foreground">
            Base API URL exposed to the frontend build pipeline. Update this when pointing the dashboard to a different
            backend environment.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-variation-limit">Max distinct uppercase identifiers (1-10)</Label>
          <Input
            id="app-variation-limit"
            type="number"
            inputMode="numeric"
            min={VARIATION_LIMIT_MIN}
            max={VARIATION_LIMIT_MAX}
            value={appConfig.ERROR_VARIATION_LIMIT}
            onChange={(e) =>
              setAppConfig((prev) => ({
                ...prev,
                ERROR_VARIATION_LIMIT: clampVariationLimit(e.target.value),
              }))
            }
          />
          <p className="text-sm text-muted-foreground">
            Controls how many unique values the generator may introduce for errorCode, serviceName, errorCategory,
            errorLocation, and apiName before reusing existing ones.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Active AI Provider</Label>
          <Select
            value={activeProvider}
            onValueChange={(value) => {
              const provider = value as ProviderType;
              setActiveProvider(provider);
              applyProviderToContext(provider, providerSettings);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Only the active provider will be used for streaming. Configure both to switch
            quickly without re-entering credentials.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDER_TYPES.map((provider) => {
            const config = providerSettings[provider];
            const meta = PROVIDER_METADATA[provider];
            const isActive = provider === activeProvider;
            return (
              <div
                key={provider}
                className={`space-y-4 rounded-md border p-4 transition-shadow ${
                  isActive ? "border-primary shadow-sm" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{meta.title}</h3>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  {isActive ? (
                    <span className="text-xs font-semibold text-primary">Active</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveProvider(provider)}
                    >
                      Set Active
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${provider}-model`}>Model Name</Label>
                  <Input
                    id={`${provider}-model`}
                    value={config.modelName}
                    onChange={(e) =>
                      updateProviderField(provider, "modelName", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${provider}-url`}>API URL</Label>
                  <Input
                    id={`${provider}-url`}
                    value={config.apiUrl}
                    onChange={(e) => updateProviderField(provider, "apiUrl", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {provider === "gemini"
                      ? "Base REST endpoint for Gemini (e.g. https://generativelanguage.googleapis.com)"
                      : "Base URL for your Ollama instance (e.g. http://localhost:11434)"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${provider}-key`}>
                    API Key {provider === "ollama" ? "(optional)" : ""}
                  </Label>
                  <Input
                    id={`${provider}-key`}
                    type="password"
                    value={config.apiKey}
                    onChange={(e) =>
                      updateProviderField(provider, "apiKey", e.target.value)
                    }
                    placeholder={provider === "ollama" ? "Optional" : "Required"}
                  />
                  <p className="text-xs text-muted-foreground">{meta.apiKeyHelper}</p>
                </div>
              </div>
            );
          })}
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
          <Button onClick={purgeData} variant="destructive">
            Delete Stored Data
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
