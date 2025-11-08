import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Play, Pause, Download, Trash2 } from "lucide-react";

interface StreamControlsProps {
  isStreaming: boolean;
  onToggleStream: () => void;
  onExport: () => void;
  onClear: () => void;
  logCount: number;
}

export const StreamControls = ({
  isStreaming,
  onToggleStream,
  onExport,
  onClear,
  logCount,
}: StreamControlsProps) => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Stream Controls</h2>
          <p className="text-muted-foreground">
            {logCount} {logCount === 1 ? "log" : "logs"} received
          </p>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={onToggleStream}
            className="w-full"
            variant={isStreaming ? "destructive" : "default"}
          >
            {isStreaming ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop Stream
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Stream
              </>
            )}
          </Button>
          
          <Button
            onClick={onExport}
            className="w-full"
            variant="secondary"
            disabled={logCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          
          <Button
            onClick={onClear}
            className="w-full"
            variant="outline"
            disabled={logCount === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
        </div>
      </div>
    </Card>
  );
};
