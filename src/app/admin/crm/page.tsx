"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, User, MessageSquare, Phone, MapPin, Target, Send, Calendar, CheckCircle2, X, ChevronRight, Briefcase, Clock, Wallet } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function LeadManagement() {
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchLeads = async () => {
            const { data } = await supabase
                .from('vendor_leads')
                .select('*, customers(*)')
                .order('created_at', { ascending: false });

            if (data) {
                setLeads(data);
            }
            setLoading(false);
        };

        fetchLeads();
    }, []);

    const filteredLeads = leads.filter(l =>
        (l.customers?.name || "Anonymous").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.customers?.phone || "").includes(searchQuery)
    );

    const handleSelectLead = (lead: any) => {
        setSelectedLead(lead);
    };

    if (loading) {
        return (
            <div className="flex-1 h-[60vh] flex flex-col justify-center items-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Scanning leads...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
            {/* Lead List Sidebar */}
            <div className="w-[400px] flex flex-col bg-white border-r border-slate-200 relative z-10">
                <div className="p-8 border-b border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Leads Pipeline</h2>
                    <div className="relative group">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find leads by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {filteredLeads.length === 0 ? (
                        <div className="text-center py-20">
                            <User className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold text-sm">No leads found</p>
                        </div>
                    ) : (
                        filteredLeads.map(lead => (
                            <button
                                key={lead.id}
                                onClick={() => handleSelectLead(lead)}
                                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group relative ${selectedLead?.id === lead.id
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                                    : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`font-bold tracking-tight truncate pr-2 ${selectedLead?.id === lead.id ? 'text-white' : 'text-slate-900'}`}>
                                        {lead.customers?.name || "Anonymous Lead"}
                                    </div>
                                    <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap ${selectedLead?.id === lead.id
                                        ? 'bg-white/20 text-white'
                                        : lead.intent_score === 'Hot' ? 'bg-rose-50 text-rose-600' :
                                            lead.intent_score === 'Warm' ? 'bg-amber-50 text-amber-600' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {lead.intent_score}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <div className={`font-medium ${selectedLead?.id === lead.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                        {lead.customers?.phone || "N/A"}
                                    </div>
                                    <div className={`font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded ${selectedLead?.id === lead.id ? 'bg-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {lead.vendor_id}
                                    </div>
                                </div>
                                {selectedLead?.id === lead.id && (
                                    <ChevronRight className="absolute -right-2 top-1/2 -translate-y-1/2 text-white w-5 h-5 drop-shadow-md lg:block hidden" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Slide-over / Details Panel */}
            <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
                {selectedLead ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        {/* Header */}
                        <div className="bg-white p-8 border-b border-slate-200 flex items-start justify-between">
                            <div className="flex gap-6">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                    <User className="w-10 h-10" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Lead Prospect</div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedLead.customers?.name || "Anonymous User"}</h2>
                                    <div className="flex items-center gap-6 mt-3">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                            <Phone className="w-4 h-4 text-indigo-500" /> {selectedLead.customers?.phone || "No phone"}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                            <MapPin className="w-4 h-4 text-indigo-500" /> {selectedLead.vendor_id}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                            <Calendar className="w-4 h-4 text-indigo-500" /> Member since {new Date(selectedLead.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
                                    <Clock className="w-5 h-5" />
                                </button>
                                <button className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                                    <Send className="w-4 h-4" /> Reach Out
                                </button>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="p-3 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            {/* AI Intelligence Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {(() => {
                                    try {
                                        const data = JSON.parse(selectedLead.intent_summary || "{}");
                                        const insights = data.insights || {};
                                        return (
                                            <>
                                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-b-4 border-b-indigo-500">
                                                    <div className="flex items-center gap-3 mb-4 text-indigo-600">
                                                        <Wallet className="w-5 h-5" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Budget Constraint</span>
                                                    </div>
                                                    <div className="text-xl font-bold text-slate-900">{insights.budget || "Not Stated"}</div>
                                                </div>
                                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-b-4 border-b-indigo-500">
                                                    <div className="flex items-center gap-3 mb-4 text-indigo-600">
                                                        <Briefcase className="w-5 h-5" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Primary Use Case</span>
                                                    </div>
                                                    <div className="text-xl font-bold text-slate-900 truncate">{insights.use_case || "Professional"}</div>
                                                </div>
                                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-b-4 border-b-rose-500">
                                                    <div className="flex items-center gap-3 mb-4 text-rose-600">
                                                        <Target className="w-5 h-5" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Lead Urgency</span>
                                                    </div>
                                                    <div className="text-xl font-bold text-slate-900">{insights.urgency || "Moderate"}</div>
                                                </div>
                                            </>
                                        );
                                    } catch (e) {
                                        return <div className="col-span-3 text-sm text-slate-400 font-bold uppercase tracking-widest bg-white p-6 rounded-3xl border border-slate-200">Intelligence pending vinnie analysis...</div>;
                                    }
                                })()}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Left Col: Conversation History */}
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        <MessageSquare className="w-5 h-5 text-slate-400" />
                                        Vini AI Transcript
                                    </h3>
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                                        {(!selectedLead.chat_transcript || selectedLead.chat_transcript.length === 0) ? (
                                            <div className="text-center py-20 text-slate-300 font-bold italic">No interaction history found</div>
                                        ) : (
                                            selectedLead.chat_transcript.map((msg: any, i: number) => (
                                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-[85%] p-5 rounded-3xl text-sm ${msg.role === 'user'
                                                        ? 'bg-slate-900 text-white rounded-br-none'
                                                        : 'bg-slate-50 text-slate-900 rounded-bl-none border border-slate-100'
                                                        }`}>
                                                        <div className="prose prose-sm prose-slate leading-relaxed">
                                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase mt-2 px-1">
                                                        {msg.role === 'user' ? 'Customer' : 'Vini AI'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Right Col: Interaction Plan & Vendor History */}
                                <div className="space-y-10">
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                            AI Predicted Sales Plan
                                        </h3>
                                        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
                                            {(selectedLead.engagement_plan || [
                                                { day: "Day 1", action: "Send digital brochure via WhatsApp based on car interest." },
                                                { day: "Day 3", action: "Trigger call to offer virtual 360 tour or test drive." },
                                                { day: "Day 7", action: "Automate customized financing proposal notification." },
                                                { day: "Day 14", action: "Final follow-up or re-engagement with new inventory." }
                                            ]).map((step: any, i: number) => (
                                                <div key={i} className="flex gap-6 group relative">
                                                    {i !== 3 && <div className="absolute left-[23px] top-10 bottom-[-32px] w-0.5 bg-slate-100 group-last:hidden"></div>}
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[10px] shrink-0 z-10 ${step.active || i < 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-300'}`}>
                                                        {step.day || step.d}
                                                    </div>
                                                    <div className="pt-1.5 opacity-70 group-hover:opacity-100 transition-all">
                                                        <p className="text-sm font-bold text-slate-900 leading-snug">{step.action || step.a}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-indigo-500" />
                                            Vendor Interaction History
                                        </h3>
                                        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-4">
                                            {leads.filter(l => l.customer_id === selectedLead.customer_id).map((l, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{l.vendor_id}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{l.stage} • {l.intent_score}</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => setSelectedLead(l)}
                                                        className="text-[10px] font-black text-indigo-600 uppercase bg-white px-3 py-1 rounded-lg border border-slate-200 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center p-20 text-center animate-in fade-in duration-500">
                        <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-200 shadow-inner">
                            <User className="w-16 h-16" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Lead Detail Terminal</h2>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                            Click on a prospect from the pipeline on the left to start analyzing their intent and engagement plan.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
