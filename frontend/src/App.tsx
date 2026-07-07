import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import EnginePage from "./pages/EnginePage";
import HubPage from "./pages/HubPage";
import ManagerPage from "./pages/ManagerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/engine" element={<EnginePage />} />
        <Route path="/engine/*" element={<EnginePage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/manager/*" element={<ManagerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
