import { Activity, Menu, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { useStreamingContext } from "@/context/StreamingContext";

export const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const { providerInfo, isStreaming } = useStreamingContext();

  const providerLabel =
    providerInfo?.modelName ??
    (providerInfo?.type ? providerInfo.type.toUpperCase() : "Provider not configured");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="mr-1 md:hidden" />
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Synthetic Error Streamer</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
            <div
              className={`h-2 w-2 rounded-full ${isStreaming ? "bg-success animate-pulse" : "bg-muted-foreground"}`}
            />
            <span className="text-muted-foreground">{providerLabel}</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
