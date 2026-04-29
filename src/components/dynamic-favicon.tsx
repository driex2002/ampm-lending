"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Injects a dynamic favicon from the branding settings.
 * Falls back to the default emoji favicon if none is configured.
 */
export function DynamicFavicon() {
  const { data } = useQuery<{ data: { appName: string; appIcon: string; appFavicon: string } }>({
    queryKey: ["app-config"],
    queryFn: () => fetch("/api/public/app-config").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const favicon = data?.data?.appFavicon;
    const appName = data?.data?.appName;

    // Update the document title prefix
    if (appName) {
      document.title = document.title.replace(/^.*?\|/, `${appName} |`).replace(/AMPM Lending(\s*–[^|]+)?$/, appName);
    }

    // Update favicon
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    if (favicon) {
      link.type = favicon.startsWith("data:image/png") ? "image/png" : "image/x-icon";
      link.href = favicon;
    } else {
      // Default: emoji favicon via SVG
      link.type = "image/svg+xml";
      link.href =
        "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💳</text></svg>";
    }
  }, [data]);

  return null;
}
