import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getApiKey } from "./api/storage";
import AppShell from "./components/AppShell";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import CampaignListPage from "./pages/CampaignListPage";
import CalendarPage from "./pages/CalendarPage";
import InventoryPage from "./pages/InventoryPage";
import LoginPage from "./pages/LoginPage";
import MarketplaceImportPage from "./pages/MarketplaceImportPage";
import MasterProductPage from "./pages/MasterProductPage";
import NewCampaignPage from "./pages/NewCampaignPage";
import PaymentPage from "./pages/PaymentPage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";

function RequireAuth() {
  const location = useLocation();
  const key = getApiKey();
  if (!key) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <AppShell />;
}

export default function App() {
  return (
    <>
      <div className="noise" />
      <Routes>
        <Route path="/" element={<Navigate to="/campaigns" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/campaigns" element={<CampaignListPage />} />
          <Route path="/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/marketplace-import" element={<MarketplaceImportPage />} />
          <Route path="/master-product" element={<MasterProductPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
    </>
  );
}
