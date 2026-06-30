import PageHeader from "../components/PageHeader";
import { orders } from "../lib/mockData";
import { inr } from "../lib/format";

export default function Billing() {
  return (
    <div>
      <PageHeader title="Billing / Invoices & GST" subtitle="Auto-generated GST-compliant invoices for every order" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">GSTIN</div><div className="text-sm font-medium mt-1">33ABCDE1234F1Z5</div></div>
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">This Month's Taxable Sales</div><div className="text-sm font-medium mt-1">{inr(412800)}</div></div>
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">CGST + SGST Collected</div><div className="text-sm font-medium mt-1">{inr(20640)}</div></div>
        <div className="card p-4"><div className="text-xs text-[var(--color-muted)]">GST Summary Export</div><button className="text-xs text-[var(--color-indigo)] font-medium mt-1">Download Report</button></div>
      </div>
      <div className="px-8 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Taxable Value</th>
              <th className="px-4 py-3 font-medium">GST</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 font-medium">INV-{2200 + i}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{o.id}</td>
                <td className="px-4 py-3">{o.customer}</td>
                <td className="px-4 py-3">{inr(Math.round(o.total / 1.05))}</td>
                <td className="px-4 py-3">{inr(o.total - Math.round(o.total / 1.05))}</td>
                <td className="px-4 py-3 text-right"><button className="text-xs text-[var(--color-indigo)] font-medium">View PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-8" />
    </div>
  );
}
