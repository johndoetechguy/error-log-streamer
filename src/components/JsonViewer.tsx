import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

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

interface JsonViewerProps {
  logs: ErrorLog[];
}

export const JsonViewer = ({ logs }: JsonViewerProps) => {
  return (
    <Card className="p-4 h-[600px]">
      <ScrollArea className="h-full">
        <pre className="text-sm font-mono">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">No data streaming yet...</div>
          ) : (
            JSON.stringify(logs, null, 2)
          )}
        </pre>
      </ScrollArea>
    </Card>
  );
};
