import { ClerkProvider } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevent refetch on window focus to reduce refreshes
      staleTime: 1000 * 60, // Consider data fresh for 1 minute
    },
  },
});

// Error logging for debugging (redirect disabled since Clerk handles auth)
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Only log errors that aren't auth-related (Clerk handles auth)
    if (error instanceof TRPCClientError && error.message !== UNAUTHED_ERR_MSG) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    // Only log errors that aren't auth-related (Clerk handles auth)
    if (error instanceof TRPCClientError && error.message !== UNAUTHED_ERR_MSG) {
      console.error("[API Mutation Error]", error);
    }
  }
});

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
if (!clerkPublishableKey) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable - Clerk auth disabled");
}

console.log("Clerk key:", clerkPublishableKey ? "✓ Set" : "✗ Missing");

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include", // This sends cookies including Clerk's __session cookie
        });
      },
    }),
  ],
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

try {
  createRoot(rootElement).render(
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  );
  console.log("App mounted successfully");
} catch (error) {
  console.error("Failed to mount app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Error Loading App</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <p>Check the browser console for more details.</p>
    </div>
  `;
}
