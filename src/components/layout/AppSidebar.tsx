"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Database,
  Bot,
  Workflow,
  Settings,
  Building2,
  Key,
  User,
  Sparkles,
  ChevronDown,
  LogOut,
  ScrollText,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Users,
  Webhook,
  Activity,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigationStore, type PageId } from "@/store/navigationStore";
import { mockUser } from "@/lib/mock-data";

const mainNav: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "knowledge-bases", label: "Knowledge Bases", icon: Database },
  { id: "agent-studio", label: "Agent Studio", icon: Bot },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "model-settings", label: "Model Settings", icon: Sparkles },
];

const adminNav: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "observability", label: "Observability", icon: Activity },
  { id: "guardrails", label: "AI Guardrails", icon: Shield },
  { id: "billing", label: "Billing & Usage", icon: CreditCard },
  { id: "tenants", label: "Tenants", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "enterprise-settings", label: "Enterprise Settings", icon: ShieldCheck },
  { id: "audit-logs", label: "Audit Logs", icon: ScrollText },
];

const settingsNav: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "api-keys", label: "API Keys", icon: Key },
];

export function AppSidebar() {
  const { activePage, setActivePage } = useNavigationStore();

  const initials = mockUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-bold text-sm">
                    AI
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">AI Platform</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {mockUser.tenantName}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
              >
                <DropdownMenuItem>
                  <Building2 className="mr-2 h-4 w-4" />
                  {mockUser.tenantName}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => setActivePage(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => setActivePage(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => setActivePage(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {mockUser.name}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {mockUser.email}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="end"
                side="top"
              >
                <DropdownMenuItem onClick={() => setActivePage("profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActivePage("api-keys")}>
                  <Key className="mr-2 h-4 w-4" />
                  API Keys
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setActivePage("login")}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
