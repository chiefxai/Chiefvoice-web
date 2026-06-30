import { Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Catalog from "./pages/Catalog";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Khata from "./pages/Khata";
import Delivery from "./pages/Delivery";
import Broadcast from "./pages/Broadcast";
import AIAgent from "./pages/AIAgent";
import Pricing from "./pages/Pricing";
import Suppliers from "./pages/Suppliers";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/khata" element={<Khata />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/ai-agent" element={<AIAgent />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/subscription" element={<Subscription />} />
      </Route>
    </Routes>
  );
}
