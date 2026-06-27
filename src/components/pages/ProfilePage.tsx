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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Pencil, Save, Shield, Bell } from "lucide-react";
import { mockUser } from "@/lib/mock-data";

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [role, setRole] = useState(mockUser.role);
  const [org, setOrg] = useState(mockUser.tenantName);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [twoFactor, setTwoFactor] = useState(false);
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const initials = mockUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Manage your personal details and account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-muted">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" className="gap-2">
                <Camera className="h-4 w-4" />
                Change Photo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editing}
                  className="flex-1"
                />
                {!editing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role</Label>
              <Input
                id="profile-role"
                value={role.charAt(0).toUpperCase() + role.slice(1)}
                disabled={!editing}
                className="capitalize"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-org">Organization</Label>
              <Input
                id="profile-org"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                disabled={!editing}
              />
            </div>
          </div>

          {editing && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setEditing(false)}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Change Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="current-pw">Current Password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline">Update Password</Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">
                Two-Factor Authentication
              </h3>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security to your account by enabling
                two-factor authentication
              </p>
            </div>
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>
            Customize your application preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ur">Urdu</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notification Preferences</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={emailNotifs}
                onCheckedChange={setEmailNotifs}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive push notifications in your browser
                </p>
              </div>
              <Switch
                checked={pushNotifs}
                onCheckedChange={setPushNotifs}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm">Weekly Digest</p>
                <p className="text-xs text-muted-foreground">
                  Receive a weekly summary of platform activity
                </p>
              </div>
              <Switch
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
