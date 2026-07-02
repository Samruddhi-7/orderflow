"use client";

import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CartSlideover } from "@/components/ui/CartSlideover";
import { Button } from "@/components/ui/Button";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-ink/60 font-medium animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b border-muted/30 bg-bg/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/customer')}>
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-bg font-display font-bold text-xl">O</div>
            <h1 className="font-display text-xl font-bold tracking-tight">OrderFlow</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-ink/60 hidden sm:inline-block">
              {user.email}
            </span>
            <div className="h-6 w-px bg-muted/50 hidden sm:block"></div>
            <CartSlideover />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { logout(); router.push("/"); }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full pt-8">
        {children}
      </main>
    </div>
  );
}
