import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, ListOrdered, Package, Users, Wallet, Truck, Megaphone,
  Bot, Tag, Boxes, UserCog, BarChart3, FileText, Landmark, Settings, CreditCard, Phone, PhoneOff
} from "lucide-react";
import { shop } from "../lib/mockData";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orders", label: "Orders", icon: ListOrdered },
  { to: "/catalog", label: "Catalog / Inventory", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/khata", label: "Credit / Khata", icon: Wallet },
  { to: "/delivery", label: "Delivery", icon: Truck },
  { to: "/broadcast", label: "WhatsApp Broadcast", icon: Megaphone },
  { to: "/ai-agent", label: "AI Agent Config", icon: Bot },
  { to: "/pricing", label: "Pricing & Offers", icon: Tag },
  { to: "/suppliers", label: "Suppliers", icon: Boxes },
  { to: "/staff", label: "Staff & Roles", icon: UserCog },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/billing", label: "Billing / GST", icon: FileText },
  { to: "/payments", label: "Payments Reconciliation", icon: Landmark },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/subscription", label: "Subscription", icon: CreditCard },
];

const API_BASE = window.location.origin;

export default function AppShell() {
  const [activeCall, setActiveCall] = useState(null); // { phone, callSid, status: 'calling'|'active' }

  const triggerCall = async (phone) => {
    setActiveCall({ phone, status: 'calling' });
    try {
      const res = await fetch(`${API_BASE}/api/twilio/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone })
      });
      const data = await res.json();
      if (data.success) {
        setActiveCall({ phone, callSid: data.callSid, status: 'active' });
      } else {
        alert("Twilio call failed: " + (data.error || "Please check credentials"));
        setActiveCall(null);
      }
    } catch (err) {
      alert("Network error: " + err.message);
      setActiveCall(null);
    }
  };

  const triggerHangup = async () => {
    if (!activeCall?.callSid) {
      setActiveCall(null);
      return;
    }
    setActiveCall(prev => prev ? { ...prev, status: 'hanging_up' } : null);
    try {
      await fetch(`${API_BASE}/api/twilio/hangup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callSid: activeCall.callSid })
      });
    } catch (err) {
      console.error(err);
    }
    setActiveCall(null);
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-white border-r border-[var(--color-border)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--color-border)] flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-trust)] flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-[15px] leading-tight">VoxAI Kirana</div>
            <div className="text-xs text-[var(--color-muted)] leading-tight">{shop.name}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-colors ${
                  isActive
                    ? "bg-[var(--color-trust-light)] text-[var(--color-trust)] font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="rounded-xl bg-[var(--color-bg)] p-3 text-xs">
            <div className="font-medium text-gray-700">{shop.plan} Plan</div>
            <div className="text-[var(--color-muted)] mt-0.5">1,240 / 2,000 calls used</div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-[var(--color-trust)]" style={{ width: "62%" }} />
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-[var(--color-bg)] relative">
        <Outlet context={{ triggerCall, activeCall, triggerHangup }} />

        {activeCall && (
          <div className="fixed bottom-6 right-6 card p-4 flex items-center gap-4 bg-white border border-[var(--color-border)] shadow-xl z-50 rounded-2xl animate-fade-in transition-all">
            <div className={`w-3.5 h-3.5 rounded-full bg-red-500 ${activeCall.status === 'hanging_up' ? '' : 'animate-ping'}`} />
            <div>
              <div className="text-[10px] text-[var(--color-muted)] font-bold tracking-wider uppercase">
                {activeCall.status === 'calling' ? 'Twilio Dialing...' : activeCall.status === 'hanging_up' ? 'Ending Call...' : 'Active call (Twilio)'}
              </div>
              <div className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">{activeCall.phone}</div>
            </div>
            <button
              onClick={triggerHangup}
              disabled={activeCall.status === 'hanging_up'}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white p-2.5 rounded-xl font-medium transition-colors flex items-center justify-center"
              title="Hang Up"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
