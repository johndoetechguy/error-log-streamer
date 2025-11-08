import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <Navbar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};
