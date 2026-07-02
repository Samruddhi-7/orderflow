"use client";

import { useAuth } from "../../components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LogOut, LayoutDashboard, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "vendor")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Authenticating...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-muted/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="font-display text-2xl font-bold text-accent">Vendor Portal</h1>
              
              <nav className="hidden md:flex gap-1">
                <Link 
                  href="/vendor" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === '/vendor' 
                      ? 'bg-accent/10 text-accent' 
                      : 'text-ink/60 hover:text-ink hover:bg-muted/10'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Inventory
                </Link>
                <Link 
                  href="/vendor/orders" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === '/vendor/orders' 
                      ? 'bg-accent/10 text-accent' 
                      : 'text-ink/60 hover:text-ink hover:bg-muted/10'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  Kanban Board
                </Link>
              </nav>
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
