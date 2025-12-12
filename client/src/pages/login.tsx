import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Eye, EyeOff, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      await login(values.username, values.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
      // Small delay to show success state
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950">
      {/* Left Side - Hero/Brand */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 opacity-90" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-20" />

        {/* Decorative Circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 text-white max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 shadow-xl border border-white/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Manage your workforce with <span className="text-indigo-200">confidence</span>
            </h1>
            <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
              Streamline attendance, payroll, and employee management in one powerful, intuitive platform designed for modern businesses.
            </p>

            <div className="space-y-4">
              {[
                "Real-time GPS Attendance Tracking",
                "Automated Payroll Processing",
                "Seamless Leave Management",
                "Comprehensive Reporting & Analytics"
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-indigo-50 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">myDay</h1>
            <p className="text-slate-500">Progenics Lab</p>
          </div>

          <Card className="border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
              <CardDescription className="text-center text-slate-500 dark:text-slate-400">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Username</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                              <User className="h-5 w-5" />
                            </div>
                            <Input
                              placeholder="Enter your username"
                              {...field}
                              className="pl-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                              <Lock className="h-5 w-5" />
                            </div>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              {...field}
                              className="pl-10 pr-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors" />
                      <span className="text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                    </label>
                    <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-all">
                      Forgot password?
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-500 mt-8">
            © {new Date().getFullYear()} Progenics Lab. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
