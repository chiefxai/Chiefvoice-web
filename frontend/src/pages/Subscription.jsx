import { Check } from "lucide-react";
import PageHeader from "../components/PageHeader";

const plans = [
  { name: "Starter", price: 999, features: ["1 AI line", "500 calls/mo", "WhatsApp basic"], current: false },
  { name: "Growth", price: 2499, features: ["3 AI lines", "2,000 calls/mo", "Broadcasts", "Khata ledger"], current: true },
  { name: "Enterprise", price: 5999, features: ["Multi-branch", "Unlimited calls", "Dedicated number", "Priority support"], current: false },
];

export default function Subscription() {
  return (
    <div>
      <PageHeader title="Subscription / Plan" subtitle="Manage the shop's VoxAI Kirana SaaS plan" />
      <div className="px-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div key={p.name} className={`card p-5 ${p.current ? "ring-2 ring-[var(--color-trust)]" : ""}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[17px]">{p.name}</h3>
              {p.current && <span className="text-xs bg-[var(--color-trust-light)] text-[var(--color-trust)] px-2 py-0.5 rounded-full">Current</span>}
            </div>
            <div className="text-2xl font-semibold mt-2">₹{p.price}<span className="text-sm font-normal text-[var(--color-muted)]">/mo</span></div>
            <ul className="mt-4 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check size={14} className="text-[var(--color-trust)]" />{f}</li>
              ))}
            </ul>
            <button className={`mt-5 w-full py-2 rounded-xl text-sm font-medium ${p.current ? "bg-gray-100 text-gray-500" : "bg-[var(--color-trust)] text-white"}`}>
              {p.current ? "Current Plan" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>
      <div className="px-8 mt-5 card p-5">
        <h3 className="font-semibold text-[15px] mb-3">Usage This Month</h3>
        <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-muted)]">AI Calls</span><span>1,240 / 2,000</span></div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-[var(--color-trust)]" style={{ width: "62%" }} /></div>
      </div>
      <div className="h-8" />
    </div>
  );
}
