export function inr(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

export const statusColors = {
  Placed: "bg-gray-100 text-gray-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Packing: "bg-amber-100 text-amber-800",
  "Out for Delivery": "bg-[var(--color-indigo-light)] text-[var(--color-indigo)]",
  Delivered: "bg-[var(--color-trust-light)] text-[var(--color-trust)]",
  Cancelled: "bg-red-100 text-red-700",
};
