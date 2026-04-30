"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Injects a dynamic favicon from the branding settings.
 * Falls back to the default emoji favicon if none is configured.
 */
export function DynamicFavicon() {
  const qc = useQueryClient();

  const { data } = useQuery<{ data: { appName: string; appIcon: string; appFavicon: string } }>({
    queryKey: ["app-config"],
    queryFn: () => fetch("/api/public/app-config").then(r => r.json()),
    staleTime: 0, // Always fetch fresh to reflect changes immediately
    refetchInterval: 30000, // Refetch every 30 seconds to catch updates
  });

  useEffect(() => {
    const favicon = data?.data?.appFavicon;
    const appName = data?.data?.appName;

    // Update the document title prefix
    if (appName) {
      document.title = document.title.replace(/^.*?\|/, `${appName} |`).replace(/AMPM Lending(\s*–[^|]+)?$/, appName);
    }

    // Remove ALL existing favicon-related link elements, then add a fresh one.
    // Mutating an existing element's href is not reliably picked up by all browsers.
    document
      .querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']")
      .forEach((el) => el.parentNode?.removeChild(el));

    const link = document.createElement("link");
    link.rel = "icon";

    if (favicon) {
      link.type = favicon.startsWith("data:image/png")
        ? "image/png"
        : favicon.startsWith("data:image/svg")
        ? "image/svg+xml"
        : "image/x-icon";
      link.href = favicon;
    } else {
      // Default: emoji favicon via SVG
      link.type = "image/svg+xml";
      link.href =
        "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💳</text></svg>";
    }

    document.head.appendChild(link);
  }, [data]);

  return null;
}
