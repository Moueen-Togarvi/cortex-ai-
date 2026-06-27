"use client";

import React from "react";
import { useNavigationStore, type PageId } from "@/store/navigationStore";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/components/pages/LoginPage";
import RegisterPage from "@/components/pages/RegisterPage";
import DashboardPage from "@/components/pages/DashboardPage";
import ChatPage from "@/components/pages/ChatPage";
import DocumentsPage from "@/components/pages/DocumentsPage";
import KnowledgeBasesPage from "@/components/pages/KnowledgeBasesPage";
import AgentStudioPage from "@/components/pages/AgentStudioPage";
import WorkflowBuilderPage from "@/components/pages/WorkflowBuilderPage";
import ModelSettingsPage from "@/components/pages/ModelSettingsPage";
import TenantsPage from "@/components/pages/TenantsPage";
import BillingPage from "@/components/pages/BillingPage";
import EnterpriseSettingsPage from "@/components/pages/EnterpriseSettingsPage";
import ProfilePage from "@/components/pages/ProfilePage";
import ApiKeysPage from "@/components/pages/ApiKeysPage";
import AuditLogsPage from "@/components/pages/AuditLogsPage";
import ObservabilityPage from "@/components/pages/ObservabilityPage";
import GuardrailsPage from "@/components/pages/GuardrailsPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";
import TeamPage from "@/components/pages/TeamPage";
import WebhooksPage from "@/components/pages/WebhooksPage";

const authPages: PageId[] = ["login", "register"];

function PageRouter() {
  const { activePage } = useNavigationStore();

  switch (activePage) {
    case "login":
      return <LoginPage />;
    case "register":
      return <RegisterPage />;
    case "dashboard":
      return <DashboardPage />;
    case "chat":
      return <ChatPage />;
    case "documents":
      return <DocumentsPage />;
    case "knowledge-bases":
      return <KnowledgeBasesPage />;
    case "agent-studio":
      return <AgentStudioPage />;
    case "workflows":
      return <WorkflowBuilderPage />;
    case "model-settings":
      return <ModelSettingsPage />;
    case "tenants":
      return <TenantsPage />;
    case "billing":
      return <BillingPage />;
    case "enterprise-settings":
      return <EnterpriseSettingsPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "team":
      return <TeamPage />;
    case "webhooks":
      return <WebhooksPage />;
    case "profile":
      return <ProfilePage />;
    case "api-keys":
      return <ApiKeysPage />;
    case "audit-logs":
      return <AuditLogsPage />;
    case "observability":
      return <ObservabilityPage />;
    case "guardrails":
      return <GuardrailsPage />;
    default:
      return <DashboardPage />;
  }
}

export default function Home() {
  const { activePage } = useNavigationStore();
  const isAuthPage = authPages.includes(activePage);

  if (isAuthPage) {
    return <PageRouter />;
  }

  return (
    <AppShell>
      <PageRouter />
    </AppShell>
  );
}
