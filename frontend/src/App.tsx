import React, { useState, useEffect } from 'react';
import {
  initialLeads,
  initialWorkflows,
  initialCampaigns,
  initialCallLogs,
  initialLoans,
  initialVirtualNumbers,
  initialTeamMembers,
  initialOrgSettings,
  loadFromStorage,
  saveToStorage
} from './initialData';
import {
  Lead,
  Workflow,
  Campaign,
  CallLog,
  Loan,
  VirtualNumber,
  TeamMember,
  OrganizationSettings,
  UserRole
} from './types';

// UI components imports
import Sidebar from './components/Sidebar';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import LeadManagementView from './components/LeadManagementView';
import WorkflowBuilderView from './components/WorkflowBuilderView';
import CampaignView from './components/CampaignView';
import DialerSimulator from './components/DialerSimulator';
import LoanLifecycleView from './components/LoanLifecycleView';
import SettingsView from './components/SettingsView';
import ContactDirectoryView from './components/ContactDirectoryView';
import CompanyProfileView from './components/CompanyProfileView';

export default function App() {
  // Authentication & Session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadFromStorage<boolean>('chiefx_auth', false)
  );
  const [userRole, setUserRole] = useState<UserRole>(() =>
    loadFromStorage<UserRole>('chiefx_role', 'Super Admin')
  );
  const [activeTab, setActiveTab] = useState<string>(() =>
    loadFromStorage<string>('chiefx_tab', 'dashboard')
  );

  // CRM DB states
  const [leads, setLeads] = useState<Lead[]>(() =>
    loadFromStorage<Lead[]>('chiefx_leads', initialLeads)
  );
  const [workflows, setWorkflows] = useState<Workflow[]>(() =>
    loadFromStorage<Workflow[]>('chiefx_workflows', initialWorkflows)
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>(() =>
    loadFromStorage<Campaign[]>('chiefx_campaigns', initialCampaigns)
  );
  const [callLogs, setCallLogs] = useState<CallLog[]>(() =>
    loadFromStorage<CallLog[]>('chiefx_calllogs', initialCallLogs)
  );
  const [loans, setLoans] = useState<Loan[]>(() =>
    loadFromStorage<Loan[]>('chiefx_loans', initialLoans)
  );
  const [virtualNumbers, setVirtualNumbers] = useState<VirtualNumber[]>(() =>
    loadFromStorage<VirtualNumber[]>('chiefx_numbers', initialVirtualNumbers)
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() =>
    loadFromStorage<TeamMember[]>('chiefx_team', initialTeamMembers)
  );
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(() =>
    loadFromStorage<OrganizationSettings>('chiefx_org', initialOrgSettings)
  );

  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Load database content on mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [
          resLeads,
          resWorkflows,
          resCampaigns,
          resCallLogs,
          resLoans,
          resNumbers,
          resTeam,
          resOrg
        ] = await Promise.all([
          fetch('/api/leads').then(r => r.json()),
          fetch('/api/workflows').then(r => r.json()),
          fetch('/api/campaigns').then(r => r.json()),
          fetch('/api/call-logs').then(r => r.json()),
          fetch('/api/loans').then(r => r.json()),
          fetch('/api/settings/numbers').then(r => r.json()),
          fetch('/api/settings/team').then(r => r.json()),
          fetch('/api/settings/org').then(r => r.json())
        ]);

        if (resLeads && resLeads.length > 0) setLeads(resLeads);
        if (resWorkflows && resWorkflows.length > 0) setWorkflows(resWorkflows);
        if (resCampaigns && resCampaigns.length > 0) setCampaigns(resCampaigns);
        if (resCallLogs && resCallLogs.length > 0) setCallLogs(resCallLogs);
        if (resLoans && resLoans.length > 0) setLoans(resLoans);
        if (resNumbers && resNumbers.length > 0) setVirtualNumbers(resNumbers);
        if (resTeam && resTeam.length > 0) setTeamMembers(resTeam);
        if (resOrg && Object.keys(resOrg).length > 0) setOrgSettings(resOrg);
      } catch (err) {
        console.warn("Failed to fetch backend data, using local fallbacks:", err);
      } finally {
        setHasLoaded(true);
      }
    };
    loadBackendData();
  }, []);

  // Synchronization persistence effects
  useEffect(() => {
    saveToStorage('chiefx_auth', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    saveToStorage('chiefx_role', userRole);
  }, [userRole]);

  useEffect(() => {
    saveToStorage('chiefx_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveToStorage('chiefx_leads', leads);
    if (hasLoaded) {
      fetch('/api/leads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leads)
      }).catch(err => console.error("Error syncing leads:", err));
    }
  }, [leads, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_workflows', workflows);
    if (hasLoaded) {
      fetch('/api/workflows/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflows)
      }).catch(err => console.error("Error syncing workflows:", err));
    }
  }, [workflows, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_campaigns', campaigns);
    if (hasLoaded) {
      fetch('/api/campaigns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaigns)
      }).catch(err => console.error("Error syncing campaigns:", err));
    }
  }, [campaigns, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_calllogs', callLogs);
    if (hasLoaded) {
      fetch('/api/call-logs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callLogs)
      }).catch(err => console.error("Error syncing call logs:", err));
    }
  }, [callLogs, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_loans', loans);
    if (hasLoaded) {
      fetch('/api/loans/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loans)
      }).catch(err => console.error("Error syncing loans:", err));
    }
  }, [loans, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_numbers', virtualNumbers);
    if (hasLoaded) {
      fetch('/api/settings/numbers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(virtualNumbers)
      }).catch(err => console.error("Error syncing virtual numbers:", err));
    }
  }, [virtualNumbers, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_team', teamMembers);
    if (hasLoaded) {
      fetch('/api/settings/team/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamMembers)
      }).catch(err => console.error("Error syncing team members:", err));
    }
  }, [teamMembers, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_org', orgSettings);
    if (hasLoaded) {
      fetch('/api/settings/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgSettings)
      }).catch(err => console.error("Error syncing org settings:", err));
    }
  }, [orgSettings, hasLoaded]);

  // Handle Onboarding Completion
  const handleAuthSuccess = (org: OrganizationSettings) => {
    setOrgSettings(org);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  // Switch workspace content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            leads={leads}
            campaigns={campaigns}
            callLogs={callLogs}
            loans={loans}
            orgSettings={orgSettings}
          />
        );
      case 'leads':
        return (
          <LeadManagementView
            leads={leads}
            setLeads={setLeads}
            callLogs={callLogs}
            teamMembers={teamMembers}
          />
        );
      case 'contacts':
        return (
          <ContactDirectoryView
            leads={leads}
            setLeads={setLeads}
          />
        );
      case 'workflows':
        return (
          <WorkflowBuilderView
            workflows={workflows}
            setWorkflows={setWorkflows}
          />
        );
      case 'campaigns':
        return (
          <CampaignView
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            workflows={workflows}
            totalLeadsCount={leads.length}
          />
        );
      case 'dialer':
        return (
          <DialerSimulator
            leads={leads}
            callLogs={callLogs}
            setCallLogs={setCallLogs}
            leadsDatabase={leads}
            setLeadsDatabase={setLeads}
            virtualNumbers={virtualNumbers}
            setVirtualNumbers={setVirtualNumbers}
          />
        );
      case 'loans':
        return (
          <LoanLifecycleView
            loans={loans}
            setLoans={setLoans}
            leads={leads}
          />
        );
      case 'company':
        return (
          <CompanyProfileView
            orgSettings={orgSettings}
            setOrgSettings={setOrgSettings}
          />
        );
      case 'settings':
        return (
          <SettingsView
            virtualNumbers={virtualNumbers}
            setVirtualNumbers={setVirtualNumbers}
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
            orgSettings={orgSettings}
            setOrgSettings={setOrgSettings}
          />
        );
      default:
        return (
          <div className="p-8 font-sans">
            <h2 className="text-xl font-bold">Content under active construction</h2>
          </div>
        );
    }
  };

  // Onboarding Gate Routing
  if (!isAuthenticated) {
    return <AuthView onAuthSuccess={handleAuthSuccess} currentOrg={orgSettings} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/50">
      {/* Sidebar Rail */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        organizationName={orgSettings.name}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Global Floating Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">workspace:</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded text-blue-600 bg-blue-50">
              {orgSettings.workspaceName}.chief.ai
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400">Representative:</span>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-slate-700">Evelyn Shaw</span>
              <span className="text-[9px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {userRole}
              </span>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                saveToStorage('chiefx_auth', false);
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </header>

        {/* Selected Dashboard view content container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
