"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useNavigationStore } from "@/store/navigationStore";
import {
  Moon,
  Sun,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const pageLabels: Record<string, string> = {
  dashboard: "Dashboard",
  chat: "AI Chat",
  documents: "Documents",
  "knowledge-bases": "Knowledge Bases",
  "agent-studio": "Agent Studio",
  workflows: "Workflows",
  "model-settings": "Model Settings",
  tenants: "Tenant Management",
  profile: "Profile Settings",
  "api-keys": "API Keys",
};

export function AppHeader() {
  const { activePage } = useNavigationStore();
  const { setTheme, theme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">
              {pageLabels[activePage] || activePage}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Search className="h-4 w-4" />
              <kbd className="pointer-events-none absolute right-1 top-1 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                ⌘K
              </kbd>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search conversations, documents, agents..."
                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="p-2">
              <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                Quick Actions
              </p>
              <button className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">💬</span> New Chat
              </button>
              <button className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">📤</span> Upload Document
              </button>
              <button className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                <span className="text-muted-foreground">🤖</span> Create Agent
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">
                3
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="grid gap-1">
              <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">Document processed</p>
                  <p className="text-muted-foreground text-xs">Customer-FAQ-2025.pdf is ready</p>
                  <p className="text-muted-foreground text-xs">15 min ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">Upload failed</p>
                  <p className="text-muted-foreground text-xs">Sales-Training-Material.pdf exceeded size limit</p>
                  <p className="text-muted-foreground text-xs">1 hr ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">Workflow completed</p>
                  <p className="text-muted-foreground text-xs">Document Processing Pipeline — 6 docs</p>
                  <p className="text-muted-foreground text-xs">2 hr ago</p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}