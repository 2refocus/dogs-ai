"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
// Use your existing browser client:
import { supabase } from "@/lib/supabaseClient";
// If you keep presets locally, this resolves preset label by id:
import { PRESETS } from "@/app/presets";

type Row = {
  id: string;
  user_id: string | null;
  input_url: string | null;
  output_url: string | null;
  prompt: string | null;
  preset_id?: string | null;
  preset_label?: string | null;
  created_at: string;
};

type ViewCols = 1 | 2 | 3 | 6;

function formatDate(s: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewCols>(3); // 1 = single full width

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("generations")
        .select(
          "id,user_id,input_url,output_url,prompt,preset_id,preset_label,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    })();
  }, []);

  const gridClass = useMemo(() => {
    switch (view) {
      case 1:
        return "grid-cols-1"; // single image full-width
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 6:
        return "grid-cols-6";
    }
  }, [view]);

  return (
    <main className="container grid gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Your History</h1>

        {/* View options: 1× (full), 2×, 3×, 6× */}
        <div className="flex gap-2">
          {[1, 2, 3, 6].map((n) => (
            <button
              key={n}
              onClick={() => setView(n as ViewCols)}
              className={`px-3 py-1 rounded-md text-sm border transition ${
                view === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted hover:bg-accent"
              }`}
            >
              {n}×
            </button>
          ))}
        </div>
      </div>

      {loading && <HistorySkeleton cols={view} />}

      {!loading && rows.length === 0 && (
        <p className="text-muted-foreground">No generations yet.</p>
      )}

      {!loading && rows.length > 0 && (
        <ul className={`grid gap-4 ${gridClass}`}>
          {rows.map((r) => {
            const label =
              r.preset_label ||
              PRESETS.find((p: any) => p.id === r.preset_id)?.label ||
              "Custom";
            return (
              <li key={r.id} className="card overflow-hidden">
                {/* Square image area */}
                <div className="square relative bg-muted">
                  {r.output_url ? (
                    <Image
                      src={r.output_url}
                      alt={r.prompt || "generation"}
                      fill
                      sizes={
                        view === 1
                          ? "(max-width:1200px) 100vw, 1200px"
                          : "(max-width:768px) 100vw, 33vw"
                      }
                      className="object-cover"
                      priority={false}
                    />
                  ) : (
                    <div className="skeleton absolute inset-0" />
                  )}
                </div>

                {/* Meta */}
                <div className="p-3 grid gap-1">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </div>
                  {r.prompt && (
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {r.prompt}
                    </div>
                  )}
                  {/* Actions (optional): View / Download */}
                  <div className="mt-3 flex gap-2">
                    {r.output_url && (
                      <>
                        <a
                          className="btn-outline btn-sm"
                          href={r.output_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                        <a
                          className="btn-primary btn-sm"
                          href={r.output_url}
                          download
                        >
                          Download
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function HistorySkeleton({ cols }: { cols: ViewCols }) {
  const grid =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
      ? "grid-cols-2"
      : cols === 3
      ? "grid-cols-3"
      : "grid-cols-6";
  const count = cols * 2;
  return (
    <div className={`grid gap-4 ${grid}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="square relative">
            <div className="skeleton absolute inset-0" />
          </div>
          <div className="p-3">
            <div className="skeleton h-4 w-1/2 mb-2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}