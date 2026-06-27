"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Shield,
  Globe,
  Lock,
  UserCog,
  Loader2,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SSOConfig {
  enabled: boolean;
  provider: string;
  name: string;
  domains: string[];
  autoProvision: boolean;
  defaultRole: string;
}

const defaultSSO: SSOConfig = {
  enabled: false,
  provider: "saml",
  name: "",
  domains: [],
  autoProvision: false,
  defaultRole: "user",
};

export default function EnterpriseSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sso, setSso] = useState<SSOConfig>(defaultSSO);
  const [newDomain, setNewDomain] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);

  // Security settings
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [enforceMFA, setEnforceMFA] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [dataRetention, setDataRetention] = useState("90");

  const fetchSSO = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sso/status");
      if (res.ok) {
        const data = await res.json();
        if (data.enabled) {
          setSso({
            enabled: true,
            provider: data.provider || "saml",
            name: data.name || "",
            domains: data.domains || [],
            autoProvision: data.autoProvision ?? false,
            defaultRole: data.defaultRole || "user",
          });
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSSO(); }, [fetchSSO]);

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (d && !sso.domains.includes(d)) {
      setSso({ ...sso, domains: [...sso.domains, d] });
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    setSso({ ...sso, domains: sso.domains.filter((d) => d !== domain) });
  };

  const saveSSO = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/sso", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sso),
      });
      if (res.ok) {
        toast.success("SSO configuration saved");
      } else {
        toast.error("Failed to save SSO configuration");
      }
    } catch {
      toast.error("Failed to save SSO configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Settings</h1>
          <p className="text-sm text-muted-foreground">SSO, security policies, and compliance</p>
        </div>
      </div>

      <Tabs defaultValue="sso" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sso" className="gap-2">
            <Shield className="h-4 w-4" /> SSO / SAML
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Globe className="h-4 w-4" /> Compliance
          </TabsTrigger>
        </TabsList>

        {/* SSO Tab */}
        <TabsContent value="sso">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Single Sign-On (SAML)</CardTitle>
                  <CardDescription className="text-xs">Configure SAML-based SSO for your organization</CardDescription>
                </div>
                <Switch
                  checked={sso.enabled}
                  onCheckedChange={(checked) => setSso({ ...sso, enabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!sso.enabled && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">SSO is currently disabled. Enable it to configure SAML authentication.</p>
                </div>
              )}
              {sso.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Identity Provider Name</Label>
                      <Input
                        placeholder="e.g., Okta, Azure AD"
                        value={sso.name}
                        onChange={(e) => setSso({ ...sso, name: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Protocol</Label>
                      <Select value={sso.provider} onValueChange={(v) => setSso({ ...sso, provider: v })}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saml">SAML 2.0</SelectItem>
                          <SelectItem value="oidc">OpenID Connect</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs">Authorized Domains</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="example.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addDomain()}
                        className="h-9 text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={addDomain} className="shrink-0">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sso.domains.map((d) => (
                        <Badge key={d} variant="secondary" className="gap-1 text-xs">
                          {d}
                          <button onClick={() => removeDomain(d)} className="ml-1 hover:text-destructive">&times;</button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Auto-Provision Users</Label>
                      <p className="text-xs text-muted-foreground">Automatically create accounts for new SSO users</p>
                    </div>
                    <Switch
                      checked={sso.autoProvision}
                      onCheckedChange={(checked) => setSso({ ...sso, autoProvision: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Default Role for SSO Users</Label>
                    <Select value={sso.defaultRole} onValueChange={(v) => setSso({ ...sso, defaultRole: v })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>SP Metadata URL</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMetadata(!showMetadata)}
                      className="gap-1 text-xs"
                    >
                      {showMetadata ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showMetadata ? "Hide" : "Show"}
                    </Button>
                  </div>
                  {showMetadata && (
                    <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs break-all">
                      https://your-platform.com/api/auth/sso/metadata
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={saveSSO} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Configuration
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Security Policies</CardTitle>
              <CardDescription className="text-xs">Configure session, authentication, and network security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Session Timeout (minutes)</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data Retention (days)</Label>
                  <Select value={dataRetention} onValueChange={setDataRetention}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Enforce MFA</Label>
                  <p className="text-xs text-muted-foreground">Require multi-factor authentication for all users</p>
                </div>
                <Switch checked={enforceMFA} onCheckedChange={setEnforceMFA} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">IP Whitelist (one per line)</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={"192.168.1.0/24\n10.0.0.0/8"}
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty to allow all IP addresses</p>
              </div>

              <div className="flex justify-end">
                <Button className="gap-2" onClick={() => toast.success("Security settings saved")}>
                  <Save className="h-4 w-4" /> Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" /> Data Residency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-medium">US East (Virginia)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Encryption at Rest</span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400">AES-256</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Encryption in Transit</span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400">TLS 1.3</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-cyan-400" /> Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">RBAC Enabled</span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400">Yes</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Audit Logging</span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400">Active</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PII Detection</span>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-400">Configurable</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}