"use client";

import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Authenticating Admin...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="bg-white/80 backdrop-blur-md border-b border-muted/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Shield className="w-6 h-6 text-accent" />
              <h1 className="font-display text-2xl font-bold text-accent">Admin Portal</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-ink/60 hidden sm:inline-block px-3 py-1 bg-muted/10 rounded-full border border-muted/20">
                {user.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { logout(); router.push("/"); }}
                className="text-ink/60 hover:text-status-error hover:bg-status-error/10"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
