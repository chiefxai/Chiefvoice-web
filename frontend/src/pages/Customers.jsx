import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { customers as mockCustomers } from "../lib/mockData";
import { inr } from "../lib/format";

const API_BASE = window.location.origin;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locality, setLocality] = useState("");
  const [type, setType] = useState("Retail");

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/customers`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCustomers(data);
      } else {
        setCustomers(mockCustomers);
      }
    } catch (err) {
      console.warn("Using mock customers due to fetch error:", err.message);
      setCustomers(mockCustomers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, locality, type, ltv: 0, khata: 0 })
      });
      const newCust = await res.json();
      setCustomers(prev => [newCust, ...prev]);
      
      // Reset form
      setName("");
      setPhone("");
      setLocality("");
      setType("Retail");
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save customer: " + err.message);
    }
  };

  const filtered = customers.filter((c) => 
    c.name.toLowerCase().includes(q.toLowerCase()) || 
    c.locality.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q)
  );

  return (
    <div>
      <PageHeader 
        title="Customers" 
        subtitle="Everyone who has called, WhatsApp'd, or ordered from the shop"
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Plus size={16} /> Add Customer
          </button>
        }
      />
      <div className="px-8">
        <div className="relative max-w-sm mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, or locality"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:border-[var(--color-trust)]"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-[var(--color-muted)]">Loading customers...</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Locality</th>
                  <th className="px-4 py-3 font-medium">Lifetime Value</th>
                  <th className="px-4 py-3 font-medium">Khata Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c.id}`} className="font-medium text-[var(--color-indigo)]">{c.name}</Link>
                      <div className="text-xs text-[var(--color-muted)]">{c.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.type === "Wholesale" ? "bg-[var(--color-saffron-light)] text-amber-800" : "bg-gray-100 text-gray-700"}`}>{c.type}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{c.locality}</td>
                    <td className="px-4 py-3 font-medium">{inr(c.ltv)}</td>
                    <td className="px-4 py-3">{c.khata > 0 ? <span className="text-[var(--color-danger)] font-medium">{inr(c.khata)}</span> : <span className="text-[var(--color-muted)]">—</span>}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-muted)]">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="card w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="font-semibold text-lg text-[var(--color-ink)] mb-4">Add New Customer</h3>
            
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  placeholder="e.g. Britto Paul" 
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required
                  placeholder="e.g. +91 98765 43210" 
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Locality</label>
                <input 
                  type="text" 
                  value={locality} 
                  onChange={(e) => setLocality(e.target.value)} 
                  placeholder="e.g. Anna Nagar, Madurai" 
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Customer Type</label>
                <div className="flex gap-4 mt-1.5">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      value="Retail" 
                      checked={type === "Retail"} 
                      onChange={() => setType("Retail")}
                      className="accent-[var(--color-trust)]"
                    />
                    Retail
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      value="Wholesale" 
                      checked={type === "Wholesale"} 
                      onChange={() => setType("Wholesale")}
                      className="accent-[var(--color-trust)]"
                    />
                    Wholesale
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] border border-[var(--color-border)] rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-trust)] rounded-xl hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="h-8" />
    </div>
  );
}
