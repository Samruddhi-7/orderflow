"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";

type Order = {
  id: string;
  status: string;
  total_amount: string;
  created_at: string;
};

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = () => {
    fetchApi("/orders").then(setOrders).catch(console.error);
  };

  useEffect(() => {
    loadOrders();
    // Simple polling for incoming orders instead of full WS for lists in this demo
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Live Orders</h2>
      <p className="text-gray-600 mb-8">Manage incoming orders and update their status.</p>

      <div className="grid grid-cols-1 gap-4">
        {orders.length === 0 ? (
          <p className="text-gray-500">No orders to display.</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="p-4 border rounded shadow-sm bg-white flex justify-between items-center">
              <div>
                <h3 className="font-bold">Order #{order.id.substring(0,8)}</h3>
                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                <p className="font-semibold text-green-700 mt-1">${order.total_amount}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded bg-gray-100 text-sm font-bold uppercase tracking-wide">
                  {order.status}
                </span>

                <div className="flex gap-2">
                  {order.status === 'placed' && (
                    <button onClick={() => updateStatus(order.id, 'confirmed')} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Confirm</button>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">Start Prep</button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateStatus(order.id, 'out_for_delivery')} className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">Send for Delivery</button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button onClick={() => updateStatus(order.id, 'delivered')} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Mark Delivered</button>
                  )}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button onClick={() => updateStatus(order.id, 'cancelled')} className="border border-red-200 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-50">Cancel</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
