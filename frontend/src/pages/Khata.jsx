import PageHeader from "../components/PageHeader";
import { customers } from "../lib/mockData";
import { inr } from "../lib/format";

const ledger = [
  { date: "26 Jun", desc: "Order ORD-10180", debit: 4200, credit: 0, balance: 8600 },
  { date: "22 Jun", desc: "Payment received (UPI)", debit: 0, credit: 3000, balance: 4400 },
  { date: "18 Jun", desc: "Order ORD-10142", debit: 7400, credit: 0, balance: 7400 },
];

export default function Khata() {
  const inDebt = customers.filter((c) => c.khata > 0);
  return (
    <div>
      <PageHeader title="Credit / Khata Ledger" subtitle="Track udhaar balances per customer" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Customers with Balance</h3>
          <div className="space-y-2">
            {inDebt.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-[var(--color-border)] rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">Limit {inr(25000)}</div>
                </div>
                <span className="text-sm font-semibold text-[var(--color-danger)]">{inr(c.khata)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Ledger — Selvam Traders</h3>
            <div className="flex gap-2">
              <button className="text-xs border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium">Export Statement PDF</button>
              <button className="text-xs bg-[var(--color-trust)] text-white px-3 py-1.5 rounded-lg font-medium">Send Reminder via WhatsApp</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Debit</th>
                <th className="py-2 font-medium text-right">Credit</th>
                <th className="py-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5">{l.date}</td>
                  <td className="py-2.5">{l.desc}</td>
                  <td className="py-2.5 text-right">{l.debit ? inr(l.debit) : "—"}</td>
                  <td className="py-2.5 text-right text-[var(--color-trust)]">{l.credit ? inr(l.credit) : "—"}</td>
                  <td className="py-2.5 text-right font-medium">{inr(l.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center gap-2">
            <label className="text-xs text-[var(--color-muted)]">Credit Limit</label>
            <input defaultValue="25000" className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm w-28" />
            <span className="text-xs text-[var(--color-muted)]">AI auto-blocks new orders beyond this limit during calls</span>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
