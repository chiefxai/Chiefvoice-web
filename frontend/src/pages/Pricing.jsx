import PageHeader from "../components/PageHeader";

const rules = [
  { name: "Bulk Rice Discount", rule: "5+ kg Ponni Rice = 5% off", type: "Quantity", active: true },
  { name: "Wholesale Tier Pricing", rule: "Wholesale customers get 8% off catalog price", type: "Customer Tier", active: true },
  { name: "Pongal Festival Offer", rule: "10% off Sugar, Oil, Rice — Jan 10–16", type: "Festival", active: false },
  { name: "Soap + Tea Combo", rule: "Buy Toilet Soap dozen + Tea 1kg = ₹50 off", type: "Combo", active: true },
];

export default function Pricing() {
  return (
    <div>
      <PageHeader title="Pricing & Offers" subtitle="Discount rules the AI automatically applies and mentions during calls" />
      <div className="px-8 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-medium">Rule</th>
              <th className="px-4 py-3 font-medium">Condition</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.name} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{r.rule}</td>
                <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{r.type}</span></td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? "bg-[var(--color-trust-light)] text-[var(--color-trust)]" : "bg-gray-100 text-gray-500"}`}>{r.active ? "Active" : "Inactive"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-8 mt-4">
        <button className="bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl">+ New Discount Rule</button>
      </div>
      <div className="h-8" />
    </div>
  );
}
