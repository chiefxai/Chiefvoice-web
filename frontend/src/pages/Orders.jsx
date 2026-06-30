import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import { orders as mockOrders } from "../lib/mockData";
import { inr } from "../lib/format";

const API_BASE = window.location.origin;
const tabs = ["All", "Placed", "Confirmed", "Packing", "Out for Delivery", "Delivered", "Cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data);
        } else {
          setOrders(mockOrders);
        }
      } catch (err) {
        console.warn("Using mock orders due to fetch error:", err.message);
        setOrders(mockOrders);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filtered = orders.filter(
    (o) => (tab === "All" || o.status === tab) && 
           ((o.customer && o.customer.toLowerCase().includes(q.toLowerCase())) || o.id.includes(q))
  );

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="All orders from AI Call, WhatsApp, and manual entry"
        action={
          <button className="bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 cursor-pointer">
            <Plus size={16} /> New Manual Order
          </button>
        }
      />
      <div className="px-8">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border cursor-pointer ${
                tab === t ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]" : "border-[var(--color-border)] text-gray-600 bg-white hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-[var(--color-muted)]">Loading orders...</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)]">
              <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by order ID or customer"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] outline-none focus:border-[var(--color-trust)] bg-white"
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${o.id}`} className="font-medium text-[var(--color-indigo)]">{o.id}</Link>
                      <div className="text-xs text-[var(--color-muted)]">{o.time}</div>
                    </td>
                    <td className="px-4 py-3">{o.customer || "Unknown"}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{o.items ? o.items.length : 0} items</td>
                    <td className="px-4 py-3 font-medium">{inr(o.total)}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{o.source}</td>
                    <td className="px-4 py-3"><StatusChip status={o.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-[var(--color-muted)] text-sm">No orders match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
