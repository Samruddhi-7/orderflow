"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { Card, CardHeader, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Clock, ChefHat, Truck, Check, X } from "lucide-react";
import { toast } from "sonner";

type Order = {
  id: string;
  status: string;
  total_amount: string;
  created_at: string;
};

const COLUMNS = [
  { id: "placed", title: "New Orders", icon: Clock },
  { id: "confirmed", title: "Confirmed", icon: Check },
  { id: "preparing", title: "Preparing", icon: ChefHat },
  { id: "out_for_delivery", title: "Out for Delivery", icon: Truck },
];

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = () => {
    fetchApi<Order[]>("/orders")
      .then(data => setOrders(data ?? []))
      .catch(err => setError(err.message || "Failed to load live orders"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, " ")}`);
      loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter((o) => o.status === status);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Loading live orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="bg-status-error/10 text-status-error px-4 py-3 rounded-xl border border-status-error/20 max-w-md text-center">
          <p className="font-semibold mb-1">Could not load live orders</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col pb-8">
      <div className="mb-6">
        <h2 className="font-display text-4xl font-bold">Kanban Board</h2>
        <p className="text-ink/80 mt-1">Manage incoming orders. Updates are synced live.</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
        {COLUMNS.map((col) => {
          const colOrders = getOrdersByStatus(col.id);
          const Icon = col.icon;
          
          return (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-muted/10 rounded-2xl p-4 snap-start border border-muted/20">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-ink/70" />
                  <h3 className="font-display text-lg font-bold">{col.title}</h3>
                </div>
                <Badge variant="muted" className="text-xs bg-bg font-mono">
                  {colOrders.length}
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {colOrders.length === 0 ? (
                  <div className="h-24 border-2 border-dashed border-muted/30 rounded-xl flex items-center justify-center text-ink/40 text-sm font-medium">
                    No orders
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <Card key={order.id} className="cursor-grab active:cursor-grabbing hover:border-accent/40 hover:shadow-md transition-all">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-sm font-bold tracking-tight">#{order.id.substring(0,8)}</span>
                          <span className="font-mono text-sm font-medium bg-accent-soft/50 px-2 py-0.5 rounded text-ink">
                            ${order.total_amount}
                          </span>
                        </div>
                        <p className="text-xs text-ink/60 mt-1">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </CardHeader>
                      
                      <CardFooter className="p-4 pt-2 flex flex-col gap-2">
                        {order.status === 'placed' && (
                          <div className="flex gap-2 w-full">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="flex-1 bg-status-success hover:opacity-90"
                              onClick={() => updateStatus(order.id, 'confirmed')}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="px-2 text-status-error hover:bg-status-error/10"
                              onClick={() => updateStatus(order.id, 'cancelled')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {order.status === 'confirmed' && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full"
                            onClick={() => updateStatus(order.id, 'preparing')}
                          >
                            Start Prep
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full"
                            onClick={() => updateStatus(order.id, 'out_for_delivery')}
                          >
                            Send Out
                          </Button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full bg-status-success hover:opacity-90"
                            onClick={() => updateStatus(order.id, 'delivered')}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
        
        {/* Completed/Cancelled Column */}
        <div className="flex-shrink-0 w-80 flex flex-col bg-muted/5 rounded-2xl p-4 snap-start border border-muted/10 opacity-75">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-display text-lg font-bold text-ink/60">History</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').slice(0, 10).map(order => (
              <div key={order.id} className="p-3 bg-bg rounded-xl border border-muted/20 flex justify-between items-center">
                <div>
                  <p className="font-mono text-xs font-bold text-ink/60">#{order.id.substring(0,8)}</p>
                  <p className="text-[10px] text-ink/40">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={order.status === 'delivered' ? 'success' : 'error'} className="scale-75 origin-right">
                  {order.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
