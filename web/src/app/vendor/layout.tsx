"use client";

import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "vendor")) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return <div>Loading...</div>;

  return (
    <div>
      <nav className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-xl font-bold">OrderFlow Vendor Portal</h1>
        <div className="flex gap-6 items-center">
          <Link href="/vendor" className="hover:text-blue-600 font-medium">Dashboard</Link>
          <Link href="/vendor/orders" className="hover:text-blue-600 font-medium">Live Orders</Link>
          <span className="text-gray-500 ml-4 border-l pl-4">{user.email}</span>
          <button onClick={() => { logout(); router.push("/"); }} className="text-blue-600">Logout</button>
        </div>
      </nav>
      {children}
    </div>
  );
}
