import PageHeader from "../components/PageHeader";
import { inr } from "../lib/format";

const payments = [
  { order: "ORD-10231", method: "UPI", amount: 732, status: "Matched" },
  { order: "ORD-10230", method: "Credit/Khata", amount: 3780, status: "Pending" },
  { order: "ORD-10229", method: "COD", amount: 349, status: "Matched" },
  { order: "ORD-10228", method: "UPI", amount: 200, status: "Matched" },
];

export default function Payments() {
  return (
    <div>
      <PageHeader title="Payments Reconciliation" subtitle="UPI, COD, and khata payments matched against orders" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">Today's Collections</div><div className="text-xl font-semibold mt-1">{inr(28900)}</div></div>
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">Settlement Status</div><div className="text-sm font-medium mt-1 text-[var(--color-trust)]">Settled to bank ····2245</div></div>
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">Pending Reconciliation</div><div className="text-xl font-semibold mt-1 text-[var(--color-saffron)]">{inr(3780)}</div></div>
      </div>
      <div className="px-8 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.order} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 font-medium">{p.order}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.method}</td>
                <td className="px-4 py-3">{inr(p.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "Matched" ? "bg-[var(--color-trust-light)] text-[var(--color-trust)]" : "bg-[var(--color-saffron-light)] text-amber-800"}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-8" />
    </div>
  );
}
