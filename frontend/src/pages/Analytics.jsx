import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import PageHeader from "../components/PageHeader";
import { analytics } from "../lib/mockData";
import { inr } from "../lib/format";

const COLORS = ["#16A34A", "#5B5BD6", "#F59E0B"];

export default function Analytics() {
  return (
    <div>
      <PageHeader title="Analytics Dashboard" subtitle="Revenue, channel performance, and AI effectiveness" />
      <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Revenue Trend (this week)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.revenueTrend}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => inr(v)} />
              <Line type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Order Source</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={analytics.sourceBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {analytics.sourceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 text-xs mt-1">
            {analytics.sourceBreakdown.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />{s.name}</span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-[15px] mb-3">Top-Selling Products</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.topProducts} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="qty" fill="#5B5BD6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-[15px]">AI Effectiveness</h3>
          <div className="flex justify-between text-sm"><span className="text-[var(--color-muted)]">Call success rate</span><span className="font-semibold">{analytics.callSuccessRate}%</span></div>
          <div className="flex justify-between text-sm"><span className="text-[var(--color-muted)]">Avg order value</span><span className="font-semibold">{inr(analytics.avgOrderValue)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-[var(--color-muted)]">Repeat order rate</span><span className="font-semibold">{analytics.repeatRate}%</span></div>
          <div className="flex justify-between text-sm"><span className="text-[var(--color-muted)]">Peak call hour</span><span className="font-semibold">6 – 8 PM</span></div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
