import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuthState } from "./lib/auth";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/dashboard";
import { useEffect } from "react";

function Router() {
  const { user, isLoading } = useAuthState();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Allow unauthenticated access to forgot/reset pages
    const path = window.location.pathname;
    if (path === '/forgotPassword') return <ForgotPassword />;
    if (path === '/resetPassword') return <ResetPassword />;
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground">Page not found</div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Unregister service workers to resolve loading errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
