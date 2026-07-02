"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Vendor = {
  id: string;
  name: string;
  address: string;
  is_open: boolean;
};

export default function CustomerDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchApi("/vendors").then(setVendors),
      fetchApi("/orders").then(setOrders)
    ])
    .catch(err => {
      setError(err.message || "Failed to load dashboard data.");
    })
    .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="bg-status-error/10 text-status-error px-4 py-3 rounded-xl border border-status-error/20 max-w-md text-center">
          <p className="font-semibold mb-1">Could not load dashboard</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <section>
        <div className="mb-6">
          <h2 className="font-display text-3xl font-bold">Restaurants</h2>
          <p className="text-ink/80 mt-1">Discover fresh flavors delivered to your door.</p>
        </div>
        
        {vendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted p-12 text-center">
            <p className="text-ink/60 font-medium">No restaurants are currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vendors.map(v => (
              <Card key={v.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="line-clamp-1">{v.name}</CardTitle>
                    {v.is_open ? (
                      <Badge variant="success" className="shrink-0">Open Now</Badge>
                    ) : (
                      <Badge variant="muted" className="shrink-0">Closed</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-ink/70 text-sm line-clamp-2">
                    {v.address || "No address provided."}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href={`/customer/vendor/${v.id}`} className="w-full">
                    <Button variant={v.is_open ? "primary" : "secondary"} className="w-full">
                      View Menu
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-3xl font-bold">Recent Orders</h2>
        </div>
        
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted p-12 text-center">
            <p className="text-ink/60 font-medium">No orders yet — your order history will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map(o => {
              const statusColors: Record<string, "success" | "warning" | "default"> = {
                delivered: "success",
                out_for_delivery: "success",
                preparing: "warning",
                confirmed: "warning",
                placed: "default"
              };
              
              return (
                <Link key={o.id} href={`/customer/order/${o.id}`}>
                  <Card className="hover:border-accent/30 hover:ring-1 hover:ring-accent/30 cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-sm tracking-tight text-ink/60">
                          #{o.id.substring(0,8)}
                        </span>
                        <Badge variant={statusColors[o.status] || "default"} className="capitalize">
                          {o.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-sm text-ink/60 mb-1">Total</p>
                          <p className="font-mono text-xl font-medium">${o.total_amount}</p>
                        </div>
                        <span className="text-accent text-sm font-medium">Track &rarr;</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
