"use client";

import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "customer")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return <div>Loading...</div>;

  return (
    <div>
      <nav className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-xl font-bold">OrderFlow Customer</h1>
        <div className="flex gap-4">
          <span>{user.email}</span>
          <button onClick={() => { logout(); router.push("/"); }} className="text-blue-600">Logout</button>
        </div>
      </nav>
      {children}
    </div>
  );
}
