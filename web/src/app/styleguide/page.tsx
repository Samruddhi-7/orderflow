"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Timeline } from "@/components/ui/Timeline";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export default function Styleguide() {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-12 pb-20">
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-bold">Styleguide</h1>
        <p className="text-ink/80 max-w-2xl text-lg">
          A soft, warm, and inviting component library for the OrderFlow
          multi-vendor marketplace.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="font-display text-2xl">Typography</h2>
        <div className="space-y-4 border border-muted/30 p-6 rounded-2xl bg-white/50">
          <div>
            <span className="text-sm text-muted mb-1 block">Display (Fraunces)</span>
            <h1 className="font-display text-4xl">The quick brown fox</h1>
          </div>
          <div>
            <span className="text-sm text-muted mb-1 block">Body (Inter)</span>
            <p className="font-sans text-base">
              Jumps over the lazy dog. A clean humanist sans for menu lists and
              descriptions.
            </p>
          </div>
          <div>
            <span className="text-sm text-muted mb-1 block">Mono (IBM Plex)</span>
            <p className="font-mono text-base tracking-tight">
              Order #10294 • $24.50
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center border border-muted/30 p-6 rounded-2xl bg-white/50">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="ghost">Ghost Action</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl">Inputs & Controls</h2>
        <div className="grid max-w-sm gap-6 border border-muted/30 p-6 rounded-2xl bg-white/50">
          <Input label="Email Address" placeholder="hello@example.com" />
          <Input
            label="Password"
            type="password"
            error="Password must be at least 8 characters."
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink/80 block">
              Quantity
            </label>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl">Badges</h2>
        <div className="flex flex-wrap gap-3 border border-muted/30 p-6 rounded-2xl bg-white/50">
          <Badge variant="default">Default</Badge>
          <Badge variant="success">Open Now</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="error">Out of Stock</Badge>
          <Badge variant="muted">Inactive</Badge>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl">Cards</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Artisan Bakery</CardTitle>
              <Badge variant="success" className="w-fit">
                Open Now
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-ink/80">
                Freshly baked sourdough, pastries, and artisanal coffee delivered
                straight to your door.
              </p>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="font-mono font-medium">$4.99 Delivery</span>
              <Button variant="secondary" size="sm">
                View Menu
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl">Timeline (Signature Element)</h2>
        <div className="border border-muted/30 p-8 rounded-2xl bg-white/50">
          <Timeline currentStatus="preparing" />
        </div>
        <div className="border border-muted/30 p-8 rounded-2xl bg-white/50 max-w-xs">
          <Timeline currentStatus="out_for_delivery" orientation="vertical" />
        </div>
      </section>
    </div>
  );
}
