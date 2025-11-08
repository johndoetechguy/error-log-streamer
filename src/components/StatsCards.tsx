import { Card } from "./ui/card";
import { Activity, AlertTriangle, Clock, Server } from "lucide-react";
import { useMemo } from "react";

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

interface StatsCardsProps {
  logs: ErrorLog[];
}

export const StatsCards = ({ logs }: StatsCardsProps) => {
  const stats = useMemo(() => {
    const totalErrors = logs.length;
    const uniqueServices = new Set(logs.map((log) => log.serviceName)).size;
    const uniqueClusters = new Set(logs.map((log) => log.awsCluster)).size;
    
    // Calculate error rate (errors per minute in last 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentErrors = logs.filter(
      (log) => new Date(log.timestamp) >= fiveMinutesAgo
    ).length;
    const errorRate = (recentErrors / 5).toFixed(1);

    // Most common category
    const categories: Record<string, number> = {};
    logs.forEach((log) => {
      categories[log.errorCategory] = (categories[log.errorCategory] || 0) + 1;
    });
    const mostCommonCategory = Object.entries(categories).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] || "N/A";

    return {
      totalErrors,
      uniqueServices,
      uniqueClusters,
      errorRate,
      mostCommonCategory,
    };
  }, [logs]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Errors</p>
            <p className="text-3xl font-bold mt-2">{stats.totalErrors}</p>
          </div>
          <Activity className="h-8 w-8 text-primary" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
            <p className="text-3xl font-bold mt-2">{stats.errorRate}</p>
            <p className="text-xs text-muted-foreground mt-1">errors/min</p>
          </div>
          <Clock className="h-8 w-8 text-warning" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Affected Services</p>
            <p className="text-3xl font-bold mt-2">{stats.uniqueServices}</p>
          </div>
          <Server className="h-8 w-8 text-accent" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Top Category</p>
            <p className="text-lg font-bold mt-2">{stats.mostCommonCategory}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.uniqueClusters} clusters</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
      </Card>
    </div>
  );
};
