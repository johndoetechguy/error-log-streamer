import { Card } from "@/components/ui/card";
import { Activity, Zap, Shield, Sparkles } from "lucide-react";

const About = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">About</h1>
        <p className="text-muted-foreground">
          Learn more about Synthetic Error Data Streamer
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold">What is this?</h2>
        <p className="text-muted-foreground">
          This application streams realistic synthetic API error logs in real-time,
          powered by Google Gemini AI. It's designed to help developers test monitoring
          systems, dashboard interfaces, and error handling workflows.
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-2">
          <Activity className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-xl font-semibold">Real-time Streaming</h3>
          <p className="text-muted-foreground">
            Generate and stream synthetic error logs at configurable intervals
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <Sparkles className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-xl font-semibold">AI-Powered</h3>
          <p className="text-muted-foreground">
            Uses Gemini 2.5 Flash to generate realistic, diverse error scenarios
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <Zap className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-xl font-semibold">Customizable</h3>
          <p className="text-muted-foreground">
            Configure stream intervals and customize the AI prompt template
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <Shield className="h-8 w-8 text-primary mb-2" />
          <h3 className="text-xl font-semibold">Export Ready</h3>
          <p className="text-muted-foreground">
            Export generated logs as JSON for further analysis or testing
          </p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Features</h2>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>Real-time error log generation using Gemini AI</li>
          <li>Configurable streaming intervals (1-10 seconds)</li>
          <li>Customizable prompt templates</li>
          <li>Dark/Light/System theme support</li>
          <li>JSON export functionality</li>
          <li>Responsive design for all devices</li>
          <li>Realistic error schemas with stack traces</li>
        </ul>
      </Card>
    </div>
  );
};

export default About;
