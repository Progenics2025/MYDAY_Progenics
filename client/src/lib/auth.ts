import { useState, useEffect } from "react";
import { User, Employee } from "@shared/schema";

// Simple auth state hook
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          if (!res.ok) throw new Error('Auth failed');
          return res.json();
        })
        .then(data => {
          setUser(data.user);
          setEmployee(data.employee);
        })
        .catch(() => {
          localStorage.removeItem("auth_token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const logout = () => {
    const token = localStorage.getItem("auth_token");
    localStorage.removeItem("auth_token");
    
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    
    window.location.reload();
  };

  return { user, employee, isLoading, logout };
}

// Login function
export async function login(username: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  localStorage.setItem("auth_token", data.token);
  
  return data;
}