"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Store, DollarSign, Activity } from "lucide-react";

type Analytics = {
  total_orders: number;
  total_vendors: number;
  total_revenue: string;
};

type Vendor = {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi("/admin/analytics"),
      fetchApi("/admin/vendors")
    ])
    .then(([a, v]) => {
      setAnalytics(a);
      setVendors(v);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-ink/60 font-medium animate-pulse">
          <Activity className="w-5 h-5" />
          Loading platform data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <div className="space-y-2">
        <h2 className="font-display text-4xl font-bold">Platform Overview</h2>
        <p className="text-ink/80 text-lg">Real-time statistics and vendor management.</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur border-none shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-accent" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-mono text-ink/60 uppercase tracking-wider">Total Vendors</p>
                  <p className="font-display text-4xl font-bold">{analytics.total_vendors}</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Store className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur border-none shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-fresh" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-mono text-ink/60 uppercase tracking-wider">Total Orders</p>
                  <p className="font-display text-4xl font-bold">{analytics.total_orders}</p>
                </div>
                <div className="p-3 bg-fresh/10 rounded-xl">
                  <PackageIcon className="w-6 h-6 text-fresh" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur border-none shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-400" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-mono text-ink/60 uppercase tracking-wider">Total Revenue</p>
                  <p className="font-display text-4xl font-bold">${analytics.total_revenue}</p>
                </div>
                <div className="p-3 bg-indigo-400/10 rounded-xl">
                  <DollarSign className="w-6 h-6 text-indigo-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-accent" />
          <h3 className="font-display text-2xl font-bold">Vendor Roster</h3>
        </div>
        
        <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-muted/30 bg-muted/5">
                    <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/20">
                  {vendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-ink/50 tracking-tight">
                        {vendor.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">
                        {vendor.name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={vendor.status === 'active' ? 'success' : 'warning'}>
                          {vendor.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink/60">
                        {new Date(vendor.created_at).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-ink/50 font-medium">
                        No vendors registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inline icon component since we forgot to import Package
function PackageIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
