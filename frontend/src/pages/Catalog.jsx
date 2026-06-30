import { useState, useEffect } from "react";
import { Plus, Search, AlertTriangle, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { products as initialProducts } from "../lib/mockData";
import { inr } from "../lib/format";

const API_BASE = window.location.origin;

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/catalog`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
        setProducts(initialProducts);
      }
    } catch (err) {
      console.warn("Using mock catalog due to fetch error:", err.message);
      setProducts(initialProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || !stock) return;

    try {
      const res = await fetch(`${API_BASE}/api/catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `P-${Date.now().toString().slice(-4)}`,
          name,
          brand,
          unit,
          price: Number(price),
          stock: Number(stock),
          category: "Grocery"
        })
      });
      const newProd = await res.json();
      setProducts(prev => [...prev, newProd]);
      
      // Reset form
      setName("");
      setBrand("");
      setUnit("kg");
      setPrice("");
      setStock("");
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save product: " + err.message);
    }
  };

  const filtered = products.filter((p) => 
    p.name.toLowerCase().includes(q.toLowerCase()) || 
    (p.brand && p.brand.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="Catalog / Inventory"
        subtitle="Products the AI matches against during calls — keep stock accurate to avoid overselling"
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        }
      />
      <div className="px-8">
        <div className="relative max-w-sm mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white outline-none focus:border-[var(--color-trust)]"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-[var(--color-muted)]">Loading catalog...</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-[var(--color-muted)]">{p.brand || "Local"}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{p.category || "Grocery"}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{p.unit}</td>
                    <td className="px-4 py-3 font-medium">{inr(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={p.stock < 15 ? "text-[var(--color-danger)] font-medium flex items-center gap-1" : ""}>
                        {p.stock < 15 && <AlertTriangle size={13} />}
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-[var(--color-indigo)] font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-muted)]">No products found.</td>
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
            <h3 className="font-semibold text-lg text-[var(--color-ink)] mb-4">Add New Product</h3>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Product Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  placeholder="e.g. Toor Dal" 
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Brand</label>
                <input 
                  type="text" 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  placeholder="e.g. Tata Sampann" 
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Unit</label>
                  <select 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)} 
                    className="w-full px-2 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="packet">packet</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    required
                    placeholder="50" 
                    className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-[var(--color-muted)] block mb-1">Stock</label>
                  <input 
                    type="number" 
                    value={stock} 
                    onChange={(e) => setStock(e.target.value)} 
                    required
                    placeholder="100" 
                    className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-trust)] bg-white"
                  />
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
                  Save Product
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
