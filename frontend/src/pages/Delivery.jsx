import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import { deliveryBoys, orders } from "../lib/mockData";
import { MapPin } from "lucide-react";

export default function Delivery() {
  return (
    <div>
      <PageHeader title="Delivery Management" subtitle="Assign orders, track delivery boys in real time" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Delivery Boys</h3>
          <div className="space-y-3">
            {deliveryBoys.map((d) => (
              <div key={d.id} className="border border-[var(--color-border)] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "Available" ? "bg-[var(--color-trust-light)] text-[var(--color-trust)]" : "bg-[var(--color-indigo-light)] text-[var(--color-indigo)]"}`}>{d.status}</span>
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1">{d.phone} · {d.todayOrders} orders today</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Order Assignment Board</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="py-2 font-medium">Order</th>
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Assign</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => o.delivery === "Delivery").map((o) => (
                <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5">{o.id}</td>
                  <td className="py-2.5">{o.customer}</td>
                  <td className="py-2.5"><StatusChip status={o.status} /></td>
                  <td className="py-2.5">
                    <select className="border border-[var(--color-border)] rounded-lg text-xs px-2 py-1">
                      <option>Unassigned</option>
                      {deliveryBoys.map((d) => <option key={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 rounded-xl bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] h-40 flex items-center justify-center text-[var(--color-muted)] text-sm gap-2">
            <MapPin size={16} /> Route map view (pending delivery pins + optimized route)
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
