"use client";

import { useEffect, useState, use } from "react";
import { fetchApi, WS_URL } from "../../../../lib/api";
import Link from "next/link";

export default function OrderTracking({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchApi(`/orders/${orderId}`).then(data => {
      setOrder(data);
      setStatus(data.status);
    }).catch(console.error);

    // Setup WebSocket
    const ws = new WebSocket(`${WS_URL}/orders/${orderId}/track`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) {
          setStatus(data.status);
        }
      } catch (e) {}
    };

    return () => {
      ws.close();
    };
  }, [orderId]);

  if (!order) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border rounded shadow-sm">
      <Link href="/customer" className="text-blue-600 mb-6 inline-block">&larr; Back to Dashboard</Link>
      
      <h2 className="text-2xl font-bold mb-4">Order #{order.id.substring(0,8)}</h2>
      
      <div className="mb-8 p-4 bg-gray-50 rounded border">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Live Status</h3>
        <p className="text-3xl font-black capitalize text-blue-600 animate-pulse">{status}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Details</h3>
        <p>Total Amount: <span className="font-bold">${order.total_amount}</span></p>
        <p className="text-sm text-gray-500 mt-2">Created at: {new Date(order.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}
