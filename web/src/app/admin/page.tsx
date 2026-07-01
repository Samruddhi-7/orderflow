"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api";

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

  if (loading) return <div>Loading platform data...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Platform Overview</h2>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded shadow-sm border border-l-4 border-l-blue-500">
            <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Total Vendors</p>
            <p className="text-3xl font-bold mt-2">{analytics.total_vendors}</p>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-l-4 border-l-green-500">
            <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Total Orders</p>
            <p className="text-3xl font-bold mt-2">{analytics.total_orders}</p>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-l-4 border-l-purple-500">
            <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Total Revenue (Delivered)</p>
            <p className="text-3xl font-bold mt-2">${analytics.total_revenue}</p>
          </div>
        </div>
      )}

      <h3 className="text-xl font-semibold mb-4">Vendor Roster</h3>
      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendors.map(vendor => (
              <tr key={vendor.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{vendor.id.substring(0,8)}...</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{vendor.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {vendor.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(vendor.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
