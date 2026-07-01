"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api";
import Link from "next/link";

type Vendor = {
  id: string;
  name: string;
  description: string;
  status: string;
};

export default function CustomerDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchApi("/vendors").then(setVendors).catch(console.error);
    fetchApi("/orders").then(setOrders).catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Restaurants</h2>
        <div className="space-y-4">
          {vendors.map(v => (
            <div key={v.id} className="p-4 border rounded shadow-sm hover:shadow-md transition">
              <h3 className="font-bold text-lg">{v.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{v.description}</p>
              <Link href={`/customer/vendor/${v.id}`} className="text-blue-600 text-sm font-medium">
                View Menu &rarr;
              </Link>
            </div>
          ))}
          {vendors.length === 0 && <p className="text-gray-500">No restaurants available.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">My Orders</h2>
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="p-4 border rounded bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-gray-500">#{o.id.substring(0,8)}</span>
                <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${o.status === 'delivered' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                  {o.status}
                </span>
              </div>
              <p className="font-bold mb-2">${o.total_amount}</p>
              <Link href={`/customer/order/${o.id}`} className="text-blue-600 text-sm font-medium">
                Track Order &rarr;
              </Link>
            </div>
          ))}
          {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}
