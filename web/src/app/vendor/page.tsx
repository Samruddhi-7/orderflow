"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";

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
  const [error, setError] = useState<string | null>(null);

  // Form states for new item
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");

  useEffect(() => {
    fetchApi<Vendor[]>("/vendors").then((vendors) => {
      const data = vendors ?? [];
      if (data.length > 0) {
        setVendor(data[0]);
        return fetchApi<MenuItem[]>(`/vendors/${data[0].id}/menu`);
        setVendor(vendors[0]);
        return fetchApi<MenuItem[]>(`/vendors/${vendors[0].id}/menu`);
      }
      return [];
    })
    .then(setMenuItems)
    .catch(err => setError(err.message || "Failed to load inventory"))
    .finally(() => setLoading(false));
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    if (!newItemName.trim()) return toast.error("Name is required");
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) return toast.error("Price must be a valid positive number");
    const stock = parseInt(newItemStock);
    if (isNaN(stock) || stock < 0) return toast.error("Stock must be a valid non-negative number");

    try {
      const created = await fetchApi<MenuItem>(`/vendors/${vendor.id}/menu`, {
        method: "POST",
        body: JSON.stringify({
          name: newItemName.trim(),
          price: price,
          stock_qty: stock,
          is_available: true
        })
      });
      setMenuItems([...menuItems, created]);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemStock("");
      toast.success("Menu item created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create item");
    }
  };

  const handleUpdateStock = async (itemId: string, newStock: number) => {
    if (!vendor) return;
    try {
      const updated = await fetchApi<MenuItem>(`/vendors/${vendor.id}/menu/${itemId}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stock_qty: newStock })
      });
      setMenuItems(menuItems.map(m => m.id === itemId ? updated : m));
      toast.success("Stock updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="bg-status-error/10 text-status-error px-4 py-3 rounded-xl border border-status-error/20 max-w-md text-center">
          <p className="font-semibold mb-1">Could not load inventory</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  if (!vendor) return (
    <Card className="max-w-md mx-auto mt-12 border-status-warning/30 bg-status-warning/10">
      <CardContent className="pt-6 text-center text-status-warning-foreground font-medium">
        You do not have a vendor profile yet. Please contact an admin.
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <h2 className="font-display text-4xl font-bold">Inventory Management</h2>
        <p className="text-ink/80 text-lg">Manage menu items and stock for <span className="font-semibold text-ink">{vendor.name}</span>.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent" />
                Add Item
              </CardTitle>
              <p className="text-sm text-ink/60">Create a new item for your menu</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink/80">Name</label>
                  <Input required value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Avocado Toast" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink/80">Price ($)</label>
                    <Input required value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} type="number" step="0.01" placeholder="9.99" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink/80">Initial Stock</label>
                    <Input required value={newItemStock} onChange={e => setNewItemStock(e.target.value)} type="number" placeholder="50" />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2">
                  Add Item
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="w-5 h-5 text-fresh" />
                Current Menu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-muted/30 bg-muted/5">
                      <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 font-mono text-xs text-ink/60 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/20">
                    {menuItems.map(item => (
                      <tr key={item.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-ink">{item.name}</td>
                        <td className="px-6 py-4 text-ink/70">${item.price}</td>
                        <td className="px-6 py-4 font-mono">{item.stock_qty}</td>
                        <td className="px-6 py-4">
                          <Badge variant={item.is_available ? 'success' : 'error'}>
                            {item.is_available ? 'Active' : 'Sold Out'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="secondary" size="sm" onClick={() => handleUpdateStock(item.id, item.stock_qty + 5)}>
                            +5 Stock
                          </Button>
                          <Button variant="ghost" size="sm" className="text-status-error hover:bg-status-error/10 hover:text-status-error" onClick={() => handleUpdateStock(item.id, 0)}>
                            Sold Out
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {menuItems.length === 0 && (
                  <div className="p-12 text-center text-ink/50 font-medium">
                    No menu items found. Add your first item!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
