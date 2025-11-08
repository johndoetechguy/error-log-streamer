import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ProviderInfo {
  type: string | null;
  modelName: string | null;
}

interface StreamingContextValue {
  providerInfo: ProviderInfo;
  isStreaming: boolean;
  setProviderInfo: (info: ProviderInfo) => void;
  setIsStreaming: (value: boolean) => void;
}

const StreamingContext = createContext<StreamingContextValue | undefined>(undefined);

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [providerInfo, setProviderInfoState] = useState<ProviderInfo>({
    type: null,
    modelName: null,
  });
  const [isStreaming, setIsStreaming] = useState(false);

  const setProviderInfo = (info: ProviderInfo) => {
    setProviderInfoState((prev) => {
      if (prev.type === info.type && prev.modelName === info.modelName) {
        return prev;
      }
      return info;
    });
  };

  const value = useMemo(
    () => ({
      providerInfo,
      isStreaming,
      setProviderInfo,
      setIsStreaming,
    }),
    [providerInfo, isStreaming],
  );

  return <StreamingContext.Provider value={value}>{children}</StreamingContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useStreamingContext() {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error("useStreamingContext must be used within a StreamingProvider");
  }
  return context;
}

