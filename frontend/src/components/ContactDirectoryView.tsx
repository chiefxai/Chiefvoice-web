import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  Search,
  FileSpreadsheet,
  Database,
  Check,
  X,
  AlertCircle,
  Filter,
  DollarSign,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Lead } from '../types';

interface ContactDirectoryViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

export default function ContactDirectoryView({
  leads,
  setLeads
}: ContactDirectoryViewProps) {
  // Navigation & filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Single Contact Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAmount, setFormAmount] = useState('25000');
  const [formSource, setFormSource] = useState('Manual Entry');
  const [formEmployer, setFormEmployer] = useState('');
  const [formIncome, setFormIncome] = useState('6000');
  const [formCredit, setFormCredit] = useState('720');
  const [formDti, setFormDti] = useState('0.25');
  const [formNotes, setFormNotes] = useState('');

  // Bulk Upload State
  const [bulkMode, setBulkMode] = useState<'csv-file' | 'paste-text'>('paste-text');
  const [pastedData, setPastedData] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Lead>[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter contacts
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.financialInfo?.employer || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  // Unique sources for filter dropdown
  const uniqueSources = ['All', ...Array.from(new Set(leads.map((l) => l.source)))];

  // Stats calculation
  const totalContacts = leads.length;
  const bulkUploadedCount = leads.filter((l) => l.source.includes('CSV') || l.source.includes('Bulk')).length;
  const avgAmountRequested = leads.length > 0
    ? Math.round(leads.reduce((acc, l) => acc + l.amountRequested, 0) / leads.length)
    : 0;
  const highCreditCount = leads.filter((l) => (l.financialInfo?.creditScore || 0) >= 700).length;

  // Handle open individual add modal
  const openAddModal = () => {
    setEditingLead(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAmount('25000');
    setFormSource('Manual Entry');
    setFormEmployer('');
    setFormIncome('6000');
    setFormCredit('720');
    setFormDti('0.25');
    setFormNotes('Registered individually.');
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormPhone(lead.phone);
    setFormEmail(lead.email);
    setFormAmount(lead.amountRequested.toString());
    setFormSource(lead.source);
    setFormEmployer(lead.financialInfo?.employer || '');
    setFormIncome((lead.financialInfo?.monthlyIncome || 6000).toString());
    setFormCredit((lead.financialInfo?.creditScore || 720).toString());
    setFormDti((lead.financialInfo?.debtToIncome || 0.25).toString());
    setFormNotes(lead.notes || '');
    setIsAddModalOpen(true);
  };

  // Submit single/edited lead
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formEmail.trim()) {
      alert('Please fill out required fields: Name, Phone, and Email.');
      return;
    }

    if (editingLead) {
      // Edit mode
      const updatedLeads = leads.map((l) => {
        if (l.id === editingLead.id) {
          return {
            ...l,
            name: formName,
            phone: formPhone,
            email: formEmail,
            amountRequested: parseFloat(formAmount) || 0,
            source: formSource,
            notes: formNotes,
            financialInfo: {
              employer: formEmployer || 'Self-Employed',
              monthlyIncome: parseFloat(formIncome) || 0,
              creditScore: parseInt(formCredit) || 700,
              debtToIncome: parseFloat(formDti) || 0.3
            }
          };
        }
        return l;
      });
      setLeads(updatedLeads);
    } else {
      // Create mode
      const newLead: Lead = {
        id: `L-${100 + leads.length + 1}`,
        name: formName,
        phone: formPhone,
        email: formEmail,
        amountRequested: parseFloat(formAmount) || 0,
        score: 0,
        source: formSource,
        status: 'New',
        tags: ['Unassigned'],
        createdAt: new Date().toISOString(),
        notes: formNotes,
        financialInfo: {
          employer: formEmployer || 'Self-Employed',
          monthlyIncome: parseFloat(formIncome) || 0,
          creditScore: parseInt(formCredit) || 700,
          debtToIncome: parseFloat(formDti) || 0.3
        }
      };
      setLeads([newLead, ...leads]);
    }
    setIsAddModalOpen(false);
  };

  // Delete lead
  const handleDeleteContact = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} from your contact directory?`)) {
      setLeads(leads.filter((l) => l.id !== id));
    }
  };

  // Helper: Parse raw CSV text
  const parseCSVText = (text: string) => {
    setParsingError(null);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        setParsingError('CSV must include at least a header row and one data row.');
        setParsedPreview([]);
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
      
      // Basic validation of required headers
      const hasName = headers.includes('name');
      const hasPhone = headers.includes('phone');
      const hasEmail = headers.includes('email');

      if (!hasName || !hasPhone || !hasEmail) {
        setParsingError('CSV columns must include: "name", "phone", and "email". Other optional keys: amount, employer, income, credit, dti');
        setParsedPreview([]);
        return;
      }

      const previewList: Partial<Lead>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple comma split (doesn't handle commas inside quotes for simplicity but is good for standard inputs)
        const cols = lines[i].split(',').map((c) => c.trim());
        const rowObj: any = {};
        
        headers.forEach((header, index) => {
          if (cols[index] !== undefined) {
            rowObj[header] = cols[index];
          }
        });

        previewList.push({
          id: `TEMP-${i}`,
          name: rowObj.name || `Lead #${i}`,
          phone: rowObj.phone || 'N/A',
          email: rowObj.email || 'N/A',
          amountRequested: parseFloat(rowObj.amount) || 20000,
          source: 'Bulk Import',
          status: 'New',
          tags: ['Bulk Uploaded'],
          createdAt: new Date().toISOString(),
          notes: 'Bulk uploaded into CRM database.',
          financialInfo: {
            employer: rowObj.employer || 'Unspecified',
            monthlyIncome: parseFloat(rowObj.income) || 5000,
            creditScore: parseInt(rowObj.credit) || 680,
            debtToIncome: parseFloat(rowObj.dti) || 0.3
          }
        });
      }

      setParsedPreview(previewList);
    } catch (err: any) {
      setParsingError(`Parsing error: ${err.message}`);
      setParsedPreview([]);
    }
  };

  // Paste Text Area change
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPastedData(val);
    parseCSVText(val);
  };

  // Paste a Sample Template
  const handleLoadSampleTemplate = () => {
    const sample = `name,phone,email,amount,employer,income,credit,dti
Elon Musk,+1 (555) 912-3847,elon@spacex.com,150000,SpaceX Aerospace,45000,790,0.12
Steve Jobs,+1 (555) 123-4567,steve@apple.com,30000,Apple Computer,25000,810,0.08
Jeff Bezos,+1 (555) 888-2938,jeff@amazon.com,85000,Amazon Retail,38000,740,0.15
Larry Page,+1 (555) 444-1111,larry@google.com,40000,Google LLC,32000,760,0.20`;
    setPastedData(sample);
    parseCSVText(sample);
  };

  // CSV File reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setPastedData(text);
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  // Confirm Bulk Upload
  const handleConfirmBulkUpload = () => {
    if (parsedPreview.length === 0) {
      alert('No valid contacts to import.');
      return;
    }

    const startIdNumber = 100 + leads.length + 1;
    const finalLeadsToImport: Lead[] = parsedPreview.map((item, idx) => {
      return {
        id: `L-${startIdNumber + idx}`,
        name: item.name || 'Anonymous Contact',
        phone: item.phone || '+1 (555) 000-0000',
        email: item.email || 'imported@email.com',
        amountRequested: item.amountRequested || 25000,
        score: 0,
        source: 'CSV Bulk Upload',
        status: 'New',
        tags: ['Bulk Uploaded'],
        createdAt: new Date().toISOString(),
        notes: item.notes || 'Bulk uploaded via CSV parser.',
        financialInfo: {
          employer: item.financialInfo?.employer || 'Unspecified',
          monthlyIncome: item.financialInfo?.monthlyIncome || 5000,
          creditScore: item.financialInfo?.creditScore || 700,
          debtToIncome: item.financialInfo?.debtToIncome || 0.3
        }
      };
    });

    setLeads([...finalLeadsToImport, ...leads]);
    setIsBulkModalOpen(false);
    setPastedData('');
    setParsedPreview([]);
    alert(`Successfully parsed and bulk uploaded ${finalLeadsToImport.length} contacts! These are now fully available in your task assignment pool.`);
  };

  return (
    <div id="contact-directory-view" className="p-8 space-y-6 overflow-y-auto h-screen w-full font-sans bg-slate-50/50">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900">Unified Contact Directory</h2>
          <p className="text-sm text-slate-500 mt-1">
            Build, edit, and bulk upload your client repository. These contacts automatically stream into the outbound Task Assignment channels.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-2 text-blue-600" />
            Bulk Upload Contacts
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Contacts</span>
            <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">{totalContacts}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Bulk Imported</span>
            <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">{bulkUploadedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Avg Loan Req.</span>
            <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">${avgAmountRequested.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Prime Credit (700+)</span>
            <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">{highCreditCount}</p>
          </div>
        </div>
      </div>

      {/* Searching & Filters Grid */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts by name, email, phone number, employer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source:</span>
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {uniqueSources.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All CRM Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Qualified">Qualified</option>
            <option value="Unqualified">Unqualified</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Name / Details</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Loan Amt Requested</th>
                <th className="py-4 px-6">Employment & Wages</th>
                <th className="py-4 px-6">Credit / DTI</th>
                <th className="py-4 px-6">Source</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center uppercase">
                        {lead.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{lead.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {lead.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-600">
                    {lead.phone}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {lead.email}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-800">
                    ${lead.amountRequested.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-700 flex items-center">
                        <Building className="h-3 w-3 mr-1 text-slate-400" />
                        {lead.financialInfo?.employer || 'Unspecified'}
                      </p>
                      <p className="text-slate-400 text-[10px]">Wages: ${lead.financialInfo?.monthlyIncome.toLocaleString()}/mo</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-700">CS: {lead.financialInfo?.creditScore || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">DTI: {((lead.financialInfo?.debtToIncome || 0) * 100).toFixed(0)}%</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 text-[9px] bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => openEditModal(lead)}
                        title="Edit Contact"
                        className="p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(lead.id, lead.name)}
                        title="Delete Contact"
                        className="p-1.5 hover:bg-slate-100 hover:text-rose-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    No contacts found in the directory database matching search criteria. Click "Add Contact" or "Bulk Upload" to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add / Edit Single Contact */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 font-display">
                {editingLead ? `Modify Contact: ${editingLead.name}` : 'Originate New Contact Entry'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveContact} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Gavin Belson"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="gavin@hooli.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount Requested ($)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Underwriting Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Employer</label>
                    <input
                      type="text"
                      value={formEmployer}
                      onChange={(e) => setFormEmployer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      placeholder="Hooli Inc"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monthly Wages ($)</label>
                    <input
                      type="number"
                      value={formIncome}
                      onChange={(e) => setFormIncome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Credit Score (300-850)</label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={formCredit}
                    onChange={(e) => setFormCredit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Debt-To-Income (DTI)</label>
                  <input
                    type="text"
                    value={formDti}
                    onChange={(e) => setFormDti(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="0.30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lead Source</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Manual Entry">Manual Entry</option>
                    <option value="Website Form">Website Form</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Partner Referral">Partner Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes / Disclosures</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    placeholder="E.g. urgent loan request"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {editingLead ? 'Update Details' : 'Register Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Upload Contacts */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 font-display">Bulk Upload Contacts Database</h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Top Selector tab */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setBulkMode('paste-text')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    bulkMode === 'paste-text' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Paste Raw CSV Dataset
                </button>
                <button
                  onClick={() => setBulkMode('csv-file')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    bulkMode === 'csv-file' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Upload CSV File (.csv)
                </button>
              </div>

              {bulkMode === 'paste-text' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Paste CSV Records (Comma-Separated, columns: name, phone, email, amount, employer, income, credit, dti)
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSampleTemplate}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Load Sample Template
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={pastedData}
                    onChange={handlePasteChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="name,phone,email,amount,employer,income,credit,dti&#10;Alice, +1 (555) 912-8822, alice@gmail.com, 18000, Walmart, 4500, 710, 0.28"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-50/50"
                       onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                    <p className="text-xs font-semibold text-slate-700">Select .csv file to parse</p>
                    <p className="text-[10px] text-slate-400 mt-1">Accepts UTF-8 comma-separated list of contacts</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  {pastedData && (
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl truncate">
                      Loaded file contents: {pastedData.split('\n').length} lines.
                    </div>
                  )}
                </div>
              )}

              {/* Parsing Feedback Error / Live Preview */}
              {parsingError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-rose-700">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  <div className="text-xs">
                    <p className="font-bold">Parsing Error Detected</p>
                    <p className="mt-1">{parsingError}</p>
                  </div>
                </div>
              )}

              {parsedPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" /> Live Parsing Preview ({parsedPreview.length} contacts parsed successfully)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Row structure verified</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
                    {parsedPreview.map((item, index) => (
                      <div key={index} className="p-3 text-xs flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.phone} • {item.email}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                          <p className="font-bold text-slate-700">${item.amountRequested?.toLocaleString()}</p>
                          <p>{item.financialInfo?.employer || 'Unspecified'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 italic">
                * Uploaded contacts will be appended to your Outbound CRM Dialer targets list.
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkUpload}
                  disabled={parsedPreview.length === 0}
                  className={`px-5 py-2 font-semibold text-xs rounded-xl cursor-pointer text-white flex items-center ${
                    parsedPreview.length > 0 ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Database className="h-4 w-4 mr-1.5" />
                  Save {parsedPreview.length > 0 ? parsedPreview.length : ''} Contacts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
