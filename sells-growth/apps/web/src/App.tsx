import { Navigate, Route, Routes } from "react-router-dom";
import { getApiKey } from "./api/storage";
import AppShell from "./components/AppShell";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import CampaignListPage from "./pages/CampaignListPage";
import NewCampaignPage from "./pages/NewCampaignPage";
import SettingsPage from "./pages/SettingsPage";

function RequireApiKey() {
  const key = getApiKey();
  if (!key) return <Navigate to="/settings" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <>
      <div className="noise" />
      <Routes>
        <Route path="/" element={<Navigate to="/campaigns" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<RequireApiKey />}>
          <Route path="/campaigns" element={<CampaignListPage />} />
          <Route path="/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
    </>
  );
}
