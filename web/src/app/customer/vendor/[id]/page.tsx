"use client";

import { useEffect, useState, use } from "react";
import { fetchApi } from "../../../../lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCart } from "@/lib/cart";
import { ArrowLeft } from "lucide-react";

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

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { addItem, cart } = useCart();

  useEffect(() => {
    Promise.all([
      fetchApi(`/vendors/${vendorId}`).then(setVendor),
      fetchApi(`/vendors/${vendorId}/menu`).then(setMenuItems)
    ])
    .catch(err => setError(err.message || "Failed to load menu"))
    .finally(() => setLoading(false));
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink/60 font-medium animate-pulse">Loading menu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="bg-status-error/10 text-status-error px-4 py-3 rounded-xl border border-status-error/20 max-w-md text-center">
          <p className="font-semibold mb-1">Could not load menu</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
        <Link href="/customer">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-status-error font-medium">Vendor not found.</p>
        <Link href="/customer" className="mt-4">
          <Button variant="secondary">Go back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-8 max-w-4xl mx-auto">
      <div>
        <Link href="/customer" className="inline-flex items-center text-sm font-medium text-ink/60 hover:text-ink transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        
        <h2 className="font-display text-4xl font-bold">{vendor.name}</h2>
        <p className="text-ink/80 text-lg mt-2 max-w-2xl">{vendor.address}</p>
        <div className="mt-4">
          {vendor.is_open ? (
            <Badge variant="success">Accepting Orders</Badge>
          ) : (
            <Badge variant="muted">Currently Closed</Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        <h3 className="font-display text-2xl font-bold border-b border-muted/30 pb-4">Menu</h3>
        
        {menuItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted p-12 text-center">
            <p className="text-ink/60 font-medium">No items available on the menu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map(item => {
              const inCartCount = cart.items.find(i => i.id === item.id)?.quantity || 0;
              const isAvailable = item.is_available && item.stock_qty > 0 && vendor.is_open;
              
              return (
                <Card key={item.id} className="flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-xl leading-tight">{item.name}</CardTitle>
                      <span className="font-mono font-medium shrink-0 bg-accent-soft px-2 py-1 rounded-md text-sm">
                        ${Number(item.price).toFixed(2)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!isAvailable && (
                      <p className="text-status-error text-sm font-medium mt-1">Out of stock</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant={isAvailable ? "primary" : "secondary"}
                      className="w-full"
                      disabled={!isAvailable}
                      onClick={() => addItem(vendorId, { id: item.id, name: item.name, price: item.price })}
                    >
                      {inCartCount > 0 ? `Add Another (${inCartCount} in cart)` : 'Add to Cart'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
