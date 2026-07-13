import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { DocumentTitle } from "./components/DocumentTitle";
import EnginePage from "./pages/EnginePage";
import HubPage from "./pages/HubPage";
import ManagerPage from "./pages/ManagerPage";
import Bracket16MainPreviewPage from "./pages/Bracket16MainPreviewPage";

export default function App() {
  return (
    <HashRouter>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/engine" element={<EnginePage />} />
        <Route path="/engine/*" element={<EnginePage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/manager/*" element={<ManagerPage />} />
        <Route path="/preview/tableau-16" element={<Bracket16MainPreviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
