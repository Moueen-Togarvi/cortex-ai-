"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, MoreHorizontal, Copy, Ban } from "lucide-react";
import { mockApiKeys } from "@/lib/mock-data";

const permissionOptions = ["Chat", "RAG", "Documents", "Agents", "Workflows"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newExpiration, setNewExpiration] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  function togglePermission(perm: string) {
    setNewPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your API keys and permissions
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-expiration">
                  Expiration Date{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="key-expiration"
                  type="date"
                  value={newExpiration}
                  onChange={(e) => setNewExpiration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {permissionOptions.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={newPermissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden md:table-cell">Last Used</TableHead>
                <TableHead className="hidden lg:table-cell">Requests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockApiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">
                    {apiKey.name}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {apiKey.prefix}xxxx...xxxx
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(apiKey.createdAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatRelative(apiKey.lastUsed)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {apiKey.requestCount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        apiKey.status === "active" ? "default" : "destructive"
                      }
                      className={
                        apiKey.status === "active"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                          : ""
                      }
                    >
                      {apiKey.status === "active" ? "Active" : "Revoked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Copy className="h-4 w-4" />
                          Copy Key
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                          <Ban className="h-4 w-4" />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
