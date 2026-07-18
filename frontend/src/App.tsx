import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { DocumentTitle } from "./components/DocumentTitle";
import EnginePage from "./pages/EnginePage";
import EngineV2Page from "./pages/EngineV2Page";
import HubPage from "./pages/HubPage";
import LiveAffichagePage from "./pages/LiveAffichagePage";
import ManagerPage from "./pages/ManagerPage";
import Bracket16MainPreviewPage from "./pages/Bracket16MainPreviewPage";

const IS_ENGINE_V2 =
  import.meta.env.VITE_DEPLOY_TARGET === "engine-v2";

export default function App() {
  return (
    <HashRouter>
      <DocumentTitle />
      <Routes>
        <Route
          path="/"
          element={
            IS_ENGINE_V2 ? (
              <Navigate to="/engine-v2/participants" replace />
            ) : (
              <HubPage />
            )
          }
        />
        <Route path="/engine-v2" element={<EngineV2Page />} />
        <Route path="/engine-v2/*" element={<EngineV2Page />} />
        <Route path="/engine" element={<EnginePage />} />
        <Route path="/engine/*" element={<EnginePage />} />
        <Route path="/manager/affichage/:token" element={<LiveAffichagePage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/manager/*" element={<ManagerPage />} />
        <Route path="/preview/tableau-16" element={<Bracket16MainPreviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
