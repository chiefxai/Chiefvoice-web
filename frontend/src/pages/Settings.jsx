import PageHeader from "../components/PageHeader";
import { shop } from "../lib/mockData";

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Shop profile, numbers, and notification preferences" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-[15px] mb-1">Shop Profile</h3>
          <div><label className="text-xs text-[var(--color-muted)]">Shop name</label><input defaultValue={shop.name} className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-[var(--color-muted)]">Owner</label><input defaultValue={shop.owner} className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-[var(--color-muted)]">Address</label><input defaultValue={shop.locality} className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" /></div>
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-[15px] mb-1">Connected Numbers</h3>
          <div className="flex items-center justify-between text-sm"><span>AI Phone Number (Twilio/Exotel)</span><span className="font-medium">{shop.aiNumber}</span></div>
          <div className="flex items-center justify-between text-sm"><span>WhatsApp Business Number</span><span className="font-medium">{shop.whatsappNumber}</span></div>
          <div className="flex items-center justify-between text-sm"><span>WhatsApp Connection Status</span><span className="text-[var(--color-trust)] font-medium">Connected</span></div>
          <button className="text-xs text-[var(--color-indigo)] font-medium">Reconnect / Change Number</button>
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-[15px] mb-1">Notifications</h3>
          {["New order alert (sound)", "Low stock alert", "Daily WhatsApp summary"].map((n) => (
            <label key={n} className="flex items-center justify-between text-sm">
              {n}
              <input type="checkbox" defaultChecked className="accent-[var(--color-trust)] w-4 h-4" />
            </label>
          ))}
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-[15px] mb-1">Data</h3>
          <button className="text-xs text-[var(--color-indigo)] font-medium block">Export all data (CSV)</button>
          <button className="text-xs text-[var(--color-danger)] font-medium block">Delete shop account</button>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
