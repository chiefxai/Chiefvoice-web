import PageHeader from "../components/PageHeader";

export default function Broadcast() {
  return (
    <div>
      <PageHeader title="WhatsApp Broadcast / Campaigns" subtitle="Send offers and updates to customer segments (opt-in only)" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)]">Audience</label>
            <select className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm">
              <option>All Customers (212)</option>
              <option>Wholesale Only (34)</option>
              <option>Inactive 30+ days (58)</option>
              <option>K.K. Nagar locality (41)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)]">Template</label>
            <select className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm">
              <option>Festival Greeting — Pongal Offer</option>
              <option>New Stock Arrival</option>
              <option>Weekend Bulk Discount</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)]">Schedule</label>
            <input type="datetime-local" className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" />
          </div>
          <button className="bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl">Schedule Broadcast</button>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Preview</h3>
          <div className="bg-[#E5F5EC] rounded-2xl p-4">
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm">
              <div className="font-semibold mb-1">🪔 Sri Lakshmi Stores</div>
              <p>Pongal vaazhthukkal! Get 10% off on Ponni Rice, Sugar & Oil this week only. Reply ORDER to talk to our AI assistant.</p>
              <div className="text-[10px] text-[var(--color-muted)] mt-2">10:30 AM ✓✓</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Campaign History</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="py-2 font-medium">Campaign</th>
                <th className="py-2 font-medium">Sent</th>
                <th className="py-2 font-medium">Delivered</th>
                <th className="py-2 font-medium">Read</th>
                <th className="py-2 font-medium">Orders Generated</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-border)]"><td className="py-2.5">Diwali Sweets Offer</td><td className="py-2.5">212</td><td className="py-2.5">204</td><td className="py-2.5">168</td><td className="py-2.5 text-[var(--color-trust)] font-medium">31</td></tr>
              <tr><td className="py-2.5">New Stock — Idli Rice</td><td className="py-2.5">189</td><td className="py-2.5">181</td><td className="py-2.5">140</td><td className="py-2.5 text-[var(--color-trust)] font-medium">19</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
