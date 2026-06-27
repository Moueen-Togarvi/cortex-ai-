"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Database,
  Bot,
  Workflow,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useNavigationStore, useAuthStore } from "@/store/navigationStore";
import { api } from "@/lib/api";

const features = [
  {
    icon: MessageSquare,
    title: "Multi-Model AI Chat",
    description: "Seamless conversations across multiple LLM providers",
  },
  {
    icon: Database,
    title: "RAG-Powered Search",
    description: "Enterprise knowledge retrieval with vector databases",
  },
  {
    icon: Bot,
    title: "Multi-Agent Orchestration",
    description: "Coordinate intelligent agents for complex tasks",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    description: "Build and automate multi-step AI pipelines",
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("admin@aiplatform.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { setActivePage } = useNavigationStore();
  const { setAuth } = useAuthStore();

  const handleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await api.login(email, password);
      setAuth(result.user as { id: string; email: string; name: string; role: string; avatar?: string | null }, result.token);
      setActivePage("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Enterprise AI Platform
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Intelligent.
              <br />
              Automated.
              <br />
              <span className="text-emerald-400">Enterprise-Ready.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Harness the power of cutting-edge AI to transform your business
              operations with secure, scalable, and intelligent solutions.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-5"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="flex items-start gap-4 group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors duration-300">
                  <feature.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Enterprise AI Platform
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in to your account to continue
            </p>
          </div>

          <div className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === true)
                  }
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">{error}</p>
            )}

            {/* Sign In Button */}
            <Button
              className="w-full h-11 text-sm font-medium"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Separator */}
            <div className="relative flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                or continue with
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11 text-sm">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-11 text-sm">
                <svg
                  className="h-4 w-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setActivePage("register")}
              className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
