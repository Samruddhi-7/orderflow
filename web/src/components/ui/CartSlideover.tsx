"use client";

import React, { useState } from "react";
import { useCart } from "@/lib/cart";
import { Button } from "./Button";
import { QuantityStepper } from "./QuantityStepper";
import { ShoppingBag, X, QrCode } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";

export function CartSlideover() {
  const { cart, updateQuantity, removeItem, totalPrice, totalItems, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiPaid, setUpiPaid] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    if (!cart.vendorId || cart.items.length === 0) return;
    
    // Show UPI payment modal before proceeding
    setShowUpiModal(true);
  };

  const handlePaymentSuccess = async () => {
    setUpiPaid(true);
    setShowUpiModal(false);
    
    setError("");
    setIsSubmitting(true);
    try {
      const idempotencyKey = "client-key-" + Date.now();
      const items = cart.items.map(i => ({ menu_item_id: i.id, qty: i.quantity }));
      
      const res = await fetchApi<{ id: string; order_id?: string }>("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          vendor_id: cart.vendorId,
          items,
          use_redis_lock: true,
        }),
      });

      clearCart();
      setIsOpen(false);
      router.push(`/customer/order/${res.order_id || res.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-ink hover:text-accent transition-colors"
      >
        <ShoppingBag className="w-6 h-6" />
        {totalItems > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg">
            {totalItems}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Slideover Panel */}
          <div className="relative z-50 flex w-full max-w-md flex-col bg-bg shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-muted/30 px-6 py-4">
              <h2 className="font-display text-2xl font-bold">Your Cart</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-muted/20 text-ink/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-4 h-12 w-12 text-muted" />
                  <p className="text-ink/60 font-medium">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-ink">{item.name}</h4>
                        <p className="font-mono text-sm mt-1">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <QuantityStepper 
                          value={item.quantity} 
                          onChange={(qty) => updateQuantity(item.id, qty)} 
                        />
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-status-error font-medium hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="border-t border-muted/30 bg-white/50 p-6 backdrop-blur">
                {error && (
                  <div className="mb-4 rounded-xl bg-status-error/10 p-3 text-sm font-medium text-status-error">
                    {error}
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-ink/80">Total</span>
                  <span className="font-mono text-2xl font-bold">{formatCurrency(totalPrice)}</span>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </Button>
              </div>
            )}

            {/* UPI Payment Modal */}
            {showUpiModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                <div className="bg-bg rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-6">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10">
                      <QrCode className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">UPI Payment</h3>
                    <p className="text-ink/70 text-sm">Scan the QR or tap below to simulate payment</p>
                  </div>
                  
                  {/* Mock QR placeholder */}
                  <div className="aspect-square max-w-[200px] mx-auto bg-muted/30 rounded-xl border-2 border-dashed border-muted/50 flex items-center justify-center">
                    <div className="text-center text-muted">
                      <QrCode className="w-16 h-16 mx-auto mb-2" />
                      <span className="text-xs font-mono">Mock UPI QR</span>
                    </div>
                  </div>
                  
                  <div className="text-center font-mono text-lg font-bold">
                    {formatCurrency(totalPrice)}
                  </div>
                  
                  <Button className="w-full" size="lg" onClick={handlePaymentSuccess}>
                    Simulate Payment Success
                  </Button>
                  <button
                    onClick={() => setShowUpiModal(false)}
                    className="w-full text-sm text-ink/60 hover:text-ink transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
