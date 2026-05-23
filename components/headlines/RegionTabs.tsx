"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { REGION_LABELS } from "@/lib/sources";
import type { Region } from "@/lib/types";
import { cn } from "@/lib/utils";

const REGIONS: Array<Region | "all"> = ["all", "nl", "en", "de", "us"];

type Props = {
  basePath?: string;
};

export function RegionTabs({ basePath = "/" }: Props) {
  const searchParams = useSearchParams();
  const current = (searchParams.get("region") ?? "all") as Region | "all";

  function hrefFor(region: Region | "all") {
    const params = new URLSearchParams(searchParams.toString());
    if (region === "all") params.delete("region");
    else params.set("region", region);
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  }

  return (
    <nav
      className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none"
      aria-label="Regio filter"
    >
      {REGIONS.map((region) => (
        <Link
          key={region}
          href={hrefFor(region)}
          scroll={false}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            current === region
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
          )}
        >
          {REGION_LABELS[region]}
        </Link>
      ))}
    </nav>
  );
}
