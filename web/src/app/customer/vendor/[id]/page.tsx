"use client";

import { useEffect, useState, use } from "react";
import { fetchApi } from "../../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  price: string;
  stock_qty: number;
  is_available: boolean;
};

export default function VendorMenu({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const vendorId = unwrappedParams.id;
  const router = useRouter();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [vendor, setVendor] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi(`/vendors/${vendorId}`).then(setVendor).catch(console.error);
    fetchApi(`/vendors/${vendorId}/menu`).then(setMenuItems).catch(console.error);
  }, [vendorId]);

  const addToCart = (id: string, qty: number) => {
    setCart(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + qty
    }));
  };

  const placeOrder = async () => {
    setError("");
    const items = Object.entries(cart).map(([id, qty]) => ({ menu_item_id: id, qty }));
    if (items.length === 0) return;

    try {
      const idempotencyKey = "client-key-" + Date.now();
      await fetchApi("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          vendor_id: vendorId,
          items,
          use_redis_lock: false,
        }),
      });
      router.push("/customer");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!vendor) return <div>Loading...</div>;

  return (
    <div>
      <Link href="/customer" className="text-blue-600 mb-4 inline-block">&larr; Back</Link>
      
      <h2 className="text-3xl font-bold mb-2">{vendor.name} Menu</h2>
      <p className="text-gray-600 mb-8">{vendor.description}</p>
      
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Items</h3>
          <div className="space-y-4">
            {menuItems.map(item => (
              <div key={item.id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{item.name}</h4>
                  <p className="text-gray-600">${item.price}</p>
                  <p className="text-xs text-gray-500">Stock: {item.stock_qty}</p>
                </div>
                <button 
                  onClick={() => addToCart(item.id, 1)}
                  disabled={!item.is_available || item.stock_qty === 0}
                  className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="p-6 border rounded bg-gray-50 sticky top-4">
            <h3 className="text-xl font-semibold mb-4">Cart</h3>
            {Object.keys(cart).length === 0 ? (
              <p className="text-gray-500">Your cart is empty.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {Object.entries(cart).map(([id, qty]) => {
                  const item = menuItems.find(i => i.id === id);
                  return item && (
                    <div key={id} className="flex justify-between">
                      <span>{qty}x {item.name}</span>
                      <span>${(parseFloat(item.price) * qty).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            
            <button 
              onClick={placeOrder}
              disabled={Object.keys(cart).length === 0}
              className="w-full bg-green-600 text-white font-bold py-2 rounded disabled:opacity-50"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
