import React, { useState } from 'react';
import {
  Settings,
  Phone,
  Users,
  CreditCard,
  Key,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  Clock,
  Shield,
  Activity,
  UserPlus,
  DollarSign,
  Briefcase,
  Sparkles,
  Sliders,
  Volume2,
  Check,
  CheckCircle as CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { VirtualNumber, TeamMember, OrganizationSettings, UserRole } from '../types';

interface SettingsViewProps {
  virtualNumbers: VirtualNumber[];
  setVirtualNumbers: React.Dispatch<React.SetStateAction<VirtualNumber[]>>;
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  orgSettings: OrganizationSettings;
  setOrgSettings: React.Dispatch<React.SetStateAction<OrganizationSettings>>;
}

const auditLogs = [
  { event: 'User MFA Authenticated', time: '2026-07-10T00:10:00Z', status: 'Success', actor: 'geminipro1447@gmail.com' },
  { event: 'API Key Generated: Gemini AI', time: '2026-07-09T18:32:00Z', status: 'Success', actor: 'Evelyn Shaw' },
  { event: 'Lead Assigned: Sarah Jenkins', time: '2026-07-09T11:45:00Z', status: 'Success', actor: 'AI Workflow' },
  { event: 'Subscription Upgraded: Growth', time: '2026-07-01T09:00:00Z', status: 'Success', actor: 'Billing Gateway' }
];

export default function SettingsView({
  virtualNumbers,
  setVirtualNumbers,
  teamMembers,
  setTeamMembers,
  orgSettings,
  setOrgSettings
}: SettingsViewProps) {
  const [subTab, setSubTab] = useState<'numbers' | 'team' | 'billing' | 'api' | 'speech'>('numbers');

  // AI Voice and Prompt Configuration states
  const [voicePersona, setVoicePersona] = useState<string>(() => {
    return localStorage.getItem('chiefx_voice_persona') || 'Priya — Female (friendly & clear)';
  });
  const [emotionIntensity, setEmotionIntensity] = useState<number>(() => {
    return Number(localStorage.getItem('chiefx_emotion_intensity') || '78');
  });
  const [speechSpeed, setSpeechSpeed] = useState<number>(() => {
    return Number(localStorage.getItem('chiefx_speech_speed') || '52');
  });
  const [friendliness, setFriendliness] = useState<number>(() => {
    return Number(localStorage.getItem('chiefx_friendliness') || '82');
  });
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('chiefx_system_prompt') || 
`You are a real human speaking out loud - not an AI, not reading a script.

========================================
CORE RULE - SPEAK THE VERBATIM FORM, NOT THE NORMALIZED FORM
========================================

Real Tamil speakers do not say the "correct" written form of a word. They contract it. This is the single most reliable, verified pattern in real Tamil speech data, and it holds no matter what the topic is or who the speaker is talking to. Apply it constantly...`;
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  const handleSaveConfig = () => {
    setIsConfigSaving(true);
    localStorage.setItem('chiefx_voice_persona', voicePersona);
    localStorage.setItem('chiefx_emotion_intensity', String(emotionIntensity));
    localStorage.setItem('chiefx_speech_speed', String(speechSpeed));
    localStorage.setItem('chiefx_friendliness', String(friendliness));
    localStorage.setItem('chiefx_system_prompt', systemPrompt);
    
    setTimeout(() => {
      setIsConfigSaving(false);
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
    }, 600);
  };

  // Virtual number states
  const [newNumVal, setNewNumVal] = useState('');
  const [newNumName, setNewNumName] = useState('');
  const [newNumProv, setNewNumProv] = useState<'Twilio' | 'Telnyx' | 'SIP Trunk'>('Twilio');

  // Team Member states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Loan Agent');

  // Purchase Number Simulator
  const handlePurchaseNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumVal || !newNumName) return;

    const added: VirtualNumber = {
      id: `VN-${400 + virtualNumbers.length + 1}`,
      number: newNumVal,
      provider: newNumProv,
      status: 'Active',
      friendlyName: newNumName,
      routingUrl: 'https://api.chiefxai.com/voice/webhook-dynamic',
      incomingCallCount: 0,
      outgoingCallCount: 0
    };

    setVirtualNumbers([...virtualNumbers, added]);
    setNewNumVal('');
    setNewNumName('');
  };

  // Delete virtual line
  const handleDeleteNumber = (numId: string) => {
    setVirtualNumbers(virtualNumbers.filter((n) => n.id !== numId));
  };

  // Add Staff Member
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;

    const added: TeamMember = {
      id: `T-${200 + teamMembers.length + 1}`,
      name: newStaffName,
      email: newStaffEmail,
      role: newStaffRole,
      status: 'Active',
      performanceScore: 90,
      assignedLeadsCount: 0
    };

    setTeamMembers([...teamMembers, added]);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  // Deactivate Staff member
  const handleToggleStaffStatus = (staffId: string) => {
    const updated = teamMembers.map((m) => {
      if (m.id === staffId) {
        return {
          ...m,
          status: m.status === 'Active' ? ('Inactive' as const) : ('Active' as const)
        };
      }
      return m;
    });
    setTeamMembers(updated);
  };

  // Plan Selection Upgrader
  const handleUpgradePlan = (plan: 'Starter' | 'Growth' | 'Enterprise') => {
    const limit = plan === 'Starter' ? 2000 : plan === 'Growth' ? 10000 : 50000;
    setOrgSettings({
      ...orgSettings,
      subscriptionPlan: plan,
      aiMinutesLimit: limit
    });
    alert(`Workspace plan updated to ${plan}. Voice calling minutes quota adjusted to ${limit.toLocaleString()} mins.`);
  };

  return (
    <div id="administration-settings-view" className="p-8 space-y-6 overflow-y-auto h-screen w-full font-sans">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-slate-800">Administration Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure virtual telephone lines, distribute agent permissions, audit invoice logs, and view security records.</p>
      </div>

      {/* Settings Rail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar Rail */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-1.5 self-start">
          <button
            onClick={() => setSubTab('numbers')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'numbers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Phone className="h-4 w-4 mr-3" /> Virtual Numbers
          </button>
          <button
            onClick={() => setSubTab('team')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'team' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4 mr-3" /> Staff & Teams
          </button>
          <button
            onClick={() => setSubTab('billing')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="h-4 w-4 mr-3" /> Billing & Usage
          </button>
          <button
            onClick={() => setSubTab('api')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'api' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Key className="h-4 w-4 mr-3" /> API Credentials
          </button>
          <button
            onClick={() => setSubTab('speech')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'speech' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="h-4 w-4 mr-3" /> AI Speech Config
          </button>
        </div>

        {/* Content Box */}
        <div className="lg:col-span-3 space-y-6">
          {/* Subtab: Virtual numbers */}
          {subTab === 'numbers' && (
            <div className="space-y-6">
              {/* Buy form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Provision Virtual Call-center Line</h4>
                  <p className="text-xs text-slate-400 mt-1">Register dedicated SIP trunks or Twilio endpoints to bridge live outbound campaigns.</p>
                </div>
                <form onSubmit={handlePurchaseNumber} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={newNumVal}
                    onChange={(e) => setNewNumVal(e.target.value)}
                    placeholder="+1 (800) 000-0000"
                    className="md:col-span-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={newNumName}
                    onChange={(e) => setNewNumName(e.target.value)}
                    placeholder="e.g. Inbound Main Helpdesk"
                    className="md:col-span-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <select
                    value={newNumProv}
                    onChange={(e: any) => setNewNumProv(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Twilio">Twilio</option>
                    <option value="Telnyx">Telnyx</option>
                    <option value="SIP Trunk">SIP Trunk</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Provision
                  </button>
                </form>
              </div>

              {/* Numbers list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="p-4 px-6">Telephone Number</th>
                      <th className="p-4 px-6">Gateway Provider</th>
                      <th className="p-4 px-6">Dial Load (In/Out)</th>
                      <th className="p-4 px-6 text-right">Channel Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {virtualNumbers.map((num) => (
                      <tr key={num.id} className="hover:bg-slate-50/40">
                        <td className="p-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-800">{num.number}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{num.friendlyName}</p>
                          </div>
                        </td>
                        <td className="p-4 px-6 font-mono text-xs">{num.provider}</td>
                        <td className="p-4 px-6 text-xs text-slate-500">
                          {num.incomingCallCount} Incoming / {num.outgoingCallCount} Outbound
                        </td>
                        <td className="p-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            <span className={`h-2.5 w-2.5 rounded-full ${num.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            <button
                              onClick={() => handleDeleteNumber(num.id)}
                              className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab: Team matrix */}
          {subTab === 'team' && (
            <div className="space-y-6">
              {/* Add staff form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Add Associate Team Member</h4>
                  <p className="text-xs text-slate-400 mt-1">Assign appropriate workflow role profiles and credit credentials to new staff.</p>
                </div>
                <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Full Name"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="name@chiefxai.com"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e: any) => setNewStaffRole(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Loan Agent">Loan Agent</option>
                    <option value="Collection Agent">Collection Agent</option>
                    <option value="AI Agent Manager">AI Agent Manager</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" /> Enlist Member
                  </button>
                </form>
              </div>

              {/* Team list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="p-4 px-6">Enlisted Representative</th>
                      <th className="p-4 px-6">Administrative Role</th>
                      <th className="p-4 px-6">Quality Rating</th>
                      <th className="p-4 px-6 text-right">CRM Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/40">
                        <td className="p-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-800">{member.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{member.email}</p>
                          </div>
                        </td>
                        <td className="p-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            {member.role}
                          </span>
                        </td>
                        <td className="p-4 px-6">
                          <span className="font-bold text-slate-700 font-mono">{member.performanceScore} / 100</span>
                        </td>
                        <td className="p-4 px-6 text-right">
                          <button
                            onClick={() => handleToggleStaffStatus(member.id)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              member.status === 'Active'
                                ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 border border-emerald-200 hover:border-rose-200'
                                : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200'
                            }`}
                          >
                            {member.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab: Billing info */}
          {subTab === 'billing' && (
            <div className="space-y-6">
              {/* Usage bar */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 font-display">Active Voice Budget Quota</h4>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Usage Cycle: June 15 - July 15</span>
                  <span>{Math.round((orgSettings.aiMinutesUsed / orgSettings.aiMinutesLimit) * 100)}% Consumed</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${(orgSettings.aiMinutesUsed / orgSettings.aiMinutesLimit) * 100}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Minutes Consumed</span>
                    <strong className="text-md text-slate-800 font-mono">{orgSettings.aiMinutesUsed}</strong>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Available Minutes</span>
                    <strong className="text-md text-slate-800 font-mono">{orgSettings.aiMinutesLimit - orgSettings.aiMinutesUsed}</strong>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Phone Charges</span>
                    <strong className="text-md text-slate-800 font-mono">${orgSettings.phoneCharges.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Subscriptions upgrade matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['Starter', 'Growth', 'Enterprise'] as const).map((plan) => {
                  const isCurrent = orgSettings.subscriptionPlan === plan;
                  return (
                    <div
                      key={plan}
                      className={`p-6 rounded-2xl border bg-white flex flex-col justify-between space-y-4 relative overflow-hidden ${
                        isCurrent ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-100'
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute -right-8 -top-2 bg-indigo-600 text-white font-semibold text-[8px] tracking-widest px-8 py-2 rotate-45 uppercase font-mono">
                          Active
                        </span>
                      )}
                      <div className="space-y-1">
                        <h5 className="text-sm font-bold text-slate-800 font-display">{plan} Subscription</h5>
                        <p className="text-[10px] text-slate-400">
                          {plan === 'Starter'
                            ? 'Best for emerging lenders'
                            : plan === 'Growth'
                            ? 'Scales AI campaign operations'
                            : 'Bespoke high-volume underwriting'}
                        </p>
                      </div>

                      <div className="text-slate-800 border-t border-slate-100 pt-3 flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">Monthly</span>
                        <strong className="text-xl font-bold font-display">
                          {plan === 'Starter' ? '$149' : plan === 'Growth' ? '$499' : 'Custom'}
                        </strong>
                      </div>

                      <button
                        onClick={() => handleUpgradePlan(plan)}
                        className={`w-full text-xs font-semibold py-2 rounded-xl border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Current Plan' : `Enlist ${plan}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtab: API details & Audit Logs */}
          {subTab === 'api' && (
            <div className="space-y-6">
              {/* Credentials */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Third-Party Gateway API Credentials</h4>
                  <p className="text-xs text-slate-400 mt-1">Configure active server tokens utilized by automated calling triggers and OCR engines.</p>
                </div>
                <div className="space-y-3.5">
                  {orgSettings.apiKeys.map((k, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-700">{k.service}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Last accessed {new Date(k.lastUsed).toLocaleString()}</p>
                      </div>
                      <strong className="font-mono text-slate-600">{k.key}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security audit logs */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 font-display flex items-center">
                    <Shield className="h-4.5 w-4.5 mr-2 text-indigo-500" /> Administrative Audit Trail
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Total events logged: {auditLogs.length}</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs text-slate-600 font-mono">
                  {auditLogs.map((log, idx) => (
                    <div key={idx} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/40">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-700">{log.event}</p>
                        <p className="text-[10px] text-slate-400">Actor: {log.actor}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          {log.status}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1">{new Date(log.time).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subtab: AI Speech Config */}
          {subTab === 'speech' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> AI Speech & Campaign Persona Configuration
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Control the synthetic speech parameters, custom language rules, emotion intensity, and global prompt behaviors.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Voice Parameters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-indigo-500" /> Synthetic Voice & Rhythm
                    </h5>
                  </div>

                  <div className="space-y-5 flex-1 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 block">
                        Voice Persona
                      </label>
                      <select
                        value={voicePersona}
                        onChange={(e) => setVoicePersona(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700 font-semibold"
                      >
                        <option value="Priya — Female (friendly & clear)">Priya — Female (friendly & clear)</option>
                        <option value="Arjun — Male (warm & expressive)">Arjun — Male (warm & expressive)</option>
                        <option value="Dev — Male (calm & professional)">Dev — Male (calm & professional)</option>
                        <option value="Kavya — Female (formal & polite)">Kavya — Female (formal & polite)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-500">
                          Emotion Intensity
                        </label>
                        <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-full">{emotionIntensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={emotionIntensity}
                        onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-500">
                          Speech Speed
                        </label>
                        <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-full">{speechSpeed}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={speechSpeed}
                        onChange={(e) => setSpeechSpeed(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-500">
                          Friendliness Index
                        </label>
                        <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-full">{friendliness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={friendliness}
                        onChange={(e) => setFriendliness(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* System Prompt Instructions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-indigo-500" /> Core AI Campaign Instructions
                    </h5>
                  </div>

                  <div className="flex-1 flex flex-col space-y-2">
                    <label className="text-xs font-semibold text-slate-500 block">
                      System Prompt & Guidelines
                    </label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed min-h-[250px]"
                      placeholder="Describe your AI agent system instructions here..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <button
                  onClick={handleSaveConfig}
                  disabled={isConfigSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer flex items-center space-x-2 shrink-0 justify-center sm:justify-start"
                >
                  {isConfigSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Deploying Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Apply & Sync Settings</span>
                    </>
                  )}
                </button>

                {configSaveSuccess ? (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-fade-in font-sans">
                    <Check className="h-4 w-4 bg-emerald-100 text-emerald-700 rounded-full p-0.5 shrink-0" /> Speech configurations successfully saved & deployed. Campaign models are synchronized.
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">
                    Click Apply to synchronize speech models, dialer behavior, and instruction sets globally.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
