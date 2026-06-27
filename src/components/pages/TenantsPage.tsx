"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Users,
  FileText,
  MessageSquare,
  Settings,
  PauseCircle,
} from "lucide-react";
import { mockTenants } from "@/lib/mock-data";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25",
  trial: "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25",
  suspended: "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25",
};

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25",
  enterprise: "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function TenantsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPlan, setNewPlan] = useState("free");

  function handleNameChange(value: string) {
    setNewName(value);
    setNewSlug(slugify(value));
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Tenant Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage tenants and their configurations
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tenant</DialogTitle>
              <DialogDescription>
                Set up a new tenant with its own isolated environment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Name</Label>
                <Input
                  id="tenant-name"
                  placeholder="e.g., Acme Corp"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Slug</Label>
                <Input
                  id="tenant-slug"
                  placeholder="auto-generated"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateOpen(false)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockTenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate">{tenant.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-0.5">
                    {tenant.slug}
                  </CardDescription>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Badge
                    variant="default"
                    className={statusColors[tenant.status]}
                  >
                    {tenant.status.charAt(0).toUpperCase() +
                      tenant.status.slice(1)}
                  </Badge>
                  <Badge variant="default" className={planColors[tenant.plan]}>
                    {tenant.plan.charAt(0).toUpperCase() +
                      tenant.plan.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {tenant.memberCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Members
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {tenant.documentCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Docs
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {tenant.conversationCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Chats
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2">
              <p className="text-xs text-muted-foreground w-full">
                Created {formatDate(tenant.createdAt)}
              </p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Manage
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Button>
                {tenant.status !== "suspended" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-destructive hover:text-destructive"
                  >
                    <PauseCircle className="h-3.5 w-3.5" />
                    Suspend
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
