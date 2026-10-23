import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { DemoBanner } from "./demo/DemoBanner";
import { isDemoMode } from "./demo/config";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const Router = isDemoMode ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          {isDemoMode && <DemoBanner />}
          <App />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  </StrictMode>
);
