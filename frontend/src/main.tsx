import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EXPORT_CAPTURE_BUILD_MARKER } from "./manager/formatBracketLabel";
import "./index.css";

// Marqueur obligatoire dans le bundle (vérif Docker /api/v2/frontend-check).
(globalThis as unknown as { __ENGINE_V2_CAPTURE_MARKER__?: string }).__ENGINE_V2_CAPTURE_MARKER__ =
  EXPORT_CAPTURE_BUILD_MARKER;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
