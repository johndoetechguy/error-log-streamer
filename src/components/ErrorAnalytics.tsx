import { Card } from "./ui/card";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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

interface ErrorAnalyticsProps {
  logs: ErrorLog[];
}

const COLORS = {
  API_FAILURE: "hsl(var(--destructive))",
  VALIDATION_ERROR: "hsl(var(--warning))",
  SYSTEM_ERROR: "hsl(var(--primary))",
  NETWORK_FAILURE: "hsl(var(--accent))",
};

export const ErrorAnalytics = ({ logs }: ErrorAnalyticsProps) => {
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      counts[log.errorCategory] = (counts[log.errorCategory] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const serviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      counts[log.serviceName] = (counts[log.serviceName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 10); // Top 10 services
  }, [logs]);

  const timelineData = useMemo(() => {
    if (logs.length === 0) return [];
    
    const timeGroups: Record<string, number> = {};
    logs.forEach((log) => {
      const time = new Date(log.timestamp);
      const timeKey = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
    });
    
    return Object.entries(timeGroups)
      .map(([time, count]) => ({ time, count }))
      .slice(-20); // Last 20 time points
  }, [logs]);

  const clusterData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      counts[log.awsCluster] = (counts[log.awsCluster] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  if (logs.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Start streaming to see analytics
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Error Category Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Error Distribution by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "hsl(var(--muted))"} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Errors Over Time */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Errors Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Services with Errors */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Services with Errors</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={serviceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* AWS Cluster Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Errors by AWS Cluster</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clusterData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              dataKey="name" 
              type="category"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={150}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--accent))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
