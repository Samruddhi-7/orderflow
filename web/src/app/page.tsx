"use client";

import { useState } from "react";
import { fetchApi } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegistering) {
        await fetchApi("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, role }),
        });
      }
      
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const tokenParts = res.access_token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const user = { id: payload.user_id, role: payload.role, email: payload.email };

      login(res.access_token, user);

      if (user.role === "customer") router.push("/customer");
      else if (user.role === "vendor") router.push("/vendor/orders");
      else if (user.role === "admin") router.push("/admin");

    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-bg via-bg to-accent-soft/30">
      <Card className="w-full max-w-md shadow-lg border-none bg-white/80 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl mb-2">OrderFlow</CardTitle>
          <p className="text-ink/60 text-sm">
            {isRegistering ? "Create your account" : "Sign in to your account"}
          </p>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="bg-status-error/10 text-status-error p-3 rounded-xl mb-4 text-sm font-medium border border-status-error/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input 
              label="Email Address"
              type="email" 
              placeholder="hello@example.com"
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
            />
            
            <Input 
              label="Password"
              type="password"
              placeholder="••••••••"
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />

            {isRegistering && (
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-ink/80">Role</label>
                <select 
                  className="flex h-11 w-full rounded-xl border border-muted bg-bg px-3 py-2 text-sm text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : (isRegistering ? "Create Account" : "Sign In")}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center pt-0 pb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsRegistering(!isRegistering)}
            disabled={isLoading}
          >
            {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
