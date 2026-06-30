import { statusColors } from "../lib/format";

export default function StatusChip({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
