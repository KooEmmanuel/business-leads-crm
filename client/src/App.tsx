import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
import DealCreate from "./pages/DealCreate";
import DealEdit from "./pages/DealEdit";
import Messages from "./pages/Messages";
import Activities from "./pages/Activities";
import Agents from "./pages/Agents";
import SignInPage from "./pages/SignIn";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/sign-in"} component={SignInPage} />
      <Route path={"/contacts/:id"} component={ContactDetail} />
      <Route path={"/contacts"} component={Contacts} />
      <Route path={"/deals/create"} component={DealCreate} />
      <Route path={"/deals/:id/edit"} component={DealEdit} />
      <Route path={"/deals/:id"} component={DealDetail} />
      <Route path={"/deals"} component={Deals} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/activities"} component={Activities} />
      <Route path={"/agents"} component={Agents} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log("App component rendering");
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
