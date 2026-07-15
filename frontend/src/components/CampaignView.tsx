import React, { useState } from 'react';
import {
  Briefcase,
  Play,
  Pause,
  Plus,
  BarChart,
  GitBranch,
  RefreshCw,
  FolderPlus,
  Clock,
  ArrowRight,
  Activity,
  CheckCircle,
  X
} from 'lucide-react';
import { Campaign, CampaignStatus, Workflow } from '../types';

interface CampaignViewProps {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  workflows: Workflow[];
  totalLeadsCount: number;
}

export default function CampaignView({
  campaigns,
  setCampaigns,
  workflows,
  totalLeadsCount
}: CampaignViewProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(campaigns[0] || null);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'Dialer Engine initialized on Outbound Line VN-401.',
    'Assigned Workflow: "Instant Personal Loan Qualifier".',
    'Batch of 32 leads queued.',
    'Running automatic call distribution (ACD)...'
  ]);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0]?.id || '');
  const [targetLeadsCount, setTargetLeadsCount] = useState('25');

  // Launch a new campaign
  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName) return;

    const launched: Campaign = {
      id: `C-00${campaigns.length + 1}`,
      name: campaignName,
      status: 'Running',
      workflowId: selectedWorkflow,
      totalLeads: parseInt(targetLeadsCount),
      calledLeads: 0,
      successfulCalls: 0,
      createdAt: new Date().toISOString()
    };

    setCampaigns([...campaigns, launched]);
    setSelectedCampaign(launched);
    setIsLaunchModalOpen(false);
    // Reset form
    setCampaignName('');

    // Trigger simulation log
    setLogs([
      `Dialer initiated for Campaign: "${campaignName}".`,
      `Loading rules from visual workflow...`,
      `Dialing pool containing ${targetLeadsCount} active CRM leads.`,
      `Active voice channel status: POOL RUNNING.`
    ]);
  };

  // State controls (Play / Pause / Complete)
  const handleToggleStatus = (campId: string, currentStatus: CampaignStatus) => {
    let nextStatus: CampaignStatus = 'Running';
    if (currentStatus === 'Running') nextStatus = 'Paused';
    else if (currentStatus === 'Paused') nextStatus = 'Running';

    const updated = campaigns.map((c) => {
      if (c.id === campId) {
        return { ...c, status: nextStatus };
      }
      return c;
    });

    setCampaigns(updated);
    const updatedCampaignObj = updated.find((c) => c.id === campId);
    if (updatedCampaignObj) {
      setSelectedCampaign(updatedCampaignObj);
      setLogs((prev) => [
        `Campaign status updated manually to [${nextStatus}].`,
        ...prev
      ]);
    }
  };

  const handleSimulateDialAction = () => {
    if (!selectedCampaign || selectedCampaign.status !== 'Running') {
      alert('Campaign is not in RUNNING status.');
      return;
    }

    // Advance campaign metrics
    const updated = campaigns.map((c) => {
      if (c.id === selectedCampaign.id) {
        const nextCalled = Math.min(c.totalLeads, c.calledLeads + 1);
        const nextSuccess = nextCalled > c.calledLeads && Math.random() > 0.4
          ? c.successfulCalls + 1
          : c.successfulCalls;
        return {
          ...c,
          calledLeads: nextCalled,
          successfulCalls: nextSuccess
        };
      }
      return c;
    });

    setCampaigns(updated);
    const updatedCampObj = updated.find((c) => c.id === selectedCampaign.id);
    if (updatedCampObj) {
      setSelectedCampaign(updatedCampObj);
      const isSuccess = updatedCampObj.successfulCalls > selectedCampaign.successfulCalls;
      const dialLog = `AI outbound dialer dispatched call. ${
        isSuccess
          ? '🎉 Customer connected! AI analyzed INTENT as "Interested" and successfully routed lead.'
          : '⚠️ Dial unanswered. Customer busy/voicemail. Re-queued.'
      }`;
      setLogs((prev) => [dialLog, ...prev]);
    }
  };

  return (
    <div id="campaign-launcher-dock" className="p-8 space-y-6 overflow-y-auto h-screen w-full font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900">AI Campaign Outbound Dock</h2>
          <p className="text-sm text-slate-500 mt-1">Initialize automated call-center loops, track live connection funnels, and trigger dialers.</p>
        </div>
        <button
          onClick={() => setIsLaunchModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
        >
          <FolderPlus className="h-4.5 w-4.5 mr-1.5" />
          Launch AI Campaign
        </button>
      </div>

      {/* Campaigns list & Telemetry split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Campaign list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 font-display">Active Campaigns Portfolio</h4>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total: {campaigns.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {campaigns.map((camp) => {
                const isActive = selectedCampaign?.id === camp.id;
                const progressPercent = camp.totalLeads > 0
                  ? Math.round((camp.calledLeads / camp.totalLeads) * 100)
                  : 0;
                return (
                  <div
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaign(camp);
                      setLogs([
                        `Viewing campaign details: "${camp.name}".`,
                        `Workflow Ruleset: W-001 Ready.`,
                        `Currently mapped progress: ${progressPercent}% complete.`
                      ]);
                    }}
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${
                      isActive ? 'bg-blue-50/40 border-l-4 border-blue-600' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-bold text-slate-800 font-display">{camp.name}</h5>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            camp.status === 'Running'
                              ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                              : camp.status === 'Completed'
                              ? 'bg-blue-50 text-blue-700'
                              : camp.status === 'Paused'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" /> Opened {new Date(camp.createdAt).toLocaleDateString()}
                        </span>
                        <span>Leads pool: {camp.totalLeads}</span>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="flex items-center space-x-6 shrink-0">
                      <div className="text-right space-y-1">
                        <span className="text-xs text-slate-400">Connect rate:</span>
                        <p className="text-xs font-bold text-slate-700">
                          {camp.calledLeads > 0 ? Math.round((camp.successfulCalls / camp.calledLeads) * 100) : 0}% ({camp.successfulCalls} / {camp.calledLeads})
                        </p>
                      </div>

                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(camp.id, camp.status)}
                          className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800"
                        >
                          {camp.status === 'Running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Telemetry logs & dials panel */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 shadow-xl flex flex-col h-full min-h-[50vh] text-white">
          {selectedCampaign ? (
            <div className="space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-900 pb-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">Live Campaign Logs</span>
                    <h4 className="text-xs font-bold text-slate-100 truncate max-w-[180px]">{selectedCampaign.name}</h4>
                  </div>
                  {selectedCampaign.status === 'Running' && (
                    <button
                      onClick={handleSimulateDialAction}
                      className="flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] rounded-md transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Simulate Dial
                    </button>
                  )}
                </div>

                {/* Micro Stats */}
                <div className="grid grid-cols-3 gap-2 py-2">
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Dials</span>
                    <strong className="text-sm font-bold text-white font-mono">{selectedCampaign.calledLeads}</strong>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Answers</span>
                    <strong className="text-sm font-bold text-emerald-400 font-mono">{selectedCampaign.successfulCalls}</strong>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Pool size</span>
                    <strong className="text-sm font-bold text-slate-300 font-mono">{selectedCampaign.totalLeads}</strong>
                  </div>
                </div>

                {/* Logs Feed */}
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[10px] text-slate-400 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5 leading-relaxed border-b border-slate-900 pb-1.5 last:border-b-0">
                      <span className="text-blue-500 select-none">▶</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center">
                  <Activity className="h-3.5 w-3.5 mr-1 text-emerald-500 animate-pulse" /> Status: {selectedCampaign.status}
                </span>
                <span>ID: {selectedCampaign.id}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center my-auto">Select any active campaign on the left to monitor outbound telemetry logs.</p>
          )}
        </div>
      </div>

      {/* Launch Campaign Modal */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-800 font-display">Launch Outbound AI Campaign</h3>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLaunchCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campaign Identifier</label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Q3 Commercial Real-Estate Callbacks"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Map Visual Workflow</label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none"
                >
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Leads Size</label>
                <input
                  type="number"
                  value={targetLeadsCount}
                  onChange={(e) => setTargetLeadsCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Limits dialer to target pool. Mapped against existing {totalLeadsCount} leads.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition-all mt-4 cursor-pointer"
              >
                Initialize Dialer Port
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
