import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  User,
  Phone,
  Mail,
  DollarSign,
  Tag,
  AlertCircle,
  FileText,
  Calendar,
  Play,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  Clock,
  ThumbsUp,
  X
} from 'lucide-react';
import { Lead, CallLog, TeamMember } from '../types';

interface LeadManagementViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  callLogs: CallLog[];
  teamMembers: TeamMember[];
}

export default function LeadManagementView({
  leads,
  setLeads,
  callLogs,
  teamMembers
}: LeadManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScoringLoading, setIsScoringLoading] = useState(false);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);

  // New Lead Form state
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadAmount, setNewLeadAmount] = useState('20000');
  const [newLeadSource, setNewLeadSource] = useState('Website Form');
  const [newLeadEmployer, setNewLeadEmployer] = useState('');
  const [newLeadIncome, setNewLeadIncome] = useState('5000');
  const [newLeadCredit, setNewLeadCredit] = useState('700');
  const [newLeadDti, setNewLeadDti] = useState('0.30');

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Handle lead creation
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone || !newLeadEmail) return;

    const added: Lead = {
      id: `L-${100 + leads.length + 1}`,
      name: newLeadName,
      phone: newLeadPhone,
      email: newLeadEmail,
      amountRequested: parseFloat(newLeadAmount),
      score: 0, // initially unscored
      source: newLeadSource,
      status: 'New',
      tags: ['Unassigned'],
      createdAt: new Date().toISOString(),
      notes: 'Manually added to CRM.',
      financialInfo: {
        employer: newLeadEmployer || 'Self-Employed',
        monthlyIncome: parseFloat(newLeadIncome),
        creditScore: parseInt(newLeadCredit),
        debtToIncome: parseFloat(newLeadDti)
      }
    };

    setLeads([added, ...leads]);
    setIsAddModalOpen(false);
    // Reset form
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadEmail('');
    setNewLeadEmployer('');
  };

  // Automated CSV Import Simulator
  const handleCSVImportSimulate = () => {
    const importedLeads: Lead[] = [
      {
        id: `L-${100 + leads.length + 1}`,
        name: 'Gavin Belson',
        phone: '+1 (555) 011-2290',
        email: 'gavin@hooli.xyz',
        amountRequested: 500000,
        score: 99,
        source: 'CSV Upload',
        status: 'New',
        tags: ['Jumbo Loan', 'Tech Exec'],
        createdAt: new Date().toISOString(),
        notes: 'Inported via CSV batch underwriting request.',
        financialInfo: {
          monthlyIncome: 45000,
          creditScore: 825,
          employer: 'Hooli Systems',
          debtToIncome: 0.05
        }
      },
      {
        id: `L-${100 + leads.length + 2}`,
        name: 'Richard Hendricks',
        phone: '+1 (555) 012-4411',
        email: 'richard@piedpiper.io',
        amountRequested: 20000,
        score: 65,
        source: 'CSV Upload',
        status: 'New',
        tags: ['Self-Employed'],
        createdAt: new Date().toISOString(),
        notes: 'Requested debt consolidation for startup runway.',
        financialInfo: {
          monthlyIncome: 3500,
          creditScore: 660,
          employer: 'Pied Piper Corp',
          debtToIncome: 0.40
        }
      }
    ];

    setLeads([...importedLeads, ...leads]);
    alert(
      'Successfully parsed and imported 2 new leads from batch loan file (Gavin Belson, Richard Hendricks).'
    );
  };

  // Run dynamic Gemini AI Lead Scorer
  const triggerAILeadScoring = async (lead: Lead) => {
    setIsScoringLoading(true);
    try {
      const res = await fetch('/api/gemini/score-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead })
      });
      const data = await res.json();
      if (data.success) {
        // Update state
        const updatedLeads = leads.map((l) => {
          if (l.id === lead.id) {
            return {
              ...l,
              score: data.score,
              tags: data.tags,
              notes: `${data.decision}\n\nNotes: ${l.notes}`
            };
          }
          return l;
        });
        setLeads(updatedLeads);
        // Sync open lead modal
        setSelectedLead({
          ...lead,
          score: data.score,
          tags: data.tags,
          notes: `${data.decision}\n\nNotes: ${lead.notes}`
        });
      }
    } catch (err) {
      console.error(err);
      alert('Simulation offline: Defaulted to standard algorithms.');
    } finally {
      setIsScoringLoading(false);
    }
  };

  // Lead Assign helper
  const handleAssignLead = (leadId: string, agentId: string) => {
    const agent = teamMembers.find((t) => t.id === agentId);
    if (!agent) return;

    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          tags: [...l.tags.filter((t) => t !== 'Unassigned'), `Assigned: ${agent.name}`]
        };
      }
      return l;
    });
    setLeads(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        tags: [...selectedLead.tags.filter((t) => t !== 'Unassigned'), `Assigned: ${agent.name}`]
      });
    }
  };

  const selectedLeadCallLogs = callLogs.filter((c) => c.leadId === selectedLead?.id);

  return (
    <div id="lead-dashboard" className="p-8 space-y-6 overflow-y-auto h-screen w-full font-sans">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-800">
            Lead Portfolio CRM
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Audit inbound leads, run automated credit underwriting assessments, and distribute tasks.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleCSVImportSimulate}
            className="flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-2" />
            Batch Import (CSV)
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Originate Lead
          </button>
        </div>
      </div>

      {/* Searching & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Qualified">Qualified</option>
            <option value="Unqualified">Unqualified</option>
            <option value="Converted">Converted</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="All">All Channels</option>
            <option value="Website Form">Website Form</option>
            <option value="Facebook Ads">Facebook Ads</option>
            <option value="Direct Mail">Direct Mail</option>
            <option value="Google Search">Google Search</option>
            <option value="Partner Referral">Partner Referral</option>
            <option value="CSV Upload">CSV Upload</option>
          </select>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Lead Profile</th>
                <th className="py-4 px-6">Requested Amt</th>
                <th className="py-4 px-6">Inbound Origin</th>
                <th className="py-4 px-6">AI Underwriting</th>
                <th className="py-4 px-6">CRM Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredLeads.map((lead) => {
                const isUnassigned = lead.tags.includes('Unassigned');
                return (
                  <tr
                    key={lead.id}
                    id={`lead-row-${lead.id}`}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                          {lead.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{lead.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      ${lead.amountRequested.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-500 font-medium">{lead.source}</span>
                    </td>
                    <td className="py-4 px-6">
                      {lead.score > 0 ? (
                        <div className="flex items-center space-x-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              lead.score >= 80
                                ? 'bg-emerald-500'
                                : lead.score >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          ></div>
                          <span className="font-bold text-slate-800">{lead.score} / 100</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          Unscored
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          lead.status === 'Qualified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : lead.status === 'In Progress'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : lead.status === 'New'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        {isUnassigned ? (
                          <select
                            onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-xs text-slate-600 rounded px-2 py-1 focus:outline-none"
                            defaultValue=""
                          >
                            <option value="" disabled>Assign...</option>
                            {teamMembers.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100">
                            {lead.tags.find((t) => t.startsWith('Assigned:')) || 'Assigned'}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for Lead Details */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold font-display">
                  {selectedLead.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedLead.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Lead ID: {selectedLead.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLead(null);
                  setSelectedCallLog(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Score Underwriter Panel */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-900 flex items-center justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center">
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> AI Automated Underwriting
                  </span>
                  <h4 className="text-md font-semibold font-display text-indigo-100">Credit Qualification Matrix</h4>
                  <p className="text-xs text-slate-400">Evaluate risk metrics dynamically utilizing Gemini analysis proxy.</p>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  {selectedLead.score > 0 ? (
                    <div className="text-center">
                      <span className="text-3xl font-extrabold font-display text-emerald-400">{selectedLead.score}</span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerAILeadScoring(selectedLead)}
                      disabled={isScoringLoading}
                      className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      {isScoringLoading ? 'Evaluating...' : 'Run AI Underwriting'}
                    </button>
                  )}
                </div>
              </div>

              {/* Profiles & Financial Data */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Profile Cards</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center text-xs text-slate-600">
                      <Phone className="h-4 w-4 mr-2.5 text-slate-400" />
                      <span>{selectedLead.phone}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Mail className="absolute inline h-4 w-4 text-slate-400 mr-2.5" />
                      <span className="pl-6">{selectedLead.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                      <Calendar className="h-4 w-4 mr-2.5 text-slate-400" />
                      <span>Inbound since {new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Financial Disclosures</h4>
                  {selectedLead.financialInfo ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Employer:</span>
                        <strong className="text-slate-700">{selectedLead.financialInfo.employer}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Income:</span>
                        <strong className="text-slate-700">${selectedLead.financialInfo.monthlyIncome.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Credit Score:</span>
                        <strong className="text-slate-700">{selectedLead.financialInfo.creditScore}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Debt-To-Income (DTI):</span>
                        <strong className="text-slate-700">{(selectedLead.financialInfo.debtToIncome * 100).toFixed(0)}%</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No financial details declared.</p>
                  )}
                </div>
              </div>

              {/* Tags panel */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Classifications</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLead.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timeline Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Underwriting Audit Logs</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedLead.notes}
                </div>
              </div>

              {/* Communication Logs playbox */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Simulated Outbound Voice Transcript</h4>
                {selectedLeadCallLogs.length > 0 ? (
                  <div className="space-y-4">
                    {/* Call list select */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedLeadCallLogs.map((log) => (
                        <button
                          key={log.id}
                          onClick={() => setSelectedCallLog(log)}
                          className={`p-3 rounded-xl text-left border transition-all ${
                            selectedCallLog?.id === log.id
                              ? 'border-indigo-600 bg-indigo-50/20'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{log.id}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                log.sentiment === 'Positive'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {log.sentiment}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{log.summary}</p>
                        </button>
                      ))}
                    </div>

                    {/* Active call details */}
                    {selectedCallLog && (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        {/* Summary Block */}
                        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center">
                              <ThumbsUp className="h-3.5 w-3.5 mr-1 text-indigo-500" /> Sentiment: {selectedCallLog.sentiment}
                            </span>
                            <span className="text-slate-400 flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1" /> {selectedCallLog.duration} seconds
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-normal"><strong className="text-slate-800">Brief:</strong> {selectedCallLog.summary}</p>
                        </div>

                        {/* Speech bubbles */}
                        <div className="p-4 space-y-4 max-h-64 overflow-y-auto bg-slate-950">
                          {selectedCallLog.transcript.map((line, idx) => {
                            const isAI = line.speaker === 'AI';
                            return (
                              <div
                                key={idx}
                                className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}
                              >
                                <span className="text-[9px] text-slate-500 font-mono mb-1">{line.speaker} • {line.timestamp}</span>
                                <div
                                  className={`rounded-2xl px-4 py-2 max-w-[80%] text-xs font-sans ${
                                    isAI
                                      ? 'bg-indigo-900 text-indigo-100 rounded-tl-none'
                                      : 'bg-slate-800 text-slate-200 rounded-tr-none'
                                  }`}
                                >
                                  {line.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No automated call history available. Navigate to 'Voice Simulator' to launch a dynamic test call.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-800 font-display">New Lead Entry Registration</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Richard Hendricks"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone (Primary)</label>
                  <input
                    type="text"
                    required
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="name@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Requested</label>
                  <input
                    type="number"
                    value={newLeadAmount}
                    onChange={(e) => setNewLeadAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inbound Channel</label>
                  <select
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Website Form">Website Form</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Direct Mail">Direct Mail</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Partner Referral">Partner Referral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Active Employer</label>
                  <input
                    type="text"
                    value={newLeadEmployer}
                    onChange={(e) => setNewLeadEmployer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Pied Piper Inc"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Wages ($)</label>
                  <input
                    type="number"
                    value={newLeadIncome}
                    onChange={(e) => setNewLeadIncome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Credit Score</label>
                  <input
                    type="number"
                    value={newLeadCredit}
                    onChange={(e) => setNewLeadCredit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Debt-To-Income Ratio</label>
                  <input
                    type="text"
                    value={newLeadDti}
                    onChange={(e) => setNewLeadDti(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition-all mt-4 cursor-pointer"
              >
                Register & Originate
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
