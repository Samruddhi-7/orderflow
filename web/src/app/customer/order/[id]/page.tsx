"use client";

import { useEffect, useState, use, useRef } from "react";
import { fetchApi, WS_URL } from "../../../../lib/api";
import Link from "next/link";
import { Timeline, OrderStatus } from "@/components/ui/Timeline";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function OrderTracking({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<OrderStatus>("placed");
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [loading, setLoading] = useState(true);
  const statusRef = useRef<OrderStatus>("placed");

  useEffect(() => {
    fetchApi(`/orders/${orderId}`)
      .then(data => {
        setOrder(data);
        setStatus(data.status as OrderStatus);
        statusRef.current = data.status as OrderStatus;
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Setup WebSocket with reconnect logic
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      const token = localStorage.getItem("accessToken");
      ws = new WebSocket(`${WS_URL}/orders/${orderId}/track?token=${token}`);
      
      ws.onopen = () => {
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status && data.status !== statusRef.current) {
            const oldStatus = statusRef.current;
            setStatus(data.status as OrderStatus);
            statusRef.current = data.status as OrderStatus;
            
            // Show nice toast based on status
            const statusNames: Record<string, string> = {
              confirmed: "Order Confirmed!",
              preparing: "Order is now being prepared.",
              out_for_delivery: "Your order is out for delivery!",
              delivered: "Order Delivered. Enjoy!"
            };
            
            toast.success(statusNames[data.status] || `Status updated to ${data.status.replace(/_/g, ' ')}`);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        // Reconnect after 3s
        reconnectTimeout = setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Loading order details...</div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-status-error font-medium">Order not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Link href="/customer" className="inline-flex items-center text-sm font-medium text-ink/60 hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </Link>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-4xl font-bold">Order Tracking</h2>
          {wsStatus === "disconnected" && (
            <div className="flex items-center gap-2 px-3 py-1 bg-status-error/10 text-status-error rounded-full text-sm font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-status-error"></span>
              Disconnected (Reconnecting...)
            </div>
          )}
        </div>
        <p className="font-mono text-ink/60">#{order.id}</p>
      </div>
      
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur overflow-hidden">
        <CardHeader className="bg-accent-soft/30 border-b border-muted/30 pb-8 pt-8">
          <Timeline currentStatus={status} className="mt-4 hidden md:flex px-8" />
          <Timeline currentStatus={status} orientation="vertical" className="mt-4 md:hidden pl-4" />
        </CardHeader>
        
        <CardContent className="pt-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display text-xl font-bold mb-4">Order Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-muted/30 pb-3">
                  <span className="text-ink/70">Total Amount</span>
                  <span className="font-mono font-bold">${order.total_amount}</span>
                </div>
                <div className="flex justify-between border-b border-muted/30 pb-3">
                  <span className="text-ink/70">Date Placed</span>
                  <span className="text-sm font-medium text-ink/90">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
