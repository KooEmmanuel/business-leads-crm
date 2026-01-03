export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Clerk sign-in URL - Clerk handles this automatically via SignIn component
// This is kept for backward compatibility but Clerk's SignIn component should be used instead
export const getLoginUrl = () => {
  return "/sign-in";
};
