"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      localStorage.setItem("crop_auth", "true");
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      
      <div className="relative z-10 flex w-full max-w-md flex-col justify-center px-6 py-12 mx-auto sm:px-12">
        <div className="rounded-2xl bg-background/95 p-8 shadow-2xl backdrop-blur-md border border-border/50">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22c0 0-8-4-8-12a8 8 0 0 1 16 0c0 8-8 12-8 12z" strokeLinejoin="round" />
                <line x1="12" y1="22" x2="12" y2="10" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Crop Health Monitor</h1>
            <p className="text-sm text-muted-foreground mt-2">Log in to your agriculture dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="farmer@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full mt-6 bg-primary font-semibold text-primary-foreground">
              Log in securely
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
