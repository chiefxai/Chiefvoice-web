import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PhoneCall,
  Activity,
  CheckCircle,
  Lightbulb,
  DollarSign,
  UserCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Lead, Loan, Campaign, CallLog, OrganizationSettings } from '../types';

interface DashboardViewProps {
  leads: Lead[];
  loans: Loan[];
  campaigns: Campaign[];
  callLogs: CallLog[];
  orgSettings: OrganizationSettings;
}

// Sample charting data
const portfolioTrendData = [
  { month: 'Jan', portfolio: 420000, revenue: 31000 },
  { month: 'Feb', portfolio: 510000, revenue: 39000 },
  { month: 'Mar', portfolio: 640000, revenue: 47000 },
  { month: 'Apr', portfolio: 820000, revenue: 59000 },
  { month: 'May', portfolio: 950000, revenue: 71000 },
  { month: 'Jun', portfolio: 1120000, revenue: 84000 },
  { month: 'Jul', portfolio: 1380000, revenue: 104000 }
];

const callingChannelPerformance = [
  { name: 'Direct Mail', Outbound: 120, Connected: 80, Qualified: 35 },
  { name: 'Facebook Ads', Outbound: 250, Connected: 190, Qualified: 110 },
  { name: 'Website Form', Outbound: 310, Connected: 285, Qualified: 215 },
  { name: 'Partner Refs', Outbound: 85, Connected: 80, Qualified: 68 }
];

export default function DashboardView({
  leads,
  loans,
  campaigns,
  callLogs,
  orgSettings
}: DashboardViewProps) {
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);

  // Compute live KPIs
  const totalLeadsCount = leads.length;
  const activeLoans = loans.filter((l) => l.status !== 'Completed' && l.status !== 'Lead');
  const outstandingPortfolio = loans.reduce((sum, current) => sum + current.amount, 0);

  const totalCampaignLeads = campaigns.reduce((sum, c) => sum + c.totalLeads, 0);
  const totalCampaignCalled = campaigns.reduce((sum, c) => sum + c.calledLeads, 0);
  const totalCampaignSuccess = campaigns.reduce((sum, c) => sum + c.successfulCalls, 0);
  const aiConversionRate = totalCampaignCalled > 0
    ? Math.round((totalCampaignSuccess / totalCampaignCalled) * 100)
    : 0;

  // Retrieve AI Insights from full-stack backend
  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    setInsights('');
    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, loans, campaigns, platformMode: 'loan' })
      });
      const data = await res.json();
      if (data.success) {
        setInsights(data.insights);
      } else {
        setInsights('Could not generate insights at this moment.');
      }
    } catch (err: any) {
      console.error(err);
      setInsights('Simulation Server Offline: Defaulting to standard credit metrics.');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, [leads.length, loans.length]);

  return (
    <div id="executive-desk" className="p-8 space-y-8 overflow-y-auto h-screen w-full font-sans bg-slate-50/50">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900">
            Executive Strategic Desk
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time credit health, portfolio metrics, and automated dialing conversion stats.
          </p>
        </div>
        <button
          onClick={fetchAIInsights}
          disabled={loadingInsights}
          className="flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingInsights ? 'animate-spin' : ''}`} />
          Refresh AI Model
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-12">
        {/* Active Lead Metrics - Bento Stat 1 */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
              <UserCheck className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">+12.5%</span>
          </div>
          <div className="mt-4">
            <p className="text-slate-500 text-sm font-medium">
              Active Loan Leads
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-800 mt-1">{totalLeadsCount}</h3>
          </div>
        </div>

        {/* AI Calling Efficiency - Bento Stat 2 */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <PhoneCall className="h-5 w-5" />
            </div>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Peak Live</span>
          </div>
          <div className="mt-4">
            <p className="text-slate-500 text-sm font-medium">AI Call Conversion</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-800 mt-1">{aiConversionRate}%</h3>
          </div>
        </div>

        {/* Portfolio Outstanding - Bento Stat 3 */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Active</span>
          </div>
          <div className="mt-4">
            <p className="text-slate-500 text-sm font-medium">
              Outstanding Portfolio
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-800 mt-1">
              ${(outstandingPortfolio / 1000).toFixed(0)}k
            </h3>
          </div>
        </div>

        {/* AI Usage Limit Card - Bento Stat 4 */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
              {Math.max(0, Math.round((new Date(orgSettings.billingPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d Left
            </span>
          </div>
          <div className="mt-4 w-full">
            <p className="text-slate-500 text-sm font-medium">AI Voice Budget</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {orgSettings.aiMinutesUsed} <span className="text-xs font-normal text-slate-400">/ {orgSettings.aiMinutesLimit} min</span>
            </h3>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${(orgSettings.aiMinutesUsed / orgSettings.aiMinutesLimit) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Compound Portfolio Growth Chart - Bento Large Card 1 */}
        <div className="lg:col-span-6 col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="mb-4">
            <h4 className="text-md font-bold text-slate-800 font-display">
              Compound Portfolio Growth & Profit Yield
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Historic quarterly origination size matching collection revenues.
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff' }} />
                <Area type="monotone" dataKey="portfolio" name="Origination Portfolio" stroke="#2563eb" fillOpacity={1} fill="url(#colorPortfolio)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="revenue" name="Monthly Yield" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Channel Call Connection Metrics Chart - Bento Large Card 2 */}
        <div className="lg:col-span-6 col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="mb-4">
            <h4 className="text-md font-bold text-slate-800 font-display">Lead Channel Call Connection Metrics</h4>
            <p className="text-xs text-slate-400 mt-1">Success funnel of outbound calls matched to customer qualification.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callingChannelPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff' }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Outbound" name="Outbound Calls" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Connected" name="Connected calls" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Qualified" name="AI Qualified Leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gemini Strategic Advisory Desk (Styled exactly like Bento AI Calling Monitor) */}
        <div className="lg:col-span-12 col-span-12 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          {/* Background Gradient Glowing Ball */}
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-100 font-display">Gemini Strategic Advisory Engine</h4>
                <p className="text-slate-400 text-xs">
                  Real-time AI portfolio analysis generated dynamically based on active CRM pipeline leads
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-medium text-emerald-400">Advisor Online</span>
              </div>
            </div>

            {loadingInsights ? (
              <div className="space-y-3 py-4">
                <div className="h-4 bg-slate-800 rounded-md animate-pulse w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded-md animate-pulse w-5/6"></div>
                <div className="h-4 bg-slate-800 rounded-md animate-pulse w-1/2"></div>
              </div>
            ) : (
              <div className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-white/5 p-5 rounded-xl border border-white/5 font-mono text-xs">
                {insights || 'Strategic advice database is empty. Click "Refresh AI Model" to prompt the advisor.'}
              </div>
            )}

            {/* Simulated Live Calling Metrics integrated inside Bento card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/5">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Simulated Streams</p>
                <p className="text-lg font-bold text-slate-100 mt-1">{leads.length > 0 ? Math.min(leads.length * 3 + 12, 142) : 0} Concurrent</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Average Sentiment</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">Positive (88%)</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Execution Mode</p>
                <p className="text-lg font-bold text-blue-400 truncate mt-1">
                  Maximize Outbound
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
