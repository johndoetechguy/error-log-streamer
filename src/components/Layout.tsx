import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "./Navbar";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 p-4">
            <SidebarTrigger className="mb-4" />
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};
