"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api";

type Vendor = {
  id: string;
  name: string;
  description: string;
  status: string;
};

type MenuItem = {
  id: string;
  name: string;
  price: string;
  stock_qty: number;
  is_available: boolean;
};

export default function VendorDashboard() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for new item
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");

  useEffect(() => {
    // 1. Get vendor profile for current user
    fetchApi("/vendors").then((vendors: Vendor[]) => {
      // In a real app we'd fetch the specific vendor for the logged-in user.
      // Assuming the first vendor belongs to the user for this demo if not strictly filtered by API
      if (vendors.length > 0) {
        setVendor(vendors[0]);
        // 2. Get menu
        return fetchApi(`/vendors/${vendors[0].id}/menu`);
      }
      return [];
    })
    .then(setMenuItems)
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    try {
      const created = await fetchApi(`/vendors/${vendor.id}/menu`, {
        method: "POST",
        body: JSON.stringify({
          name: newItemName,
          price: newItemPrice,
          stock_qty: parseInt(newItemStock),
          is_available: true
        })
      });
      setMenuItems([...menuItems, created]);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemStock("");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateStock = async (itemId: string, newStock: number) => {
    if (!vendor) return;
    try {
      const updated = await fetchApi(`/vendors/${vendor.id}/menu/${itemId}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stock_qty: newStock, is_available: newStock > 0 })
      });
      setMenuItems(menuItems.map(m => m.id === itemId ? updated : m));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!vendor) return (
    <div className="p-6 bg-yellow-50 text-yellow-800 rounded">
      You do not have a vendor profile yet. Please contact an admin.
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Inventory Management</h2>
      <p className="text-gray-600 mb-8">Manage your menu items and stock levels for {vendor.name}.</p>

      <div className="bg-white p-6 border rounded shadow-sm mb-8">
        <h3 className="text-lg font-semibold mb-4">Add Menu Item</h3>
        <form onSubmit={handleCreateItem} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input required value={newItemName} onChange={e => setNewItemName(e.target.value)} type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700">Price ($)</label>
            <input required value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} type="number" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700">Stock</label>
            <input required value={newItemStock} onChange={e => setNewItemStock(e.target.value)} type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700">
            Add Item
          </button>
        </form>
      </div>

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {menuItems.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">${item.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.stock_qty}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.is_available ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                  <button onClick={() => handleUpdateStock(item.id, item.stock_qty + 5)} className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded">+5 Stock</button>
                  <button onClick={() => handleUpdateStock(item.id, 0)} className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded">Mark Sold Out</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {menuItems.length === 0 && <div className="p-6 text-center text-gray-500">No menu items found.</div>}
      </div>
    </div>
  );
}
