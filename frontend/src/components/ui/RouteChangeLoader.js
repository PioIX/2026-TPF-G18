"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteChangeLoader() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const timeout = useRef(null);
  const writeIdleTimeout = useRef(null);
  const routePending = useRef(false);
  const pendingWrites = useRef(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      routePending.current = false;
      window.clearTimeout(timeout.current);
      setLoading(pendingWrites.current > 0 || writeIdleTimeout.current !== null);
    }
  }, [pathname]);

  useEffect(() => {
    const syncLoading = () => setLoading(routePending.current || pendingWrites.current > 0 || writeIdleTimeout.current !== null);
    const startWrite = () => {
      window.clearTimeout(writeIdleTimeout.current);
      writeIdleTimeout.current = null;
      pendingWrites.current += 1;
      syncLoading();
    };
    const finishWrite = () => {
      pendingWrites.current = Math.max(0, pendingWrites.current - 1);
      if (pendingWrites.current === 0) {
        window.clearTimeout(writeIdleTimeout.current);
        writeIdleTimeout.current = window.setTimeout(() => {
          writeIdleTimeout.current = null;
          syncLoading();
        }, 1000);
      } else syncLoading();
    };
    const startRouteLoading = () => {
      routePending.current = true;
      syncLoading();
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => {
        routePending.current = false;
        syncLoading();
      }, 20000);
    };

    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) startRouteLoading();
    };

    const originalFetch = window.fetch;
    const trackedFetch = function trackedFetch(input, init) {
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      const isWrite = !["GET", "HEAD", "OPTIONS"].includes(method);
      if (isWrite) startWrite();
      let request;
      try {
        request = originalFetch.apply(this, arguments);
      } catch (error) {
        if (isWrite) finishWrite();
        throw error;
      }
      return Promise.resolve(request).finally(() => {
        if (isWrite) finishWrite();
      });
    };

    window.fetch = trackedFetch;
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", startRouteLoading);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", startRouteLoading);
      window.clearTimeout(timeout.current);
      window.clearTimeout(writeIdleTimeout.current);
      if (window.fetch === trackedFetch) window.fetch = originalFetch;
    };
  }, []);

  if (!loading) return null;
  return <div className="routeLoadingIndicator" role="status" aria-label="Cargando"><span className="loadingSpinner" aria-hidden="true" /></div>;
}