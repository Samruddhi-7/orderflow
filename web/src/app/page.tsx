"use client";

import { useState } from "react";
import { fetchApi, setAuthToken } from "../lib/api";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegistering) {
        await fetchApi("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, role }),
        });
        // Auto login after register
      }
      
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      login(res.access_token, res.user);

      if (res.user.role === "customer") router.push("/customer");
      else if (res.user.role === "vendor") router.push("/vendor");
      else if (res.user.role === "admin") router.push("/admin");

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Welcome to OrderFlow
      </h1>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            required 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:ring-blue-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            required 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:ring-blue-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {isRegistering && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-white focus:border-blue-500 focus:ring-blue-500"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}

        <button 
          type="submit" 
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isRegistering ? "Register" : "Sign In"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}
