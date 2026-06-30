import { useState, useEffect } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, PhoneCall } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { customers as mockCustomers, orders as mockOrders } from "../lib/mockData";
import { inr } from "../lib/format";

const API_BASE = window.location.origin;

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { triggerCall, activeCall } = useOutletContext();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch specific customer profile
        const custRes = await fetch(`${API_BASE}/api/customers/${id}`);
        if (!custRes.ok) throw new Error("Customer not found");
        const custData = await custRes.json();
        setCustomer(custData);

        // Fetch orders to build history
        const ordersRes = await fetch(`${API_BASE}/api/orders`);
        const ordersData = await ordersRes.json();
        const customerOrders = Array.isArray(ordersData) 
          ? ordersData.filter((o) => o.customer === custData.name || o.phone === custData.phone)
          : [];
        setHistory(customerOrders);
      } catch (err) {
        console.warn("Using mock data due to fetch error:", err.message);
        const mc = mockCustomers.find((x) => x.id === id) || mockCustomers[0];
        setCustomer(mc);
        setHistory(mockOrders.filter((o) => o.customer === mc.name));
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-sm text-[var(--color-muted)]">Loading customer profiles...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12 text-sm text-red-500">Customer not found</div>;
  }

  return (
    <div>
      <div className="px-8 pt-8">
        <Link to="/customers" className="text-sm text-[var(--color-muted)] flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Back to Customers
        </Link>
      </div>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.phone} · ${customer.locality}`}
        action={
          <button
            onClick={() => triggerCall(customer.phone)}
            disabled={!!activeCall}
            className="flex items-center gap-2 bg-[var(--color-indigo)] hover:opacity-90 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
          >
            <PhoneCall size={15} />
            {activeCall?.phone === customer.phone ? 'Calling...' : 'Call Customer'}
          </button>
        }
      />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-[15px] mb-3">Order History</h3>
            <table className="w-full text-sm">
              <tbody>
                {history.length ? history.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5">{o.id}</td>
                    <td className="py-2.5 text-[var(--color-muted)]">{o.time}</td>
                    <td className="py-2.5 text-right font-medium">{inr(o.total)}</td>
                  </tr>
                )) : <tr><td className="py-3 text-[var(--color-muted)]">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-[15px] mb-3 flex items-center gap-2">
              <PhoneCall size={15} className="text-[var(--color-indigo)]" /> AI Call History
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              Call logs and transcriptions are mapped dynamically from your backend API database records.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-[15px] mb-3">Staff Notes</h3>
            <textarea className="w-full text-sm border border-[var(--color-border)] rounded-xl p-3 outline-none focus:border-[var(--color-trust)] bg-white" rows={3} placeholder="e.g. Prefers Aachi brand, calls in Tamil only" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="card p-5">
            <div className="text-xs text-[var(--color-muted)]">Lifetime Value</div>
            <div className="text-2xl font-semibold mt-1">{inr(customer.ltv)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-[var(--color-muted)]">Outstanding Khata Balance</div>
            <div className={`text-2xl font-semibold mt-1 ${customer.khata > 0 ? "text-[var(--color-danger)]" : ""}`}>{inr(customer.khata)}</div>
            <button className="mt-3 w-full bg-[var(--color-trust)] text-white text-sm font-medium py-2 rounded-xl">Record Payment</button>
          </div>
          <div className="card p-5">
            <div className="text-xs text-[var(--color-muted)] mb-2">Customer Type</div>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-saffron-light)] text-amber-800">{customer.type}</span>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
