import PageHeader from "../components/PageHeader";
import { inr } from "../lib/format";

const suppliers = [
  { name: "Aachi Distributors", phone: "+91 90030 11200", pending: 2, balance: 18400 },
  { name: "Tata Sampann Wholesale", phone: "+91 94420 88311", pending: 0, balance: 0 },
  { name: "Gold Winner Oils Madurai", phone: "+91 87654 22109", pending: 1, balance: 7200 },
];

export default function Suppliers() {
  return (
    <div>
      <PageHeader title="Supplier / Purchase Management" subtitle="Track stock-in, purchase orders, and supplier payments" />
      <div className="px-8 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Pending POs</th>
              <th className="px-4 py-3 font-medium">Payable Balance</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.name} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.phone}</td>
                <td className="px-4 py-3">{s.pending}</td>
                <td className="px-4 py-3">{s.balance ? <span className="text-[var(--color-danger)] font-medium">{inr(s.balance)}</span> : "—"}</td>
                <td className="px-4 py-3 text-right"><button className="text-xs text-[var(--color-indigo)] font-medium">Record Stock-In</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-8 mt-4">
        <button className="bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl">+ New Purchase Order</button>
      </div>
      <div className="h-8" />
    </div>
  );
}
