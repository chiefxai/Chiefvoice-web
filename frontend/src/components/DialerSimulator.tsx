import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  User,
  MessageSquare,
  Mic,
  Volume2,
  RefreshCw,
  Clock,
  Send,
  ThumbsUp,
  Activity,
  Smile,
  AlertCircle,
  Play,
  Pause,
  Plus,
  Trash2,
  Headphones,
  CheckCircle2,
  XCircle,
  Sliders,
  Disc,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ArrowLeft,
  ChevronLeft,
  PhoneIncoming,
  Inbox,
  History,
  PhoneForwarded
} from 'lucide-react';
import { Lead, CallLog, VirtualNumber } from '../types';

interface DialerSimulatorProps {
  leads: Lead[];
  callLogs: CallLog[];
  setCallLogs: React.Dispatch<React.SetStateAction<CallLog[]>>;
  leadsDatabase: Lead[];
  setLeadsDatabase: React.Dispatch<React.SetStateAction<Lead[]>>;
  virtualNumbers?: VirtualNumber[];
  setVirtualNumbers?: React.Dispatch<React.SetStateAction<VirtualNumber[]>>;
}

interface DialTask {
  id: string;
  name: string;
  questions: string[];
  leadIds: string[];
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
  callResults: {
    [leadId: string]: {
      status: 'Pending' | 'Calling' | 'Completed' | 'No Answer' | 'Skipped';
      duration: number;
      transcript: { speaker: 'AI' | 'Customer'; text: string; timestamp: string }[];
      sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
      intent: 'Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown';
      summary: string;
      answers: { [question: string]: string };
    }
  };
}

export default function DialerSimulator({
  leads,
  callLogs,
  setCallLogs,
  leadsDatabase,
  setLeadsDatabase,
  virtualNumbers = [],
  setVirtualNumbers
}: DialerSimulatorProps) {
  // Inbound Call states
  const [dialerMode, setDialerMode] = useState<'outbound' | 'inbound'>('outbound');
  
  const defaultInboundNumbers: VirtualNumber[] = [
    { id: 'num-1', number: '+1 (800) 555-0199', friendlyName: 'Main Direct Sales Line', provider: 'Twilio', status: 'Active', routingUrl: 'https://api.chiefxai.com/v1/inbound/twilio', incomingCallCount: 15, outgoingCallCount: 42 }
  ];
  
  const activeVirtualNumbers = virtualNumbers.length > 0 ? virtualNumbers : defaultInboundNumbers;
  const [selectedInboundNumber, setSelectedInboundNumber] = useState<string>(
    activeVirtualNumbers[0]?.number || '+1 (800) 555-0199'
  );
  
  // Potential Inbound Callers list
  const [selectedInboundCallerId, setSelectedInboundCallerId] = useState<string>('L-101');
  const [customInboundCallerName, setCustomInboundCallerName] = useState<string>('');
  const [customInboundCallerPhone, setCustomInboundCallerPhone] = useState<string>('');
  const [inboundStartingIntent, setInboundStartingIntent] = useState<'status' | 'apply' | 'rates' | 'payment'>('status');
  const [inboundLoanAmount, setInboundLoanAmount] = useState<number>(35000);
  
  // Active inbound call process states
  const [inboundCallState, setInboundCallState] = useState<'idle' | 'ringing' | 'connected' | 'completed'>('idle');
  const [inboundCaller, setInboundCaller] = useState<{ id: string; name: string; phone: string; email: string; amountRequested: number } | null>(null);
  const [inboundDuration, setInboundDuration] = useState<number>(0);
  const [inboundTranscript, setInboundTranscript] = useState<{ speaker: 'AI' | 'Customer'; text: string; timestamp: string }[]>([]);
  const [inboundCustomerUtterance, setInboundCustomerUtterance] = useState<string>('');
  const [isInboundAiResponding, setIsInboundAiResponding] = useState<boolean>(false);
  const [inboundSentiment, setInboundSentiment] = useState<'Positive' | 'Neutral' | 'Negative' | 'Unknown'>('Neutral');
  const [inboundIntent, setInboundIntent] = useState<'Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown'>('Unknown');
  const [inboundTopic, setInboundTopic] = useState<string>('Loan Inquiry');
  
  // Historical inbound call logs
  const [inboundCallLogs, setInboundCallLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('chiefx_inbound_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse inbound call logs', e);
      }
    }
    return [
      {
        id: 'INBOUND-001',
        callerName: 'Sarah Jenkins',
        callerPhone: '+1 (555) 102-3940',
        virtualNumber: '+1 (800) 555-0199',
        duration: 82,
        status: 'Completed',
        sentiment: 'Positive',
        intent: 'Interested',
        topic: 'Document Verification',
        transcript: [
          { speaker: 'Customer', text: "Hello, I received an email saying my paystub document needed OCR review. I was calling to ask if everything is verified now?", timestamp: "11:15:02" },
          { speaker: 'AI', text: "Hello Sarah! Thanks for calling ChiefXAI support. Yes, I can see that our system successfully processed your paystub. Your verified income is calculated at $8,500 monthly. I'm passing this over to underwriting right now.", timestamp: "11:15:15" },
          { speaker: 'Customer', text: "Oh, that is amazing news! When should I expect a callback or final approval?", timestamp: "11:15:30" },
          { speaker: 'AI', text: "Our underwriters usually review verified files within 2 hours. An agent will contact you by phone or SMS shortly. Can I help you with anything else today?", timestamp: "11:15:42" },
          { speaker: 'Customer', text: "No, that was very quick. Thank you so much!", timestamp: "11:15:50" },
          { speaker: 'AI', text: "You are very welcome, Sarah! Have a wonderful day!", timestamp: "11:15:58" }
        ],
        summary: "Sarah Jenkins called to check verification status of uploaded paystub. AI Agent Evelyn confirmed successful verification ($8,500 monthly income calculated) and informed her underwriters will complete final review within 2 hours. Customer was extremely satisfied.",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'INBOUND-002',
        callerName: 'Marcus Brodie',
        callerPhone: '+1 (555) 789-0123',
        virtualNumber: '+1 (800) 555-0199',
        duration: 45,
        status: 'Completed',
        sentiment: 'Neutral',
        intent: 'Unknown',
        topic: 'General Interest Rate Inquiry',
        transcript: [
          { speaker: 'Customer', text: "Hi, I saw your advertisement about competitive personal loan interest rates starting from 5.99%. Is that fixed or variable rate?", timestamp: "15:42:10" },
          { speaker: 'AI', text: "Thank you for inquiring with ChiefXAI! Our interest rates starting at 5.99% APR are fully fixed for the entire duration of the loan term. Would you like me to run a quick, no-obligation pre-qualification?", timestamp: "15:42:25" },
          { speaker: 'Customer', text: "I'll think about it and maybe check back on your website later. Thanks.", timestamp: "15:42:38" },
          { speaker: 'AI', text: "Understood, Marcus! You can access our instant pre-qualification portal on our website anytime. Have a great day!", timestamp: "15:42:45" }
        ],
        summary: "Marcus Brodie inquired about interest rate types (fixed vs variable). AI Agent Evelyn clarified that starting rates are fully fixed and offered pre-qualification. Prospect preferred to browse website first.",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    ];
  });

  // AI Voice and Prompt Configuration states from screenshots
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

  // Sync inbound logs
  useEffect(() => {
    localStorage.setItem('chiefx_inbound_logs', JSON.stringify(inboundCallLogs));
  }, [inboundCallLogs]);

  // Inbound Call duration timer
  const inboundTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (inboundCallState === 'connected') {
      inboundTimerRef.current = setInterval(() => {
        setInboundDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (inboundTimerRef.current) {
        clearInterval(inboundTimerRef.current);
        inboundTimerRef.current = null;
      }
    }
    return () => {
      if (inboundTimerRef.current) clearInterval(inboundTimerRef.current);
    };
  }, [inboundCallState]);

  // Load tasks from LocalStorage or initialize with premium pre-loaded data
  const [tasks, setTasks] = useState<DialTask[]>(() => {
    const saved = localStorage.getItem('chiefx_dialer_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved dialer tasks', e);
      }
    }

    // High quality initial tasks for immediate playability
    return [
      {
        id: 'TASK-001',
        name: "Today's Credit Pre-Qualification Survey",
        questions: [
          "Are you looking to proceed with your requested personal loan amount?",
          "Can you confirm your primary source of employment or business income?",
          "Would you say your credit score is excellent, fair, or poor?"
        ],
        leadIds: ['L-101', 'L-102', 'L-103', 'L-104'],
        status: 'In Progress',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        callResults: {
          'L-101': {
            status: 'Completed',
            duration: 98,
            transcript: [
              { speaker: 'AI', text: "Hello, am I speaking with Sarah Jenkins? I'm calling from ChiefXAI regarding your requested loan of $45,000. Is now a good time to ask a few questions?", timestamp: "10:30:05" },
              { speaker: 'Customer', text: "Yes, this is Sarah. I have a few minutes.", timestamp: "10:30:12" },
              { speaker: 'AI', text: "Excellent! First question: Are you looking to proceed with your requested personal loan amount of $45,000?", timestamp: "10:30:20" },
              { speaker: 'Customer', text: "Yes, I definitely want to go ahead. I need it for our kitchen remodel.", timestamp: "10:30:31" },
              { speaker: 'AI', text: "That sounds like a wonderful project. Next, can you confirm your primary source of employment or business income?", timestamp: "10:30:42" },
              { speaker: 'Customer', text: "I work full-time at TechCorp Solutions as a project manager.", timestamp: "10:30:54" },
              { speaker: 'AI', text: "Great. And finally, would you say your credit score is excellent, fair, or poor?", timestamp: "10:31:02" },
              { speaker: 'Customer', text: "It should be excellent, my score is around 740.", timestamp: "10:31:10" },
              { speaker: 'AI', text: "Wonderful, that is perfect for pre-qualification. I am saving this recording and passing it to our senior underwriter. Thanks for your time!", timestamp: "10:31:21" }
            ],
            sentiment: 'Positive',
            intent: 'Interested',
            summary: "Sarah Jenkins verified interest in $45k personal loan, works at TechCorp Solutions, self-reported excellent credit score (740). Call recorded successfully.",
            answers: {
              "Are you looking to proceed with your requested personal loan amount?": "Yes, definitely for a kitchen remodel.",
              "Can you confirm your primary source of employment or business income?": "Full-time project manager at TechCorp Solutions.",
              "Would you say your credit score is excellent, fair, or poor?": "Excellent, around 740."
            }
          },
          'L-103': {
            status: 'Completed',
            duration: 45,
            transcript: [
              { speaker: 'AI', text: "Hello, am I speaking with Amanda Ross? I'm calling from ChiefXAI regarding your debt consolidation request. Is now a good time?", timestamp: "14:20:05" },
              { speaker: 'Customer', text: "Actually, I am really busy and I changed my mind about wanting another loan.", timestamp: "14:20:15" },
              { speaker: 'AI', text: "Understood, Amanda. Let me just confirm: You do not wish to proceed with the requested consolidation amount?", timestamp: "14:20:25" },
              { speaker: 'Customer', text: "Correct. Please close my application and do not call again.", timestamp: "14:20:31" },
              { speaker: 'AI', text: "I will update your file and close the application right away. Thank you for letting us know.", timestamp: "14:20:40" }
            ],
            sentiment: 'Negative',
            intent: 'Not Interested',
            summary: "Amanda Ross declined loan progression. Requested immediate deactivation and to close file.",
            answers: {
              "Are you looking to proceed with your requested personal loan amount?": "No, changed mind.",
              "Can you confirm your primary source of employment or business income?": "N/A - declined conversation",
              "Would you say your credit score is excellent, fair, or poor?": "N/A"
            }
          }
        }
      },
      {
        id: 'TASK-002',
        name: "Premium VIP Mortgage Intake Call List",
        questions: [
          "Are you interested in home refinancing or a new purchase?",
          "Can you provide your approximate annual household income?",
          "What is the zip code of your targeted property?"
        ],
        leadIds: ['L-105'],
        status: 'Pending',
        createdAt: new Date().toISOString(),
        callResults: {}
      }
    ];
  });

  // Active Selected Task
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    return tasks[0]?.id || '';
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  // Task Creation Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newQuestions, setNewQuestions] = useState<string[]>([
    'Are you interested in proceeding with your loan application?',
    'What is your approximate monthly household income?',
    'Will you be able to upload your paystubs online today?'
  ]);
  const [tempQuestionInput, setTempQuestionInput] = useState('');
  const [selectedFormLeadIds, setSelectedFormLeadIds] = useState<string[]>([]);
  const [modalLeadSearch, setModalLeadSearch] = useState('');

  // Call simulator live states
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [twilioCallSid, setTwilioCallSid] = useState<string | null>(null);
  const [vobizCallSid, setVobizCallSid] = useState<string | null>(null);
  const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected' | 'completed'>('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<{ speaker: 'AI' | 'Customer'; text: string; timestamp: string }[]>([]);
  const [customerUtterance, setCustomerUtterance] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [currentSentiment, setCurrentSentiment] = useState<'Positive' | 'Neutral' | 'Negative' | 'Unknown'>('Neutral');
  const [currentIntent, setCurrentIntent] = useState<'Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown'>('Unknown');

  // Inbound Call indication popup & auto-attend states
  const [autoAttendCountdown, setAutoAttendCountdown] = useState<number>(3);

  // Multi-question state
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [extractedAnswers, setExtractedAnswers] = useState<{ [question: string]: string }>({});

  // Audio Playback states for Call Tape (Supports both Outbound and Inbound recordings)
  const [playingTapeId, setPlayingTapeId] = useState<string | null>(null);
  const [playingTapeType, setPlayingTapeType] = useState<'outbound' | 'inbound'>('outbound');
  const [isTapePlaying, setIsTapePlaying] = useState(false);
  const [tapeProgress, setTapeProgress] = useState(0);
  const [tapeSpeed, setTapeSpeed] = useState<number>(1);
  const tapeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Sync tasks to local storage
  useEffect(() => {
    localStorage.setItem('chiefx_dialer_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Active call timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Scroll transcript to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript.length, isAiResponding]);

  // Vintage Cassette tape simulation timer
  useEffect(() => {
    if (isTapePlaying) {
      tapeIntervalRef.current = setInterval(() => {
        setTapeProgress((prev) => {
          if (prev >= 100) {
            setIsTapePlaying(false);
            if (tapeIntervalRef.current) clearInterval(tapeIntervalRef.current);
            return 100;
          }
          return prev + (2 * tapeSpeed);
        });
      }, 300);
    } else {
      if (tapeIntervalRef.current) {
        clearInterval(tapeIntervalRef.current);
        tapeIntervalRef.current = null;
      }
    }
    return () => {
      if (tapeIntervalRef.current) clearInterval(tapeIntervalRef.current);
    };
  }, [isTapePlaying, tapeSpeed]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add question in creator
  const handleAddQuestion = () => {
    if (tempQuestionInput.trim()) {
      setNewQuestions([...newQuestions, tempQuestionInput.trim()]);
      setTempQuestionInput('');
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setNewQuestions(newQuestions.filter((_, i) => i !== idx));
  };

  // Toggle lead checkbox in task creator
  const handleToggleLeadSelection = (leadId: string) => {
    if (selectedFormLeadIds.includes(leadId)) {
      setSelectedFormLeadIds(selectedFormLeadIds.filter((id) => id !== leadId));
    } else {
      setSelectedFormLeadIds([...selectedFormLeadIds, leadId]);
    }
  };

  // Create Task Submission
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || selectedFormLeadIds.length === 0 || newQuestions.length === 0) {
      alert('Please fill out task name, select at least one lead and input a question.');
      return;
    }

    const newTask: DialTask = {
      id: `TASK-${100 + tasks.length + 1}`,
      name: newTaskName.trim(),
      questions: newQuestions,
      leadIds: selectedFormLeadIds,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      callResults: {}
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setSelectedTaskId(newTask.id);
    setShowCreateModal(false);

    // Reset Form
    setNewTaskName('');
    setNewQuestions([
      'Are you interested in proceeding with your loan application?',
      'What is your approximate monthly household income?',
      'Will you be able to upload your paystubs online today?'
    ]);
    setSelectedFormLeadIds([]);
  };

  const handleInitiateVobizCall = async (lead: Lead) => {
    if (callState === 'dialing' || callState === 'connected') return;

    setActiveLead(lead);
    setCallState('dialing');
    setDuration(0);
    setTranscript([]);
    setCurrentSentiment('Neutral');
    setCurrentIntent('Unknown');
    setActiveQuestionIndex(0);
    setExtractedAnswers({});
    setPlayingTapeId(null);
    setIsTapePlaying(false);

    try {
      const res = await fetch('/api/vobiz/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: lead.phone })
      });
      const data = await res.json();
      if (data.success && data.callSid) {
        setVobizCallSid(data.callSid);
        setCallState('connected');
        setTranscript([
          {
            speaker: 'AI',
            text: `[Vobiz Call Started] Dialing ${lead.name} at ${lead.phone}...`,
            timestamp: new Date().toTimeString().split(' ')[0]
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to initiate Vobiz call');
      }
    } catch (err: any) {
      setCallState('idle');
      alert(`Vobiz call failed: ${err.message}`);
    }
  };

  const handleHangupVobizCall = async () => {
    setVobizCallSid(null);
    handleHangupCall();
  };

  const handleInitiateTwilioCall = async (lead: Lead) => {
    if (callState === 'dialing' || callState === 'connected') return;

    setActiveLead(lead);
    setCallState('dialing');
    setDuration(0);
    setTranscript([]);
    setCurrentSentiment('Neutral');
    setCurrentIntent('Unknown');
    setActiveQuestionIndex(0);
    setExtractedAnswers({});
    setPlayingTapeId(null);
    setIsTapePlaying(false);

    try {
      const res = await fetch('/api/twilio/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: lead.phone })
      });
      const data = await res.json();
      if (data.success && data.callSid) {
        setTwilioCallSid(data.callSid);
        setCallState('connected');
        setTranscript([
          {
            speaker: 'AI',
            text: `[Twilio Call Started] Dialing ${lead.name} at ${lead.phone}...`,
            timestamp: new Date().toTimeString().split(' ')[0]
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to initiate Twilio call');
      }
    } catch (err: any) {
      setCallState('idle');
      alert(`Twilio call failed: ${err.message}`);
    }
  };

  const handleHangupTwilioCall = async () => {
    if (!activeLead || !twilioCallSid) return;
    try {
      await fetch('/api/twilio/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid: twilioCallSid })
      });
    } catch (err) {
      console.error("Failed to hang up Twilio call:", err);
    }
    setTwilioCallSid(null);
    handleHangupCall();
  };

  // Initiate call to a lead inside the selected task
  const handleInitiateTaskCall = (lead: Lead) => {
    if (callState === 'dialing' || callState === 'connected') return;

    setActiveLead(lead);
    setCallState('dialing');
    setDuration(0);
    setTranscript([]);
    setCurrentSentiment('Neutral');
    setCurrentIntent('Unknown');
    setActiveQuestionIndex(0);
    setExtractedAnswers({});

    // Close tape player when starting a new call
    setPlayingTapeId(null);
    setIsTapePlaying(false);

    // Simulate connection delay
    setTimeout(() => {
      setCallState('connected');

      // AI introduces herself and asks the very first question from the questionnaire!
      const firstQuestion = selectedTask.questions[0] || "Are you ready to proceed?";
      const introMessage = `Hello, am I speaking with ${lead.name}? I'm Evelyn calling from ChiefXAI regarding your requested loan of $${lead.amountRequested.toLocaleString()}. Since we are looking to pre-approve you today, let me ask: ${firstQuestion}`;

      setTranscript([
        {
          speaker: 'AI',
          text: introMessage,
          timestamp: new Date().toTimeString().split(' ')[0]
        }
      ]);
    }, 1800);
  };

  // Hangup call and save detailed conversation history, questionnaire answers, and tape logs
  const handleHangupCall = () => {
    if (!activeLead) return;
    setCallState('completed');

    // Create Call Log in state
    const callLogId = `CALL-${600 + callLogs.length + 1}`;
    const answersText = Object.entries(extractedAnswers)
      .map(([q, a]) => `• ${q} Answered: "${a}"`)
      .join('\n');

    const summaryText = `Daily Task Call [${selectedTask.name}]. Customer responded with ${currentSentiment} sentiment and ${currentIntent} intent.\n\nAssigned Questionnaire Responses:\n${answersText || 'No answers collected.'}`;

    // Update results inside selected task
    const updatedTasks = tasks.map((task) => {
      if (task.id === selectedTask.id) {
        const isAllLeadsDialed = task.leadIds.every((lId) => {
          if (lId === activeLead.id) return true;
          return task.callResults[lId]?.status === 'Completed';
        });

        return {
          ...task,
          status: isAllLeadsDialed ? 'Completed' as const : 'In Progress' as const,
          callResults: {
            ...task.callResults,
            [activeLead.id]: {
              status: 'Completed' as const,
              duration: duration,
              transcript: transcript,
              sentiment: currentSentiment,
              intent: currentIntent,
              summary: summaryText,
              answers: { ...extractedAnswers }
            }
          }
        };
      }
      return task;
    });

    setTasks(updatedTasks);

    // Save globally to call logs
    const globalLog: CallLog = {
      id: callLogId,
      leadId: activeLead.id,
      leadName: activeLead.name,
      campaignId: selectedTask.id,
      duration: duration,
      status: 'Completed',
      sentiment: currentSentiment,
      intent: currentIntent,
      transcript: transcript,
      summary: summaryText,
      createdAt: new Date().toISOString()
    };

    setCallLogs([globalLog, ...callLogs]);

    // Update Lead status in leads database
    const updatedDatabase = leadsDatabase.map((l) => {
      if (l.id === activeLead.id) {
        return {
          ...l,
          status: currentIntent === 'Interested' ? 'Qualified' : currentIntent === 'Not Interested' ? 'Unqualified' : l.status,
          notes: `Dialer Task Summary [${selectedTask.name}]:\n${summaryText}\n\n${l.notes}`
        };
      }
      return l;
    });
    setLeadsDatabase(updatedDatabase);
  };

  // Submit Caller response - proceed question by question!
  const handleSendUtterance = async (utteranceText: string) => {
    if (!utteranceText.trim() || isAiResponding || !activeLead) return;

    const currentQuestion = selectedTask.questions[activeQuestionIndex];
    const timeStr = new Date().toTimeString().split(' ')[0];

    // Save answer
    const newAnswers = {
      ...extractedAnswers,
      [currentQuestion]: utteranceText
    };
    setExtractedAnswers(newAnswers);

    const updatedTranscript = [
      ...transcript,
      { speaker: 'Customer' as const, text: utteranceText, timestamp: timeStr }
    ];
    setTranscript(updatedTranscript);
    setCustomerUtterance('');
    setIsAiResponding(true);

    // Advance index
    const nextIndex = activeQuestionIndex + 1;

    try {
      // Call Gemini API server
      const res = await fetch('/api/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: activeLead.name,
          loanAmount: activeLead.amountRequested,
          prompt: `Today's Daily Dialing task: "${selectedTask.name}".
AI Voice Persona: ${voicePersona} (Emotion Intensity: ${emotionIntensity}%, Speed: ${speechSpeed}%, Friendliness: ${friendliness}%).
System Instructions/Guidelines to strictly follow:
${systemPrompt}

Currently on question ${nextIndex} out of ${selectedTask.questions.length}. Next question to ask them is: "${selectedTask.questions[nextIndex] || 'None, wrap up conversation and say goodbye.'}"`,
          transcript: updatedTranscript,
          customerUtterance: utteranceText
        })
      });

      const data = await res.json();
      if (data.success) {
        let aiReply = data.reply;
        setCurrentSentiment(data.sentiment);
        setCurrentIntent(data.intent);

        // If there's a next question, append or formulate it
        if (nextIndex < selectedTask.questions.length) {
          const nextQuestion = selectedTask.questions[nextIndex];
          aiReply = `${data.reply} Moving to my next point: ${nextQuestion}`;
          setActiveQuestionIndex(nextIndex);
        } else {
          aiReply = `${data.reply} I have successfully recorded all your answers on our secure audio line. Thank you so much for your time, goodbye!`;
          setActiveQuestionIndex(nextIndex);
        }

        setTranscript((prev) => [
          ...prev,
          { speaker: 'AI', text: aiReply, timestamp: new Date().toTimeString().split(' ')[0] }
        ]);

        // Auto hang up if final question completed
        if (nextIndex >= selectedTask.questions.length || data.isFinished) {
          setTimeout(() => {
            handleHangupCall();
          }, 4500);
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback offline simulator
      setTimeout(() => {
        let fallbackReply = '';
        if (nextIndex < selectedTask.questions.length) {
          fallbackReply = `Got it, noted that down. Next question: ${selectedTask.questions[nextIndex]}`;
          setActiveQuestionIndex(nextIndex);
        } else {
          fallbackReply = `Perfect, that completes today's qualification checklist! I am saving the call recording now. Goodbye!`;
          setActiveQuestionIndex(nextIndex);
        }

        setTranscript((prev) => [
          ...prev,
          { speaker: 'AI', text: fallbackReply, timestamp: new Date().toTimeString().split(' ')[0] }
        ]);

        if (nextIndex >= selectedTask.questions.length) {
          setTimeout(() => {
            handleHangupCall();
          }, 3000);
        }
      }, 1000);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Skip lead
  const handleSkipLead = (leadId: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          callResults: {
            ...task.callResults,
            [leadId]: {
              status: 'Skipped' as const,
              duration: 0,
              transcript: [],
              sentiment: 'Unknown' as const,
              intent: 'Unknown' as const,
              summary: 'Call skipped by representative.',
              answers: {}
            }
          }
        };
      }
      return task;
    });
    setTasks(updatedTasks);
  };  // Open Cassette Recording Player for a Completed Call
  const handleOpenTapePlayer = (id: string, type: 'outbound' | 'inbound' = 'outbound') => {
    setPlayingTapeId(id);
    setPlayingTapeType(type);
    setTapeProgress(0);
    setIsTapePlaying(true);
  };

  // Inbound simulation handlers
  const handleTriggerInboundCall = () => {
    if (inboundCallState !== 'idle') return;

    let callerObj = {
      id: 'INB-TEMP',
      name: 'Rebecca Sterling',
      phone: '+1 (555) 304-2090',
      email: 'rebecca@example.com',
      amountRequested: inboundLoanAmount,
    };

    if (selectedInboundCallerId !== 'new') {
      const dbLead = leadsDatabase.find((l) => l.id === selectedInboundCallerId);
      if (dbLead) {
        callerObj = {
          id: dbLead.id,
          name: dbLead.name,
          phone: dbLead.phone,
          email: dbLead.email,
          amountRequested: dbLead.amountRequested,
        };
      }
    } else {
      // Create custom named caller
      const finalName = customInboundCallerName.trim() || 'Jonathan Vance';
      const finalPhone = customInboundCallerPhone.trim() || '+1 (555) 880-1290';
      callerObj = {
        id: `INB-GEN-${Date.now()}`,
        name: finalName,
        phone: finalPhone,
        email: `${finalName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
        amountRequested: inboundLoanAmount,
      };
    }

    // Set topic based on intent
    let topic = 'Loan Pre-Qualification';
    if (inboundStartingIntent === 'status') topic = 'Paystub & Document Status';
    else if (inboundStartingIntent === 'rates') topic = 'Interest Rates & APR Quote';
    else if (inboundStartingIntent === 'payment') topic = 'EMI & Billing Support';

    setInboundCaller(callerObj);
    setInboundTopic(topic);
    setInboundDuration(0);
    setInboundTranscript([]);
    setInboundCallState('ringing');
    setInboundSentiment('Neutral');
    setInboundIntent('Unknown');
    setDialerMode('inbound');

    // Close tape player
    setPlayingTapeId(null);
    setIsTapePlaying(false);
  };

  const handleAcceptInboundCall = () => {
    if (!inboundCaller) return;
    setInboundCallState('connected');

    const greeting = `Thank you for calling ChiefXAI loan support department! My name is Evelyn, your AI lending assistant. I see I am speaking with ${inboundCaller.name} today. How can I assist you with your ${inboundTopic.toLowerCase()}?`;
    setInboundTranscript([
      {
        speaker: 'AI',
        text: greeting,
        timestamp: new Date().toTimeString().split(' ')[0],
      },
    ]);
  };

  const handleDeclineInboundCall = () => {
    setInboundCallState('idle');
    setInboundCaller(null);
  };

  // Reset auto-attend countdown when call starts ringing
  useEffect(() => {
    if (inboundCallState === 'ringing') {
      setAutoAttendCountdown(3);
    }
  }, [inboundCallState]);

  // Handle countdown decrement and auto-answering
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (inboundCallState === 'ringing') {
      timer = setInterval(() => {
        setAutoAttendCountdown((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            // AI automatically attends the call!
            handleAcceptInboundCall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [inboundCallState, inboundCaller]);

  // Synthesized Telephone Ringing sound
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (inboundCallState === 'ringing') {
      const playRingSound = () => {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(440, audioCtx.currentTime); // Hz
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(480, audioCtx.currentTime); // Hz
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          // First ring beep
          gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.45);
          gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
          
          // Second ring beep
          gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.65);
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + 1.05);
          gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.1);
          
          osc1.start(audioCtx.currentTime);
          osc2.start(audioCtx.currentTime);
          
          osc1.stop(audioCtx.currentTime + 1.25);
          osc2.stop(audioCtx.currentTime + 1.25);
        } catch (e) {
          console.warn("AudioContext ring failed", e);
        }
      };
      
      playRingSound();
      interval = setInterval(playRingSound, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inboundCallState]);

  const handleHangupInboundCall = () => {
    if (!inboundCaller) return;
    setInboundCallState('completed');

    // Format transcript answers if any
    const globalSummary = `Inbound call from ${inboundCaller.name} on virtual line ${selectedInboundNumber}.\n\nPrimary Inquiry Topic: ${inboundTopic}.\nCaller Sentiment: ${inboundSentiment} • Intended Outcome: ${inboundIntent}.\n\nAI Virtual Assistant parsed documentation and responded to customer queries on our secure lines.`;

    const newLog = {
      id: `INBOUND-REC-${Date.now()}`,
      callerName: inboundCaller.name,
      callerPhone: inboundCaller.phone,
      virtualNumber: selectedInboundNumber,
      duration: inboundDuration,
      status: 'Completed',
      sentiment: inboundSentiment,
      intent: inboundIntent,
      topic: inboundTopic,
      transcript: inboundTranscript,
      summary: globalSummary,
      createdAt: new Date().toISOString(),
    };

    setInboundCallLogs([newLog, ...inboundCallLogs]);

    // Update lead notes in DB if caller was an existing CRM lead
    if (selectedInboundCallerId !== 'new') {
      const updatedDatabase = leadsDatabase.map((l) => {
        if (l.id === selectedInboundCallerId) {
          return {
            ...l,
            notes: `Inbound Call Log [${new Date().toLocaleDateString()}]:\n- Topic: ${inboundTopic}\n- Duration: ${inboundDuration}s\n- Summary: ${globalSummary}\n\n${l.notes}`,
          };
        }
        return l;
      });
      setLeadsDatabase(updatedDatabase);
    }
  };

  const handleSendInboundUtterance = async (utteranceText: string) => {
    if (!utteranceText.trim() || isInboundAiResponding || !inboundCaller) return;

    const timeStr = new Date().toTimeString().split(' ')[0];
    const updatedTranscript = [
      ...inboundTranscript,
      { speaker: 'Customer' as const, text: utteranceText, timestamp: timeStr },
    ];
    setInboundTranscript(updatedTranscript);
    setInboundCustomerUtterance('');
    setIsInboundAiResponding(true);

    try {
      const res = await fetch('/api/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: inboundCaller.name,
          loanAmount: inboundCaller.amountRequested,
          prompt: `This is an INBOUND customer support call on our virtual line: ${selectedInboundNumber}. The customer wants to check or talk about: "${inboundTopic}".
AI Voice Persona: ${voicePersona} (Emotion Intensity: ${emotionIntensity}%, Speed: ${speechSpeed}%, Friendliness: ${friendliness}%).
System Instructions/Guidelines to strictly follow:
${systemPrompt}

Respond naturally, answer their questions clearly, and address them by name.`,
          transcript: updatedTranscript,
          customerUtterance: utteranceText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInboundSentiment(data.sentiment);
        setInboundIntent(data.intent);

        setInboundTranscript((prev) => [
          ...prev,
          {
            speaker: 'AI',
            text: data.reply,
            timestamp: new Date().toTimeString().split(' ')[0],
          },
        ]);

        if (data.isFinished) {
          setTimeout(() => {
            handleHangupInboundCall();
          }, 4500);
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback local response
      setTimeout(() => {
        let fallbackReply = `Thank you for sharing that, ${inboundCaller.name}. I've successfully registered your inquiry regarding ${inboundTopic.toLowerCase()}. I will pass this directly to our human underwriters for instant review. Can I help you with anything else today?`;

        // Customize slightly on keywords
        const lowText = utteranceText.toLowerCase();
        if (lowText.includes('rate') || lowText.includes('interest')) {
          fallbackReply = `Our fixed rates start at 5.99% APR, ${inboundCaller.name}. We can run a soft-credit check in under 1 minute to calculate your exact quote. Should I initiate that now?`;
        } else if (lowText.includes('status') || lowText.includes('approved')) {
          fallbackReply = `I am happy to confirm your paystub was successfully OCR processed! Your $8,500 monthly wages look verified on our records. Our underwriters will send your final contract shortly!`;
        } else if (lowText.includes('bye') || lowText.includes('thank') || lowText.includes('no')) {
          fallbackReply = `It was my pleasure helping you today. Thank you for calling ChiefXAI lending! Have a marvelous day. Goodbye!`;
        }

        setInboundTranscript((prev) => [
          ...prev,
          {
            speaker: 'AI',
            text: fallbackReply,
            timestamp: new Date().toTimeString().split(' ')[0],
          },
        ]);

        if (lowText.includes('bye') || lowText.includes('thank') || lowText.includes('no')) {
          setTimeout(() => {
            handleHangupInboundCall();
          }, 3500);
        }
      }, 1000);
    } finally {
      setIsInboundAiResponding(false);
    }
  };

  const activeTapeResult = playingTapeType === 'inbound'
    ? inboundCallLogs.find((log) => log.id === playingTapeId)
    : selectedTask.callResults[playingTapeId || ''];

  const activeTapeLead = playingTapeType === 'inbound'
    ? null
    : leadsDatabase.find((l) => l.id === playingTapeId);

  if (playingTapeId && activeTapeResult) {
    const isOutbound = playingTapeType === 'outbound';
    const displayTitle = isOutbound && activeTapeLead
      ? `${activeTapeLead.name} Call Analysis`
      : `${activeTapeResult.callerName} Inbound Call Analysis`;

    const displaySubtitle = isOutbound
      ? `Campaign: ${selectedTask.name}`
      : `Virtual Line Called: ${activeTapeResult.virtualNumber} • Topic: ${activeTapeResult.topic}`;

    const filename = isOutbound && activeTapeLead
      ? `📼 ${activeTapeLead.name.toUpperCase()}_recording.wav`
      : `📼 ${activeTapeResult.callerName.toUpperCase()}_inbound_recording.wav`;

    return (
      <div id="voice-agent-dialer" className="p-6 md:p-8 space-y-6 overflow-y-auto h-screen w-full font-sans bg-slate-50/50 text-slate-800 animate-fadeIn flex flex-col">
        {/* Navigation & Header with Compact Media Player */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 shrink-0 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            {/* Left: Info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setPlayingTapeId(null);
                  setIsTapePlaying(false);
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-center gap-2 font-medium"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                <span className="text-xs">Back</span>
              </button>
              <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-blue-600 uppercase tracking-widest font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Archive Room</span>
                  <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{isOutbound ? 'Outbound Dial' : 'Inbound Line'}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">{displayTitle}</h2>
                <p className="text-[11px] text-slate-500">{displaySubtitle}</p>
              </div>
            </div>

            {/* MINIMAL HORIZONTAL RECORDING PLAYER */}
            <div className="flex-1 max-w-2xl bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={() => setIsTapePlaying(!isTapePlaying)}
                className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-600/10"
                title={isTapePlaying ? 'Pause Tape' : 'Play Tape'}
              >
                {isTapePlaying ? (
                  <Pause className="h-4 w-4 fill-white text-white" />
                ) : (
                  <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                )}
              </button>

              {/* Progress & Label */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span className="truncate font-semibold text-blue-600">{filename}</span>
                  <span className="shrink-0 text-slate-600 font-medium">
                    {formatTime(Math.round((activeTapeResult.duration * tapeProgress) / 100))} / {formatTime(activeTapeResult.duration)}
                  </span>
                </div>
                <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 transition-all" style={{ width: `${tapeProgress}%` }}></div>
                </div>
              </div>

              {/* Tape Reels Animation (Compact version) */}
              <div className="hidden sm:flex items-center space-x-2.5 px-2 bg-slate-100 rounded-lg border border-slate-200 h-8">
                <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center">
                  <div className={`h-1.5 w-1.5 rounded-full bg-slate-500 ${isTapePlaying ? 'animate-spin' : ''}`} style={{ borderStyle: 'dashed' }}></div>
                </div>
                <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center">
                  <div className={`h-1.5 w-1.5 rounded-full bg-slate-500 ${isTapePlaying ? 'animate-spin' : ''}`} style={{ borderStyle: 'dashed' }}></div>
                </div>
              </div>

              {/* Play Speed selector */}
              <div className="flex border border-slate-200 bg-white rounded-lg overflow-hidden text-[10px] h-8 items-center">
                {[1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setTapeSpeed(sp)}
                    className={`px-2 h-full font-mono font-bold ${tapeSpeed === sp ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'} cursor-pointer transition-all`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Cognitive Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Intent</span>
                <span className="text-xs font-bold text-blue-600">{activeTapeResult.intent}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Sentiment</span>
                <span className="text-xs font-bold text-emerald-600">{activeTapeResult.sentiment}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Workspace: Wide Conversation Panel & Right Checklist Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* LEFT: Complete conversation dialogue timeline (FULL PAGE VIEW) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col h-full shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <span className="text-xs font-mono text-slate-700 uppercase tracking-widest font-bold flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                Conversation Dialogue Transcript
              </span>
              <span className="text-[10px] font-mono text-slate-400">Dual-channel synthesis</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-2">
              {activeTapeResult.transcript && activeTapeResult.transcript.length > 0 ? (
                activeTapeResult.transcript.map((line: any, idx: number) => {
                  const isAI = line.speaker === 'AI';
                  const speakerLabel = isAI
                    ? '🤖 ChiefX AI Evelyn'
                    : `👤 ${isOutbound && activeTapeLead ? activeTapeLead.name : activeTapeResult.callerName}`;
                  return (
                    <div key={idx} className="flex flex-col" style={{ alignItems: isAI ? 'flex-start' : 'flex-end' }}>
                      <div className="flex items-center space-x-1.5 mb-1.5 text-[9px] text-slate-400 font-mono">
                        <span className="font-bold text-slate-600">{speakerLabel}</span>
                        <span>•</span>
                        <span>{line.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-5 py-3 text-[13px] font-sans leading-relaxed shadow-sm border ${
                          isAI
                            ? 'bg-blue-50/70 text-slate-800 rounded-tl-none border-blue-100/80'
                            : 'bg-slate-50 text-slate-700 rounded-tr-none border-slate-200'
                        }`}
                      >
                        {line.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-12">No conversation script captured.</p>
              )}
            </div>
          </div>

          {/* RIGHT: Checklist & Extraction Dashboard */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col h-full shadow-sm overflow-hidden">
            {/* AI Summary Section */}
            <div className="mb-4 shrink-0 bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-1.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block">AI Summarized Intake</span>
              <p className="text-slate-700 leading-relaxed text-xs italic font-sans">
                "{activeTapeResult.summary}"
              </p>
            </div>

            {isOutbound ? (
              <>
                <span className="text-xs font-mono text-slate-700 uppercase tracking-widest font-bold pb-3 border-b border-slate-100 mb-4 flex items-center gap-2 shrink-0">
                  <Check className="h-4.5 w-4.5 text-emerald-500" />
                  Extracted Campaign Answers
                </span>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {selectedTask.questions.map((question, qIdx) => {
                    const answer = activeTapeResult.answers?.[question];
                    return (
                      <div key={qIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 transition-all hover:border-slate-300/80">
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono shrink-0 font-bold">Q{qIdx + 1}</span>
                          <p className="font-medium text-xs leading-snug text-slate-700">{question}</p>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-lg px-3.5 py-3 font-sans text-xs shadow-sm">
                          {answer ? (
                            <div className="text-emerald-600 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold shrink-0 text-sm">✓</span>
                              <p className="text-slate-800 italic leading-relaxed">"{answer}"</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No answer captured.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 flex-1 overflow-y-auto">
                <span className="text-xs font-mono text-slate-700 uppercase tracking-widest font-bold block border-b border-slate-100 pb-2">Inbound Metadata</span>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Caller Name</span>
                    <span className="font-bold text-slate-700 block mt-0.5">{activeTapeResult.callerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Phone Number</span>
                    <span className="font-mono text-slate-700 block mt-0.5">{activeTapeResult.callerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Virtual Direct Line Called</span>
                    <span className="font-mono text-slate-700 block mt-0.5">{activeTapeResult.virtualNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Primary Inquiry Topic</span>
                    <span className="font-semibold text-blue-600 block mt-0.5">{activeTapeResult.topic}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Call Duration</span>
                    <span className="font-mono text-slate-700 block mt-0.5">{activeTapeResult.duration} seconds</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Recording Date</span>
                    <span className="font-mono text-slate-700 block mt-0.5">{new Date(activeTapeResult.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Auto-Dial Next Pending lead
  const handleAutoDialNext = () => {
    const nextPendingId = selectedTask.leadIds.find((lId) => {
      const res = selectedTask.callResults[lId];
      return !res || res.status === 'Pending';
    });

    if (nextPendingId) {
      const lead = leadsDatabase.find((l) => l.id === nextPendingId);
      if (lead) {
        handleInitiateTaskCall(lead);
      }
    } else {
      alert("All leads in today's task are already dialed!");
    }
  };

  // Quick speech suggestions based on active question
  const getSuggestionsForActiveQuestion = () => {
    if (activeQuestionIndex === 0) {
      return ["Yes, I definitely want to proceed!", "No, please cancel my request.", "I am in a bit of a rush."];
    }
    if (activeQuestionIndex === 1) {
      return ["I work full-time as a corporate employee", "I run my own business", "I earn around $6,000 every month"];
    }
    if (activeQuestionIndex === 2) {
      return ["My credit is excellent, around 750", "I have fair credit", "My credit score is close to 600"];
    }
    return ["Thank you, goodbye!", "When will you call me back?", "Yes, send me the links."];
  };

  // Inbound Caller Suggestions based on selected intent
  const getInboundSuggestions = () => {
    if (inboundStartingIntent === 'status') {
      return [
        "Did you approve my paystub document?",
        "What is the status of my loan verification?",
        "When will underwriting complete the review?",
        "Can I upload a bank statement instead of paystub?"
      ];
    }
    if (inboundStartingIntent === 'rates') {
      return [
        "What interest rates do you currently offer?",
        "Is the rate fixed or variable?",
        "Will pre-qualification affect my credit score?",
        "Do you have an automatic payment rate discount?"
      ];
    }
    if (inboundStartingIntent === 'payment') {
      return [
        "How do I set up automated autopay?",
        "Can I pay my monthly EMI via debit card?",
        "Is there a penalty for paying off the loan early?",
        "When is my first payment installment due?"
      ];
    }
    return [
      "I want to apply for a $35,000 personal loan.",
      "What are the eligibility requirements to borrow?",
      "Can I get a quick credit decision online?",
      "Thank you, that is extremely helpful!"
    ];
  };

  // Quick calculation for task metrics
  const totalLeadsInTask = selectedTask.leadIds.length;
  const completedLeadsInTask = Object.keys(selectedTask.callResults).map(k => selectedTask.callResults[k]).filter(r => r.status === 'Completed').length;
  const skippedLeadsInTask = Object.keys(selectedTask.callResults).map(k => selectedTask.callResults[k]).filter(r => r.status === 'Skipped').length;
  const conversionPercent = completedLeadsInTask > 0 
    ? Math.round((Object.keys(selectedTask.callResults).map(k => selectedTask.callResults[k]).filter(r => r.intent === 'Interested').length / completedLeadsInTask) * 100)
    : 0;

  return (
    <div id="voice-agent-dialer" className="p-8 space-y-6 overflow-y-auto h-screen w-full font-sans bg-slate-50/50">
      {/* Title Header with Mode Tabs Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Simulated Calling Center</h2>
          <p className="text-xs text-slate-500 mt-1">Configure automated workflows, initiate sequential campaigns, or trigger dynamic incoming calls to your virtual phone lines.</p>
        </div>
        
        {/* Modern Segmented Pill Control */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex">
            <button
              onClick={() => setDialerMode('outbound')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dialerMode === 'outbound'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Outbound Campaigns</span>
            </button>
            <button
              onClick={() => setDialerMode('inbound')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                dialerMode === 'inbound'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PhoneIncoming className="h-3.5 w-3.5" />
              <span>Inbound Virtual Center</span>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </div>

          {dialerMode === 'outbound' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/15 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Dialing Task
            </button>
          )}
        </div>
      </div>

      {dialerMode === 'outbound' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Assigned Tasks list - Bento Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <FileSpreadsheet className="h-4.5 w-4.5 mr-1.5 text-blue-600" /> Today's Assigned lists
            </h4>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded-full">
              {tasks.length} Active
            </span>
          </div>

          <p className="text-xs text-slate-400">Select an active call-list scheduled for today to monitor agent progress.</p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isActive = task.id === selectedTaskId;
              const completed = Object.keys(task.callResults).map(k => task.callResults[k]).filter((r) => r.status === 'Completed').length;
              const total = task.leadIds.length;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setPlayingTapeId(null);
                    setIsTapePlaying(false);
                  }}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex flex-col space-y-2.5 ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/25 shadow-sm'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1 flex-1">{task.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      task.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : task.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 animate-pulse'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Questions: {task.questions.length}</span>
                      <span>{completed}/{total} Dialed</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1">
                      <div className="bg-blue-600 h-1 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Stats Bento widget */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
            <div className="relative z-10 space-y-1">
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Calling Telemetry</span>
              <p className="text-lg font-bold">Continuous Dialer Mode</p>
              <p className="text-[10px] text-slate-400 leading-normal">
                AI parses voice audio stream, converts caller speech to text in real-time, matching questionnaire patterns instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Center Main Column: Selected Task Queue Workspace - Bento Card */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] font-mono text-blue-600 uppercase tracking-widest font-bold">Active Working List</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedTask.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Checklist questions to ask: <span className="font-semibold text-slate-700">{selectedTask.questions.length} questions sequential</span></p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoDialNext}
                  disabled={callState === 'dialing' || callState === 'connected'}
                  className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <PhoneCall className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Auto-Dial Next List Target
                </button>
              </div>
            </div>

            {/* Micro bento statistics metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Targets Loaded</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{totalLeadsInTask}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Recorded Dialed</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{completedLeadsInTask}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Skipped/No Answer</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{skippedLeadsInTask}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Conversion Rate</span>
                <p className="text-lg font-bold text-emerald-600 mt-1">{conversionPercent}%</p>
              </div>
            </div>

            {/* List Queue Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400">
                    <th className="px-4 py-2.5 font-semibold">Lead Contact</th>
                    <th className="px-4 py-2.5 font-semibold">Loan Req.</th>
                    <th className="px-4 py-2.5 font-semibold">Survey Status</th>
                    <th className="px-4 py-2.5 font-semibold">AI Sentiment</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Survey Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTask.leadIds.map((leadId) => {
                    const lead = leadsDatabase.find((l) => l.id === leadId);
                    if (!lead) return null;

                    const result = selectedTask.callResults[leadId];
                    const isCallingActive = activeLead?.id === leadId && (callState === 'dialing' || callState === 'connected');

                    return (
                      <tr key={leadId} className={`hover:bg-slate-50/50 transition-colors ${isCallingActive ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{lead.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{lead.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">
                          ${lead.amountRequested.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {isCallingActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md animate-pulse border border-blue-100">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                              Call Active
                            </span>
                          ) : result ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              result.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : result.status === 'Skipped'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {result.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                              Pending Dial
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {result?.sentiment ? (
                            <span className={`text-[10px] font-semibold ${
                              result.sentiment === 'Positive'
                                ? 'text-emerald-600'
                                : result.sentiment === 'Negative'
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}>
                              {result.sentiment}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {!result ? (
                              <>
                                <button
                                  onClick={() => handleSkipLead(leadId)}
                                  disabled={callState === 'dialing' || callState === 'connected'}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
                                >
                                  Skip
                                </button>
                                <button
                                  onClick={() => handleInitiateTaskCall(lead)}
                                  disabled={callState === 'dialing' || callState === 'connected'}
                                  className="text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <PhoneCall className="h-3 w-3" /> Dial
                                </button>
                              </>
                            ) : result.status === 'Completed' ? (
                              <button
                                onClick={() => handleOpenTapePlayer(leadId)}
                                className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Headphones className="h-3.5 w-3.5 text-blue-600" /> Play Recording
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInitiateTaskCall(lead)}
                                className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                              >
                                Redial
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Two columns workspace: Live Active Telephone Screen AND Call Cassette Tape Transcript History Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Telephone Simulator Frame */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <Disc className={`h-4.5 w-4.5 text-blue-400 ${callState === 'connected' ? 'animate-spin' : ''}`} />
              <span className="text-xs font-mono text-blue-300 font-bold uppercase tracking-widest">AI Call Simulator Screen</span>
            </div>
            {callState === 'connected' ? (
              <span className="text-[10px] font-mono text-red-400 font-bold flex items-center gap-1 bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                🔴 REC AUDIO ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Line Standing By</span>
            )}
          </div>

          {activeLead ? (
            <div className="space-y-4">
              {/* Active Call details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 p-4 rounded-xl border border-white/5 gap-2">
                <div>
                  <h5 className="text-xs text-slate-400 font-mono">CALLEE TARGET</h5>
                  <p className="text-sm font-bold text-slate-100 font-display mt-0.5">{activeLead.name}</p>
                  <p className="text-[10px] text-blue-300 font-mono mt-0.5">{activeLead.phone} • requested ${activeLead.amountRequested.toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <h5 className="text-xs text-slate-400 font-mono">DIAL TIMER</h5>
                  <p className="text-md font-mono font-bold text-slate-100 mt-0.5">
                    {callState === 'connected' ? formatTime(duration) : '00:00'}
                  </p>
                </div>
              </div>

              {/* Questionnaire Progress checklist inside phone hud */}
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-2.5">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block">Questionnaire Steps asked by AI:</span>
                <div className="space-y-1.5 text-[11px]">
                  {selectedTask.questions.map((q, idx) => {
                    const isAsked = idx < activeQuestionIndex;
                    const isCurrent = idx === activeQuestionIndex && callState === 'connected';

                    return (
                      <div key={idx} className={`flex items-start gap-2 p-1.5 rounded ${
                        isCurrent ? 'bg-blue-900/30 border border-blue-800/40' : 'opacity-60'
                      }`}>
                        {isAsked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : isCurrent ? (
                          <span className="h-4 w-4 rounded-full border border-blue-400 flex items-center justify-center text-[10px] text-blue-300 font-bold animate-pulse shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                        )}
                        <p className={`leading-relaxed ${isCurrent ? 'font-bold text-slate-100' : 'text-slate-300'}`}>{q}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Call Control Action buttons */}
              <div className="flex items-center justify-center pt-2">
                {callState === 'idle' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="h-12 w-12 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mx-auto">
                      <PhoneCall className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-slate-400">Selected target ready for outbound dial. Initiate line now.</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button
                        onClick={() => handleInitiateTaskCall(activeLead)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Simulate Call
                      </button>
                      <button
                        onClick={() => handleInitiateTwilioCall(activeLead)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Dial via Twilio
                      </button>
                      <button
                        onClick={() => handleInitiateVobizCall(activeLead)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Dial via Vobiz.ai
                      </button>
                    </div>
                  </div>
                )}

                {callState === 'dialing' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400 animate-ping mx-auto">
                      <Volume2 className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-amber-400 font-mono">Securing carrier trunk line...</p>
                    <button
                      onClick={() => setCallState('idle')}
                      className="px-4 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Cancel Outbound Connection
                    </button>
                  </div>
                )}

                {callState === 'connected' && (
                  <button
                    onClick={vobizCallSid ? handleHangupVobizCall : (twilioCallSid ? handleHangupTwilioCall : handleHangupCall)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg"
                  >
                    <PhoneOff className="h-4.5 w-4.5 mr-2" /> Disconnect Call (Finish & Save Recording)
                  </button>
                )}

                {callState === 'completed' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="h-12 w-12 bg-emerald-600/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
                      <ThumbsUp className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-slate-200 font-semibold">Call successfully finished & saved to tape recorder!</p>
                    <p className="text-[10px] text-slate-400">Speech transcript has been parsed and answers extracted.</p>
                    <button
                      onClick={() => setCallState('idle')}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-xs rounded-lg cursor-pointer text-white"
                    >
                      Ready Next Dial
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
              <PhoneCall className="h-8 w-8 text-slate-600 animate-pulse" />
              <p className="text-xs text-slate-400">No active connection. Choose a target from the list above and click "Dial" to start.</p>
            </div>
          )}
        </div>

        {/* Live Active Transcript / Simulation Speech Feed */}
        <div className="lg:col-span-6 bg-slate-950 rounded-2xl border border-slate-900 shadow-xl flex flex-col h-[400px] text-white">
          <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs font-mono text-blue-400 uppercase tracking-widest flex items-center">
              <MessageSquare className="h-4.5 w-4.5 mr-2" /> Active Dialogue feed
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">AUDIO STREAM PARSING</span>
            </div>
          </div>

          {/* Transcript bubbles */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length > 0 ? (
              transcript.map((line, idx) => {
                const isAI = line.speaker === 'AI';
                return (
                  <div key={idx} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] text-slate-500 font-mono mb-1">{line.speaker} • {line.timestamp}</span>
                    <div
                      className={`rounded-2xl px-4 py-2 text-xs font-sans leading-relaxed ${
                        isAI
                          ? 'bg-blue-900 text-blue-50 rounded-tl-none'
                          : 'bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700/50'
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <Mic className="h-8 w-8 text-slate-600 animate-pulse" />
                <p className="text-xs text-slate-400">Awaiting telephone call connection to parse audio waves...</p>
              </div>
            )}

            {isAiResponding && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-slate-500 font-mono mb-1">AI Evelyn • Thinking</span>
                <div className="bg-blue-950/50 border border-blue-900/40 text-blue-300 rounded-2xl rounded-tl-none px-4 py-2 flex items-center space-x-2 text-xs">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>AI Agent Evelyn is evaluating customer utterance...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef}></div>
          </div>

          {/* Caller Interactive Speech Simulation pad */}
          {callState === 'connected' && (
            <div className="p-3 border-t border-slate-900 bg-slate-900/30 space-y-2.5">
              {/* Quick simulation helper response chips */}
              <div className="flex flex-wrap gap-1.5">
                {getSuggestionsForActiveQuestion().map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setCustomerUtterance(suggestion);
                      handleSendUtterance(suggestion);
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-blue-900 hover:text-white text-slate-300 border border-slate-700/60 rounded px-2.5 py-1 transition-all cursor-pointer"
                  >
                    🎤 Say: "{suggestion}"
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendUtterance(customerUtterance);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={customerUtterance}
                  onChange={(e) => setCustomerUtterance(e.target.value)}
                  placeholder="Type customer reply here..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
        </>
      ) : (
        /* INBOUND CALL CENTER SIMULATOR & MONITOR SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Inbound Virtual Configuration & Caller Generator Deck */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. Active Virtual Lines bento card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <PhoneForwarded className="h-4.5 w-4.5 text-blue-600 animate-pulse" /> Active Inbound Numbers
                </h4>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded-full">
                  {activeVirtualNumbers.length} Online
                </span>
              </div>
              
              <div className="space-y-3.5">
                {activeVirtualNumbers.map((vNum) => {
                  const isSelected = selectedInboundNumber === vNum.number;
                  return (
                    <button
                      key={vNum.id}
                      onClick={() => {
                        if (inboundCallState === 'idle') {
                          setSelectedInboundNumber(vNum.number);
                        }
                      }}
                      disabled={inboundCallState !== 'idle'}
                      className={`w-full p-4 rounded-xl text-left border transition-all flex flex-col space-y-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                          : 'border-slate-100 hover:bg-slate-50 disabled:opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="text-xs font-bold text-slate-800 font-mono">{vNum.number}</span>
                        <span className="text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {vNum.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate">{vNum.friendlyName}</div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 border-t border-slate-50 pt-1.5">
                        <span>Inbound Logs: {vNum.incomingCallCount}</span>
                        <span>Carrier: {vNum.provider}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Inbound Caller Simulation Engine bento card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="h-4.5 w-4.5 text-blue-600" /> Caller Simulation Engine
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">Configure caller variables and prompt parameters, then click fire to simulate incoming connections on the virtual trunk lines.</p>
              </div>

              {/* Selector: Caller Identity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Simulated Caller Profile</label>
                <select
                  value={selectedInboundCallerId}
                  onChange={(e) => setSelectedInboundCallerId(e.target.value)}
                  disabled={inboundCallState !== 'idle'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="new">🆕 Anonymous / New Lending Inquiry</option>
                  {leadsDatabase.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      👤 CRM: {lead.name} ({lead.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Inputs: If custom anonymous caller */}
              {selectedInboundCallerId === 'new' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Caller Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rebecca Sterling"
                      value={customInboundCallerName}
                      onChange={(e) => setCustomInboundCallerName(e.target.value)}
                      disabled={inboundCallState !== 'idle'}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Phone number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 304-2090"
                      value={customInboundCallerPhone}
                      onChange={(e) => setCustomInboundCallerPhone(e.target.value)}
                      disabled={inboundCallState !== 'idle'}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Selector: Inquiry Intent */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Lending Inquiry Topic</label>
                <select
                  value={inboundStartingIntent}
                  onChange={(e: any) => setInboundStartingIntent(e.target.value)}
                  disabled={inboundCallState !== 'idle'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="status">📑 Verify paystub/document approval status</option>
                  <option value="apply">💵 Apply for a digital personal loan</option>
                  <option value="rates">📈 Request interest rates & credit APR quote</option>
                  <option value="payment">💳 Monthly EMI payments and billing support</option>
                </select>
              </div>

              {/* Slider: simulated requested loan amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600">Simulated Amount Involved</label>
                  <span className="text-xs font-bold text-blue-600">${inboundLoanAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="150000"
                  step="5000"
                  value={inboundLoanAmount}
                  onChange={(e) => setInboundLoanAmount(Number(e.target.value))}
                  disabled={inboundCallState !== 'idle'}
                  className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

              {/* Pulse Caller Trigger Button */}
              {inboundCallState === 'idle' ? (
                <button
                  onClick={handleTriggerInboundCall}
                  className="w-full py-3 bg-slate-900 hover:bg-blue-600 hover:scale-[1.01] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-blue-600/15 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <PhoneIncoming className="h-4 w-4 text-emerald-400 animate-pulse" />
                  Trigger Simulated Inbound Call
                </button>
              ) : (
                <div className="w-full py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold text-center animate-pulse">
                  📞 Inbound line connection active
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Inbound Console OR Conversation History Logs */}
          <div className="lg:col-span-8 flex flex-col h-full space-y-6">
            {inboundCallState !== 'idle' ? (
              /* LIVE ACTIVE CALL MONITOR PANEL */
              <div className="bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl flex flex-col min-h-[580px] overflow-hidden text-white animate-fadeIn">
                {/* 1. Live Caller Telephone Status HUD */}
                <div className="p-6 border-b border-slate-900 bg-slate-900/45 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <User className="h-6 w-6" />
                      </div>
                      {inboundCallState === 'ringing' && (
                        <span className="absolute top-0 right-0 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                      )}
                      {inboundCallState === 'connected' && (
                        <span className="absolute top-0 right-0 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100 font-display">{inboundCaller?.name}</h4>
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          inboundCallState === 'ringing'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse'
                            : inboundCallState === 'connected'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {inboundCallState === 'ringing' ? 'Incoming Ringing...' : 'Connected • Recording'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Caller Number: <span className="text-slate-300 font-bold">{inboundCaller?.phone}</span> • Dialed: <span className="text-blue-400 font-bold">{selectedInboundNumber}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right HUD Metrics */}
                  <div className="text-left sm:text-right shrink-0 bg-slate-900/30 px-4 py-2 border border-slate-900 rounded-2xl flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-0.5 w-full sm:w-auto">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">LIVE CALL MONITOR</span>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      {inboundCallState === 'connected' && (
                        <span className="text-[9px] font-mono text-rose-500 font-bold animate-pulse flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          🔴 RECORDING
                        </span>
                      )}
                      <span className="font-mono text-sm font-bold text-slate-100">{formatTime(inboundDuration)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Topic Context Bar */}
                <div className="px-6 py-2.5 bg-slate-900/20 border-b border-slate-900 text-xs flex justify-between items-center text-slate-400 gap-4">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 uppercase font-mono font-bold tracking-wider text-[9px]">Topic:</span>
                    <span className="font-semibold text-blue-400 truncate">{inboundTopic}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                    <span>Sentiment: <strong className="text-emerald-400">{inboundSentiment}</strong></span>
                    <span>Intent: <strong className="text-blue-400">{inboundIntent}</strong></span>
                  </div>
                </div>

                {/* 3. Live Dialogue transcripts scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-[250px] max-h-[350px]">
                  {inboundTranscript.length > 0 ? (
                    inboundTranscript.map((line, idx) => {
                      const isAI = line.speaker === 'AI';
                      return (
                        <div key={idx} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} animate-fadeIn`}>
                          <span className="text-[9px] text-slate-500 font-mono mb-1.5">
                            {isAI ? '🤖 AI Evelyn' : `👤 ${inboundCaller?.name}`} • {line.timestamp}
                          </span>
                          <div
                            className={`rounded-2xl px-5 py-3 text-[12.5px] font-sans leading-relaxed shadow-sm max-w-[85%] ${
                              isAI
                                ? 'bg-blue-900 text-blue-50 rounded-tl-none border-l-4 border-blue-500'
                                : 'bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700/50'
                            }`}
                          >
                            {line.text}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3.5 py-12">
                      <Volume2 className="h-10 w-10 text-slate-700 animate-bounce" />
                      <div className="text-center">
                        <p className="text-xs text-slate-300 font-bold">Simulated Phone Line Ringing</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Click "Accept Call" in the console below to pick up and let AI Evelyn answer.</p>
                      </div>
                    </div>
                  )}

                  {isInboundAiResponding && (
                    <div className="flex flex-col items-start animate-fadeIn">
                      <span className="text-[9px] text-slate-500 font-mono mb-1.5">AI Evelyn • Processing Voice Stream</span>
                      <div className="bg-blue-950/65 border border-blue-900/40 text-blue-300 rounded-2xl rounded-tl-none px-5 py-3 flex items-center space-x-2.5 text-xs">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                        <span>Evelyn is evaluating caller speech waves...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef}></div>
                </div>

                {/* 4. Interactive Caller simulator keypad & controls */}
                <div className="p-5 border-t border-slate-900 bg-slate-900/35 space-y-4 shrink-0">
                  {/* Phone controls depending on callState */}
                  <div className="flex justify-center items-center gap-4 border-b border-slate-900/45 pb-3">
                    {inboundCallState === 'ringing' && (
                      <>
                        <button
                          onClick={handleAcceptInboundCall}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/15 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Accept Inbound Call
                        </button>
                        <button
                          onClick={handleDeclineInboundCall}
                          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/15 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <PhoneOff className="h-4 w-4" />
                          Decline / Route to Voicemail
                        </button>
                      </>
                    )}

                    {inboundCallState === 'connected' && (
                      <button
                        onClick={handleHangupInboundCall}
                        className="px-8 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/15 transition-all cursor-pointer flex items-center gap-2 mx-auto"
                      >
                        <PhoneOff className="h-4 w-4" />
                        Hang Up & File Recording
                      </button>
                    )}

                    {inboundCallState === 'completed' && (
                      <div className="text-center py-2 space-y-2">
                        <p className="text-xs text-slate-400">Call successfully archived. Dialogue files stored securely.</p>
                        <button
                          onClick={() => {
                            setInboundCallState('idle');
                            setInboundCaller(null);
                          }}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                        >
                          Clear Line & Return to Desk
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Caller speech input (Only visible when connected) */}
                  {inboundCallState === 'connected' && (
                    <div className="space-y-3">
                      {/* Suggestion Chips context-specific to the intent selected */}
                      <div className="flex flex-wrap gap-2">
                        {getInboundSuggestions().map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              setInboundCustomerUtterance(suggestion);
                              handleSendInboundUtterance(suggestion);
                            }}
                            className="text-[10px] bg-slate-900 hover:bg-blue-900 hover:text-white text-slate-300 border border-slate-800 rounded px-3 py-1.5 transition-all cursor-pointer font-sans"
                          >
                            🎤 Say: "{suggestion}"
                          </button>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendInboundUtterance(inboundCustomerUtterance);
                        }}
                        className="flex items-center space-x-2.5"
                      >
                        <input
                          type="text"
                          value={inboundCustomerUtterance}
                          onChange={(e) => setInboundCustomerUtterance(e.target.value)}
                          placeholder={`Type simulated ${inboundCaller?.name || 'Customer'} voice reply here...`}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!inboundCustomerUtterance.trim() || isInboundAiResponding}
                          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* INBOUND HISTORY LOGS DECK */
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[580px] space-y-6">
                <div className="space-y-4">
                  {/* Stats banner */}
                  <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-5">
                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">Inbound Volume</span>
                      <p className="text-xl font-bold text-slate-800">{inboundCallLogs.length}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">Average Duration</span>
                      <p className="text-xl font-bold text-slate-800">
                        {inboundCallLogs.length > 0
                          ? Math.round(inboundCallLogs.reduce((acc, l) => acc + l.duration, 0) / inboundCallLogs.length)
                          : 0}s
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">Positive Rate</span>
                      <p className="text-xl font-bold text-slate-800">
                        {inboundCallLogs.length > 0
                          ? Math.round((inboundCallLogs.filter(l => l.sentiment === 'Positive').length / inboundCallLogs.length) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                        <History className="h-4.5 w-4.5 text-blue-600" /> Inbound Dialogue History
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Audit audio recording tapes and view AI extracted summaries of incoming calls.</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Clear all inbound logs and recordings?')) {
                          setInboundCallLogs([]);
                        }
                      }}
                      className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                    >
                      Clear History
                    </button>
                  </div>

                  {/* Logs list */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {inboundCallLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div className="space-y-1.5 max-w-lg">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{log.callerName}</span>
                            <span className="text-[9px] font-mono text-slate-500">{log.callerPhone}</span>
                            <span className="text-[9px] font-mono text-slate-400">•</span>
                            <span className="text-[9px] font-mono text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <p className="text-[11px] text-slate-600 italic font-medium leading-relaxed font-sans line-clamp-2">
                            "{log.summary}"
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[9px] font-mono text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                              Line: {log.virtualNumber}
                            </span>
                            <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                              Topic: {log.topic}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              Duration: {log.duration}s
                            </span>
                          </div>
                        </div>

                        {/* Tape playback button */}
                        <button
                          onClick={() => handleOpenTapePlayer(log.id, 'inbound')}
                          className="px-3.5 py-2 bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 hover:border-blue-600 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1 shrink-0"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Play Tape
                        </button>
                      </div>
                    ))}

                    {inboundCallLogs.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                        <Inbox className="h-8 w-8 text-slate-400 mx-auto animate-bounce" />
                        <p className="text-xs text-slate-400 font-medium">No inbound voice tapes logged today.</p>
                        <p className="text-[10px] text-slate-400">Trigger an incoming simulation on the left to start recording.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Information badge footer */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl relative overflow-hidden shrink-0 mt-4">
                  <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 flex items-center space-x-3 text-xs leading-normal">
                    <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-slate-300">
                      Our virtual number routing maps inbound SIP audio streaming directly to the <strong>Evelyn CRM Intelligence engine</strong>, recording and parsing customer responses under 150ms.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL: Assign New Daily Dialing Task */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Assign Daily Outbound Dialing Task</h3>
                <p className="text-xs text-slate-500 mt-1">Set up list criteria, type specific sequential questions, and activate call audio recording.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-5">
              {/* Task Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Task Name / Campaign Theme</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Pre-Qualification Callback List"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Define Questions sequential flow */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Questions Questionnaire (Sequential Flow)</label>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Our virtual voice assistant Evelyn will ask these questions one by one. She automatically processes the caller speech, records the timeline, and advances to the next question.
                </p>

                {/* Question List */}
                <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {newQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">Q{idx + 1}:</span>
                      <p className="text-xs text-slate-700 truncate flex-1 font-medium">{q}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {newQuestions.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">No questions defined yet. Please add at least one question below.</p>
                  )}
                </div>

                {/* Add Question row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a new survey question (e.g., Do you currently rent or own?)"
                    value={tempQuestionInput}
                    onChange={(e) => setTempQuestionInput(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
                  >
                    Add Question
                  </button>
                </div>
              </div>

              {/* Select Leads checklist */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-600 block">Select Target Numbers / Leads ({selectedFormLeadIds.length} chosen)</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = leadsDatabase.filter((lead) => {
                          const query = modalLeadSearch.toLowerCase();
                          return lead.name.toLowerCase().includes(query) || lead.phone.includes(query) || lead.source.toLowerCase().includes(query);
                        }).map((l) => l.id);
                        setSelectedFormLeadIds(Array.from(new Set([...selectedFormLeadIds, ...filtered])));
                      }}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Select All Filtered
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFormLeadIds([])}
                      className="text-[10px] text-slate-500 font-semibold hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Search filter for task creation */}
                <input
                  type="text"
                  placeholder="Filter contacts by name, phone or source (e.g., CSV Bulk Upload)..."
                  value={modalLeadSearch}
                  onChange={(e) => setModalLeadSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-36 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {leadsDatabase
                    .filter((lead) => {
                      const query = modalLeadSearch.toLowerCase();
                      return lead.name.toLowerCase().includes(query) || lead.phone.includes(query) || lead.source.toLowerCase().includes(query);
                    })
                    .map((lead) => {
                      const isChecked = selectedFormLeadIds.includes(lead.id);
                      return (
                        <button
                          type="button"
                          key={lead.id}
                          onClick={() => handleToggleLeadSelection(lead.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                            isChecked
                              ? 'border-blue-600 bg-blue-50/45 shadow-sm'
                              : 'border-white bg-white hover:bg-slate-100'
                          }`}
                        >
                          <div className="space-y-0.5 truncate max-w-[180px]">
                            <p className="text-xs font-bold text-slate-800 truncate">{lead.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{lead.phone} • {lead.source}</p>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  {leadsDatabase.filter((lead) => {
                    const query = modalLeadSearch.toLowerCase();
                    return lead.name.toLowerCase().includes(query) || lead.phone.includes(query) || lead.source.toLowerCase().includes(query);
                  }).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center col-span-2 py-4">No contacts match the filter query.</p>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer"
                >
                  Create & Load Dialing Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INBOUND CALL INDICATION POPUP */}
      {inboundCallState === 'ringing' && inboundCaller && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-white space-y-6 relative overflow-hidden border-t-4 border-t-indigo-500">
            {/* Ambient glowing background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
            
            {/* Pulsing Flashing Ringing Indicator Header */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {/* Concentric rings pulsing */}
                <span className="absolute -inset-4 rounded-full bg-indigo-500/15 animate-ping opacity-75"></span>
                <span className="absolute -inset-8 rounded-full bg-indigo-500/5 animate-pulse"></span>
                <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 animate-bounce">
                  <PhoneIncoming className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-900 px-3 py-1 rounded-full">
                  Incoming Virtual Call
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white mt-2">Incoming Simulated Inbound Call</h3>
                <p className="text-xs text-slate-400 font-medium">Virtual Direct Line: {selectedInboundNumber}</p>
              </div>
            </div>

            {/* Caller Details Card */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{inboundCaller.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{inboundCaller.phone}</p>
                </div>
              </div>

              <div className="h-px bg-slate-800/60"></div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">Estimated Topic</span>
                  <span className="text-slate-200 font-medium">{inboundTopic}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">Loan Request</span>
                  <span className="text-slate-200 font-mono font-medium">${inboundCaller.amountRequested?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Auto Attend Status & Countdown Control */}
            <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">AI Automatic Routing</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>AI Agent is automatically answering...</span>
                  <span className="font-bold font-mono text-emerald-400">0:0{autoAttendCountdown}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(autoAttendCountdown / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleDeclineInboundCall}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-300 border border-slate-700/60 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <PhoneOff className="h-4 w-4 text-rose-500" />
                Decline
              </button>
              <button
                onClick={handleAcceptInboundCall}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4 text-emerald-400" />
                Attend Instantly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
