"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Mail, Shield, ShieldCheck, Eye, MoreHorizontal, Loader2, CheckCircle2, XCircle, Clock, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
 status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

const roleConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  admin: { icon: ShieldCheck, color: "text-rose-400", bg: "bg-rose-500/15", label: "Admin" },
  editor: { icon: Shield, color: "text-amber-400", bg: "bg-amber-500/15", label: "Editor" },
  viewer: { icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/15", label: "Viewer" },
};

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [memData, invData] = await Promise.all([
        api.get("/team/members") as Promise<TeamMember[]>,
        api.get("/team/invitations") as Promise<Invitation[]>,
      ]);
      setMembers(Array.isArray(memData) ? memData : []);
      setInvitations(Array.isArray(invData) ? invData : []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post("/team/invitations", { email: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("viewer");
      fetchTeam();
    } catch (err) {
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.del(`/team/invitations/${id}`);
      toast.success("Invitation revoked");
      fetchTeam();
    } catch {
      toast.error("Failed to revoke");
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await api.del(`/team/members/${id}`);
      toast.success("Member removed");
      fetchTeam();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      await api.put(`/team/members/${id}`, { role });
      toast.success(`Role updated to ${role}`);
      fetchTeam();
    } catch {
      toast.error("Failed to update role");
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
            <p className="text-sm text-muted-foreground">Manage team members, roles & invitations</p>
          </div>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription className="text-xs">{members.length} member{members.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">{members.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No team members</p>
              ) : (
                members.map((member) => {
                  const cfg = roleConfig[member.role] ?? roleConfig.viewer;
                  const RoleIcon = cfg.icon;
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background transition-colors">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs rounded-lg bg-muted">{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-md ${cfg.bg} flex items-center justify-center`}>
                          <RoleIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "admin")}>Set Admin</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "editor")}>Set Editor</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "viewer")}>Set Viewer</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400" onClick={() => handleRemoveMember(member.id)}>Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Pending Invitations</CardTitle>
                <CardDescription className="text-xs">{invitations.length} invitation{invitations.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">{invitations.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {invitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending invitations</p>
                </div>
              ) : (
                invitations.map((inv) => {
                  const cfg = roleConfig[inv.role] ?? roleConfig.viewer;
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] font-normal h-4 px-1.5 ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                          {isExpired ? (
                            <span className="text-[10px] text-red-400 flex items-center gap-0.5"><XCircle className="h-3 w-3" /> Expired</span>
                          ) : inv.acceptedAt ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Accepted</span>
                          ) : (
                            <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><Clock className="h-3 w-3" /> Pending</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleRevoke(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="editor">Editor — Can modify resources</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={inviting || !inviteEmail.trim()} onClick={handleInvite}>
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
