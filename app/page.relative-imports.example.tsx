"use client";
import { useEffect, useMemo, useState } from "react";
import { PRESETS, type Species } from "./presets"; // relative import
import { supabase } from "../lib/supabaseClient";  // relative import
import BeforeAfter from "../components/BeforeAfter"; // relative import

export default function Home() {
  return <main className="card">This is just an example file to show relative imports.</main>;
}
