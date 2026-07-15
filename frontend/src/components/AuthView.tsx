import React, { useState } from 'react';
import { ShieldAlert, User, Key, Building2, Layers, KeyRound, Mail, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { OrganizationSettings } from '../types';

interface AuthViewProps {
  onAuthSuccess: (org: OrganizationSettings) => void;
  currentOrg: OrganizationSettings;
}

export default function AuthView({ onAuthSuccess, currentOrg }: AuthViewProps) {
  const [step, setStep] = useState<'login' | 'signup' | 'otp' | 'org_setup'>('login');
  const [email, setEmail] = useState('geminipro1447@gmail.com');
  const [password, setPassword] = useState('••••••••');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Org Setup state
  const [orgName, setOrgName] = useState(currentOrg.name);
  const [workspace, setWorkspace] = useState(currentOrg.workspaceName);
  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Growth' | 'Enterprise'>('Growth');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    // Trigger OTP simulation
    setSuccessMsg('Simulated security token sent! Enter code "777888" to verify.');
    setStep('otp');
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please fill in your email address');
      return;
    }
    setError('');
    setStep('org_setup');
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '777888' && otpCode !== '123456') {
      setError('Invalid security pin. Use default simulation pin "777888".');
      return;
    }
    setError('');
    setSuccessMsg('Success! Workspace initialized.');
    
    onAuthSuccess({
      ...currentOrg,
      name: orgName,
      workspaceName: workspace,
      subscriptionPlan: selectedPlan
    });
  };

  const handleOrgSetupComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !workspace) {
      setError('Please provide both organization name and workspace path');
      return;
    }
    setError('');
    setSuccessMsg('Security code sent to email to finalize workspace setup.');
    setStep('otp');
  };

  return (
    <div id="auth-wizard" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 mb-3">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">ChiefXAI Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise-Grade Loan Automation & CRM
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start space-x-2 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start space-x-2 text-emerald-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Corporate Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center group transition-all"
            >
              Request MFA Code
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-4 text-center border-t border-slate-800">
              <span className="text-xs text-slate-500">New organization?</span>{' '}
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Register Workspace
              </button>
            </div>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="you@corporate.com"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl flex items-center justify-center group transition-all"
            >
              Continue to Org Setup
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-4 text-center border-t border-slate-800">
              <span className="text-xs text-slate-500">Already registered?</span>{' '}
              <button
                type="button"
                onClick={() => setStep('login')}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {step === 'org_setup' && (
          <form onSubmit={handleOrgSetupComplete} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Acme Capital Partners"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace Slug</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-xs text-slate-600 font-mono">chief.ai/</span>
                <input
                  type="text"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-20 pr-4 py-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="acme-cap"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subscription Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Starter', 'Growth', 'Enterprise'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedPlan(tier)}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all ${
                      selectedPlan === tier
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl flex items-center justify-center group transition-all"
            >
              Provision Workspace
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">6-Digit Pin Verification</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-center text-2xl font-mono text-white tracking-widest focus:outline-none focus:border-indigo-500"
                placeholder="000000"
                required
              />
              <p className="text-[10px] text-slate-500 text-center mt-2">
                Simulated code is sent to your device. Try <strong className="text-indigo-400">777888</strong>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl flex items-center justify-center transition-all"
            >
              Verify & Launch Workspace
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('login');
              }}
              className="w-full bg-transparent hover:underline text-xs text-slate-400 text-center"
            >
              Back to credentials
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
