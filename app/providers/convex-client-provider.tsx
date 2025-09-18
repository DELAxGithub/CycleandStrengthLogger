"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

function MissingConvexConfiguration({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center text-slate-600">
      <p className="font-semibold text-lg text-slate-800">
        Convex configuration is missing
      </p>
      <p className="text-slate-600 text-sm">
        Set{" "}
        <code className="rounded bg-slate-200 px-2 py-1">
          NEXT_PUBLIC_CONVEX_URL
        </code>{" "}
        in
        <code className="ml-1 rounded bg-slate-200 px-2 py-1">.env.local</code>{" "}
        and restart the dev server.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-slate-500 text-xs">
        <p>
          1. Run <code>npx convex dev --configure new</code>
        </p>
        <p>
          2. Confirm that <code>.env.local</code> now includes the Convex URL
        </p>
        <p>
          3. Restart <code>npm run dev</code>
        </p>
      </div>
      {children}
    </div>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl, {
      unsafelyIgnoreCertificateErrorsInDevelopment: true,
    });
  }, []);

  if (!client) {
    return <MissingConvexConfiguration>{children}</MissingConvexConfiguration>;
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
