"use client";
import { useEffect, useState } from "react";
import { ANONYMOUS_LIMIT } from "@/types";

const KEY = "anon_q_count";

export function useAnonymousLimit() {
  const [used, setUsed] = useState(0);

  useEffect(() => {
    const v = parseInt(localStorage.getItem(KEY) ?? "0", 10);
    setUsed(isNaN(v) ? 0 : v);
  }, []);

  const increment = () => {
    const next = used + 1;
    setUsed(next);
    localStorage.setItem(KEY, String(next));
  };

  return { used, limit: ANONYMOUS_LIMIT, remaining: Math.max(0, ANONYMOUS_LIMIT - used), increment, isLimited: used >= ANONYMOUS_LIMIT };
}
