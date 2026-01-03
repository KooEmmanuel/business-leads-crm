import { useUser, useClerk } from "@clerk/clerk-react";
import { useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const syncMutation = trpc.auth.sync.useMutation();
  const hasSyncedRef = useRef<string | null>(null); // Track which user ID we've synced

  // Sync user to database when they sign in (only once per user)
  useEffect(() => {
    if (isSignedIn && user && userLoaded && user.id) {
      // Only sync if we haven't synced this user yet, and not currently syncing
      if (hasSyncedRef.current !== user.id && !syncMutation.isPending) {
        hasSyncedRef.current = user.id;
        syncMutation.mutate(undefined, {
          onError: () => {
            // Reset on error so we can retry
            hasSyncedRef.current = null;
          },
        });
      }
    } else if (!isSignedIn) {
      // Reset when user signs out
      hasSyncedRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id, userLoaded]);

  // Store user info in localStorage (separate from state calculation to avoid side effects)
  useEffect(() => {
    if (user && userLoaded) {
      const userInfo = {
        id: user.id,
        openId: user.id,
        name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "User",
        email: user.emailAddresses[0]?.emailAddress || null,
      };
      
      // Only update localStorage if the value actually changed
      const currentInfo = localStorage.getItem("manus-runtime-user-info");
      const newInfo = JSON.stringify(userInfo);
      if (currentInfo !== newInfo) {
        localStorage.setItem("manus-runtime-user-info", newInfo);
      }
    } else if (!user && userLoaded) {
      localStorage.removeItem("manus-runtime-user-info");
    }
  }, [user?.id, user?.fullName, user?.firstName, user?.emailAddresses, userLoaded]);

  const logout = async () => {
    try {
      await clerk.signOut();
    } catch (error) {
      console.error("[Auth] Logout failed", error);
      throw error;
    }
  };

  const state = useMemo(() => {
    // Only consider authenticated when userLoaded is true AND isSignedIn is explicitly true
    // This prevents showing unauthenticated state during initial load
    const loading = !userLoaded;
    const isAuthenticated = userLoaded && (isSignedIn === true);

    return {
      user: user
        ? {
            id: user.id,
            openId: user.id,
            name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "User",
            email: user.emailAddresses[0]?.emailAddress || null,
          }
        : null,
      loading,
      error: null,
      isAuthenticated,
    };
  }, [user, userLoaded, isSignedIn]);

  return {
    ...state,
    refresh: () => {
      // Clerk automatically refetches, no manual refresh needed
    },
    logout,
  };
}
