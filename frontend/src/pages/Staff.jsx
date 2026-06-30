import PageHeader from "../components/PageHeader";

const staff = [
  { name: "Murugan Pillai", role: "Owner", phone: "+91 98430 55621", perms: "Full access" },
  { name: "Rajesh Kumar", role: "Manager", phone: "+91 90471 22890", perms: "Edit prices, view recordings" },
  { name: "Vignesh M", role: "Packer", phone: "+91 87651 90034", perms: "Order packing only" },
  { name: "Karthik S", role: "Delivery", phone: "+91 90474 11220", perms: "Delivery app only" },
];

export default function Staff() {
  return (
    <div>
      <PageHeader title="Staff & Roles" subtitle="Manage who can access what across the shop's account" />
      <div className="px-8 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.name} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3"><span className="text-xs bg-[var(--color-indigo-light)] text-[var(--color-indigo)] px-2 py-0.5 rounded-full">{s.role}</span></td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.phone}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{s.perms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-8 mt-4">
        <button className="bg-[var(--color-trust)] text-white text-sm font-medium px-4 py-2.5 rounded-xl">+ Invite Staff via Phone</button>
      </div>
      <div className="h-8" />
    </div>
  );
}
