"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCleanupPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    oldRecords: 0,
    orphanedRecords: 0,
    lastCleanup: null as string | null
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setUserEmail(email);
      setIsAdmin(email === "admin@example.com" || email?.includes("admin"));
    });
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // This would typically fetch from your API
      // For now, we'll use placeholder data
      setStats({
        totalRecords: 0,
        oldRecords: 0,
        orphanedRecords: 0,
        lastCleanup: null
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

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
        </div>
      </main>
    );
  }

  const cleanupTools = [
    {
      title: "Manual Cleanup",
      description: "Review and manually select records to delete",
      href: "/cleanup-manual",
      icon: "🗑️",
      color: "bg-red-500/10 border-red-500/20",
      action: "Manual Review"
    },
    {
      title: "Find Cleanup",
      description: "Find records that are candidates for cleanup",
      href: "/cleanup-find",
      icon: "🔍",
      color: "bg-blue-500/10 border-blue-500/20",
      action: "Auto-Discovery"
    },
    {
      title: "Automatic Cleanup",
      description: "Automatically clean up old and orphaned records",
      href: "/admin/cleanup/auto",
      icon: "🤖",
      color: "bg-green-500/10 border-green-500/20",
      action: "Auto-Cleanup"
    },
    {
      title: "Image Migration",
      description: "Migrate images to new storage systems",
      href: "/migrate-images",
      icon: "📦",
      color: "bg-purple-500/10 border-purple-500/20",
      action: "Migration"
    }
  ];

  const cleanupPolicies = [
    {
      name: "Old Records",
      description: "Records older than 30 days",
      count: stats.oldRecords,
      action: "Clean up old records"
    },
    {
      name: "Orphaned Records",
      description: "Records with missing or broken image URLs",
      count: stats.orphanedRecords,
      action: "Clean up orphaned records"
    },
    {
      name: "Large Files",
      description: "Records with unusually large file sizes",
      count: 0,
      action: "Review large files"
    }
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Cleanup</h1>
        <p className="text-[var(--muted-foreground)]">
          Manage database maintenance and cleanup operations
        </p>
      </div>

      {/* Statistics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Database Statistics</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Total Records</div>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Old Records</div>
            <div className="text-2xl font-bold text-orange-400">{stats.oldRecords.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Orphaned Records</div>
            <div className="text-2xl font-bold text-red-400">{stats.orphanedRecords.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]">
            <div className="text-sm opacity-70 mb-1">Last Cleanup</div>
            <div className="text-sm">
              {stats.lastCleanup ? new Date(stats.lastCleanup).toLocaleDateString() : "Never"}
            </div>
          </div>
        </div>
      </section>

      {/* Cleanup Tools */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Cleanup Tools</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {cleanupTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`block p-6 rounded-xl border transition-all hover:scale-[1.02] ${tool.color}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">{tool.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{tool.title}</h3>
                  <p className="text-sm opacity-70 mb-3">{tool.description}</p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs bg-white/10">
                    {tool.action}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Cleanup Policies */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Cleanup Policies</h2>
        <div className="space-y-4">
          {cleanupPolicies.map((policy) => (
            <div
              key={policy.name}
              className="p-4 rounded-lg border border-[var(--line)] bg-[var(--muted)]"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{policy.name}</h3>
                  <p className="text-sm opacity-70">{policy.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold">{policy.count.toLocaleString()}</div>
                    <div className="text-xs opacity-70">records</div>
                  </div>
                  <button className="btn-secondary btn-sm">
                    {policy.action}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn">
            Run Full Cleanup
          </button>
          <button className="btn-secondary">
            Export Cleanup Report
          </button>
          <button className="btn-secondary">
            Schedule Cleanup
          </button>
          <button className="btn-secondary">
            View Cleanup History
          </button>
        </div>
      </section>
    </main>
  );
}
