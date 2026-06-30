import { useState, useEffect } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, PhoneCall, MessageCircle, FileEdit } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import { orders as mockOrders } from "../lib/mockData";
import { inr } from "../lib/format";

const API_BASE = window.location.origin;
const timeline = ["Placed", "Confirmed", "Packing", "Out for Delivery", "Delivered"];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callLog, setCallLog] = useState(null);
  const { triggerCall, activeCall } = useOutletContext();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders`);
        const data = await res.json();
        const foundOrder = Array.isArray(data) ? data.find((o) => o.id === id) : null;
        
        if (foundOrder) {
          setOrder(foundOrder);
          // If this is an AI Call order, fetch calls to try and find the matching transcript
          if (foundOrder.source === "AI Call") {
            try {
              const callsRes = await fetch(`${API_BASE}/api/calls`);
              const callsData = await callsRes.json();
              // Match by caller phone number
              const matchedCall = Array.isArray(callsData) 
                ? callsData.find(c => c.caller_number === foundOrder.phone) 
                : null;
              if (matchedCall) {
                setCallLog(matchedCall);
              }
            } catch (callErr) {
              console.warn("Failed to fetch matching call transcript:", callErr.message);
            }
          }
        } else {
          // Fallback to mock
          const mo = mockOrders.find((o) => o.id === id) || mockOrders[0];
          setOrder(mo);
        }
      } catch (err) {
        console.warn("Using mock order detail due to fetch error:", err.message);
        const mo = mockOrders.find((o) => o.id === id) || mockOrders[0];
        setOrder(mo);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-sm text-[var(--color-muted)]">Loading order details...</div>;
  }

  if (!order) {
    return <div className="text-center py-12 text-sm text-red-500">Order not found</div>;
  }

  const stepIdx = timeline.indexOf(order.status);

  return (
    <div>
      <div className="px-8 pt-8">
        <Link to="/orders" className="text-sm text-[var(--color-muted)] flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Back to Orders
        </Link>
      </div>
      <PageHeader
        title={order.id}
        subtitle={`${order.customer || 'New Customer'} · ${order.phone}`}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerCall(order.phone)}
              disabled={!!activeCall}
              className="flex items-center gap-2 bg-[var(--color-indigo)] hover:opacity-90 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
            >
              <PhoneCall size={14} />
              {activeCall?.phone === order.phone ? 'Calling...' : 'Call'}
            </button>
            <StatusChip status={order.status} />
          </div>
        }
      />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-[15px] mb-4">Status Timeline</h3>
            <div className="flex items-center">
              {timeline.map((t, i) => (
                <div key={t} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    i <= stepIdx ? "bg-[var(--color-trust)] text-white" : "bg-gray-200 text-gray-500"
                  }`}>{i + 1}</div>
                  {i < timeline.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${i < stepIdx ? "bg-[var(--color-trust)]" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex text-[11px] text-[var(--color-muted)] mt-2 justify-between">
              {timeline.map((t) => <span key={t} className="w-7 text-center -ml-3">{t.split(" ")[0]}</span>)}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[15px]">Itemized Order</h3>
              <button className="text-xs text-[var(--color-indigo)] font-medium flex items-center gap-1">
                <FileEdit size={13} /> Correct Item
              </button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {order.items && order.items.map((it, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5">{it.n}</td>
                    <td className="py-2.5 text-[var(--color-muted)]">{it.q}</td>
                    <td className="py-2.5 text-right font-medium">{inr(it.p)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 font-semibold" colSpan={2}>Total</td>
                  <td className="py-3 text-right font-semibold">{inr(order.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {order.source === "AI Call" && (
            <div className="card p-5">
              <h3 className="font-semibold text-[15px] mb-3 flex items-center gap-2">
                <PhoneCall size={15} className="text-[var(--color-indigo)]" /> Call Transcript
              </h3>
              <div className="space-y-2 text-sm bg-[var(--color-bg)] rounded-xl p-4 max-h-72 overflow-y-auto whitespace-pre-line">
                {callLog && callLog.transcript ? (
                  callLog.transcript
                ) : (
                  <>
                    <p><span className="font-medium text-[var(--color-indigo)]">AI:</span> Vanakkam! Sri Lakshmi Stores la irundhu pesuren. Enna order pannanum?</p>
                    <p><span className="font-medium">Customer:</span> {order.items ? order.items.map(i => `${i.n} ${i.q}`).join(", ") : ""} venum.</p>
                    <p><span className="font-medium text-[var(--color-indigo)]">AI:</span> Sari, total {inr(order.total)} aagum. Confirm pannalama?</p>
                    <p><span className="font-medium">Customer:</span> Aama, confirm pannunga.</p>
                  </>
                )}
              </div>
              {callLog && callLog.recording_url && (
                <audio controls src={callLog.recording_url} className="w-full mt-3 h-9" />
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-[15px] mb-3">Delivery / Pickup</h3>
            <div className="text-sm text-[var(--color-muted)]">Mode</div>
            <div className="text-sm font-medium mb-2">{order.delivery}</div>
            <div className="text-sm text-[var(--color-muted)]">Source</div>
            <div className="text-sm font-medium">{order.source}</div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-[15px] mb-3 flex items-center gap-2">
              <MessageCircle size={15} className="text-[var(--color-trust)]" /> WhatsApp Status
            </h3>
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-[var(--color-muted)]">Confirmation</span><span>Delivered ✓✓</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted)]">Payment Link</span><span>Sent</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted)]">Payment Status</span><span className="text-[var(--color-trust)] font-medium">Paid</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
