import { useState, useEffect } from "react";
import { PhoneCall, MessageCircle, IndianRupee, AlertTriangle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import Waveform from "../components/Waveform";
import LiveConsole from "../components/LiveConsole";
import { inr } from "../lib/format";
import { Link } from "react-router-dom";

const stat = (label, value, icon, color) => (
  <div className="card p-5 flex items-center justify-between">
    <div>
      <div className="text-xs text-[var(--color-muted)] font-medium">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "1A" }}>
      {icon}
    </div>
  </div>
);

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    totalOrders: 0,
    totalCalls: 0,
    activeSessions: 0,
    avgDuration: 0,
    callSuccessRate: 78,
    avgOrderValue: 0,
    repeatRate: 54
  });
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, ordersRes, catalogRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch("/api/orders"),
          fetch("/api/catalog")
        ]);
        const metricsData = await metricsRes.json();
        const ordersData = await ordersRes.json();
        const catalogData = await catalogRes.json();

        setMetrics(metricsData);
        setOrders(ordersData);
        setCatalog(catalogData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll metrics & orders every 3 seconds for real-time updates
    const interval = setInterval(async () => {
      try {
        const [metricsRes, ordersRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch("/api/orders")
        ]);
        const metricsData = await metricsRes.json();
        const ordersData = await ordersRes.json();
        setMetrics(metricsData);
        setOrders(ordersData);
      } catch (err) {
        console.error("Error polling metrics:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const lowStock = catalog.filter((p) => p.stock < 15);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview — today, Sri Lakshmi Stores" />
      <div className="px-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stat("Today's Revenue", inr(metrics.todayRevenue || 0), <IndianRupee size={18} color="#16A34A" />, "#16A34A")}
        {stat("Orders Today", metrics.totalOrders || "0", <PhoneCall size={18} color="#5B5BD6" />, "#5B5BD6")}
        {stat("AI Calls Handled", metrics.totalCalls || "0", <PhoneCall size={18} color="#F59E0B" />, "#F59E0B")}
        {stat("Active Calls", metrics.activeSessions || "0", <MessageCircle size={18} color="#16A34A" />, "#16A34A")}
      </div>

      <div className="px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Live Order Feed</h3>
            <Link to="/orders" className="text-xs text-[var(--color-trust)] font-medium">View all →</Link>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((o) => (
              <Link to={`/orders/${o.id}`} key={o.id} className="flex items-center justify-between border border-[var(--color-border)] rounded-xl px-4 py-3 hover:bg-gray-50">
                <div>
                  <div className="text-sm font-medium">{o.customer}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">{o.id} · {o.source} · {o.time}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{inr(o.total)}</span>
                  <StatusChip status={o.status} />
                </div>
              </Link>
            ))}
            {orders.length === 0 && (
              <div className="text-center text-sm py-8 text-[var(--color-muted)]">No orders placed today.</div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Waveform />
            <h3 className="font-semibold text-[15px]">Live Voice Agent</h3>
          </div>
          {metrics.activeSessions > 0 ? (
            <div className="mt-3 bg-[var(--color-indigo-light)] rounded-xl p-4 animate-pulse">
              <div className="text-sm font-medium text-[var(--color-indigo)]">Active Call In Progress</div>
              <div className="text-xs text-gray-600 mt-1">Awaiting real-time transcription logs in console...</div>
              <div className="text-xs text-[var(--color-muted)] mt-2">Duration: ~ {metrics.avgDuration}s</div>
            </div>
          ) : (
            <div className="mt-3 bg-gray-50 border border-dashed border-[var(--color-border)] rounded-xl p-4 text-center">
              <div className="text-sm font-medium text-gray-500">Agent Idle</div>
              <div className="text-xs text-[var(--color-muted)] mt-1">Ready for incoming browser or Twilio calls.</div>
            </div>
          )}

          <h3 className="font-semibold text-[15px] mt-6 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--color-saffron)]" /> Low Stock Alerts
          </h3>
          <div className="space-y-2">
            {lowStock.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.name} <span className="text-[var(--color-muted)]">({p.brand})</span></span>
                <span className="text-[var(--color-danger)] font-medium">{p.stock} {p.unit} left</span>
              </div>
            ))}
            {lowStock.length === 0 && (
              <div className="text-xs text-[var(--color-muted)] italic">All items are sufficiently stocked.</div>
            )}
          </div>
        </div>
      </div>

      {/* Live AI Log Console Section */}
      <div className="px-8 mt-6">
        <LiveConsole />
      </div>

      <div className="px-8 mt-6 mb-8 grid grid-cols-3 gap-5">
        <div className="card p-5 text-center">
          <div className="text-3xl font-semibold text-[var(--color-trust)]">{metrics.callSuccessRate}%</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">AI Call Success Rate</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-semibold">{inr(metrics.avgOrderValue)}</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">Average Order Value</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-semibold">{metrics.repeatRate}%</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">Repeat Order Rate</div>
        </div>
      </div>
    </div>
  );
}
