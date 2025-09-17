"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setUserEmail(email);
      // Simple admin check - you can enhance this with proper role-based access
      setIsAdmin(email === "ai2refocus@gmail.com" || (email?.includes("ai2refocus") ?? false));
    });
  }, []);

  if (!userEmail) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="bg-[var(--muted)] rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="mb-4">Please <a href="/login" className="link">sign in</a> to access admin features.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="bg-[var(--muted)] rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You don't have admin privileges to access this page.</p>
          <p className="text-sm opacity-70">Contact your administrator if you believe this is an error.</p>
        </div>
      </main>
    );
  }

  const adminSections = [
    {
      title: "Model Configuration",
      description: "Manage image generation models and API settings",
      href: "/admin/models",
      icon: "🤖",
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "Database Cleanup",
      description: "Clean up old records and manage database maintenance",
      href: "/admin/cleanup",
      icon: "🧹",
      color: "bg-orange-500/10 border-orange-500/20"
    },
    {
      title: "System Monitoring",
      description: "Monitor system performance and usage statistics",
      href: "/admin/monitoring",
      icon: "📊",
      color: "bg-green-500/10 border-green-500/20"
    },
    {
      title: "User Management",
      description: "Manage user accounts and permissions",
      href: "/admin/users",
      icon: "👥",
      color: "bg-purple-500/10 border-purple-500/20"
    }
  ];

  const quickActions = [
    {
      title: "Manual Cleanup",
      description: "Review and delete specific records",
      href: "/cleanup-manual",
      icon: "🗑️"
    },
    {
      title: "Find Cleanup",
      description: "Find records for cleanup",
      href: "/cleanup-find",
      icon: "🔍"
    },
    {
      title: "Migrate Images",
      description: "Migrate images to new storage",
      href: "/migrate-images",
      icon: "📦"
    }
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Welcome, {userEmail}. Manage your pet portrait studio's backend systems.
        </p>
      </div>

      {/* Main Admin Sections */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`block p-6 rounded-xl border transition-all hover:scale-[1.02] ${section.color}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">{section.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                  <p className="text-sm opacity-70">{section.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="block p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)] hover:bg-[var(--line)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-xl">{action.icon}</div>
                <div>
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-xs opacity-70">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* System Status */}
      <section>
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Active Models</div>
            <div className="text-2xl font-bold">4</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Total Generations</div>
            <div className="text-2xl font-bold">-</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Active Users</div>
            <div className="text-2xl font-bold">-</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">System Health</div>
            <div className="text-2xl font-bold text-green-400">✓</div>
          </div>
        </div>
      </section>
    </main>
  );
}
