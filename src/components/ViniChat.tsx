"use client";

import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { Bot, User, Send, X, MessageSquare, Loader2, Target, Calendar, Phone, MapPin, Clock, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import confetti from 'canvas-confetti';

const bookingSchema = z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(10, "Valid phone is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    location: z.enum(['Home', 'Showroom'])
});

type BookingData = z.infer<typeof bookingSchema>;

export default function ViniChat({ 
    userStage = 'Presales',
    customerId,
    vendorId = 'dealer_default' 
}: { 
    userStage?: string;
    customerId?: string;
    vendorId?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [currentStage, setCurrentStage] = useState(userStage);
    const [isUpdatingStage, setIsUpdatingStage] = useState(false);

    const initialMessage = {
        id: '1',
        role: 'assistant' as const,
        parts: [{
            type: 'text' as const,
            text: userStage === 'Presales' ? "Hi! I'm Vini. What's your name? I'd love to help you find your dream car!" :
                userStage === 'Sales' ? "Welcome back! Ready to book a test drive for your favorite car?" :
                    "Welcome back to SpyneAuto! How can I help you today?"
        }]
    } as UIMessage;

    const { messages, sendMessage, status, addToolResult, setMessages } = useChat({
        messages: [initialMessage]
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const triggerManualDemo = (userMsgText?: string) => {
        const demoToolCallId = `manual-${Date.now()}`;
        const newMessages = [...messages];
        
        if (userMsgText) {
            newMessages.push({
                id: Date.now().toString(),
                role: 'user',
                parts: [{ type: 'text', text: userMsgText }]
            } as UIMessage);
        }

        const manualBotMessage: UIMessage = {
            id: `manual-bot-${Date.now()}`,
            role: 'assistant',
            parts: [
                { type: 'text', text: "Of course! Let's get that scheduled for you. Please provide your details below:" },
                { 
                    type: 'tool-invocation', 
                    toolName: 'book_demo',
                    toolCallId: demoToolCallId,
                    state: 'call',
                    input: {}
                } as any
            ]
        };
        
        setMessages([...newMessages, manualBotMessage]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || isLoading) return;

        // Manual keyword detection
        const demoKeywords = ["book demo", "test drive", "book test drive", "request call"];
        const isDemoRequest = demoKeywords.some(k => text.toLowerCase().includes(k));

        if (isDemoRequest) {
            triggerManualDemo(text);
            setInput("");
            return;
        }

        const userMsg: UIMessage = {
            id: Date.now().toString(),
            role: 'user',
            parts: [{ type: 'text', text: text }]
        };

        sendMessage(userMsg, { body: { stage: currentStage, customer_id: customerId, vendor_id: vendorId } });
        setInput("");
    };

    useEffect(() => {
        const handleOpenChat = (event: any) => {
            const { message } = event.detail;
            setIsOpen(true);
            if (message) {
                // Check keywords even for custom events
                const demoKeywords = ["book demo", "test drive", "book test drive", "request call"];
                if (demoKeywords.some(k => message.toLowerCase().includes(k))) {
                    triggerManualDemo(message);
                } else {
                    const userMsg: UIMessage = {
                        id: Date.now().toString(),
                        role: 'user',
                        parts: [{ type: 'text', text: message }]
                    };
                    sendMessage(userMsg, { body: { stage: currentStage, customer_id: customerId, vendor_id: vendorId } });
                }
            }
        };

        window.addEventListener('vini-chat-open', handleOpenChat as any);
        return () => window.removeEventListener('vini-chat-open', handleOpenChat as any);
    }, [currentStage, sendMessage, messages, setMessages]); // Added setMessages and messages to deps for triggerManualDemo safety

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- TOOL RENDERING HELPERS ---

    const CarCarousel = ({ cars }: { cars: any[] }) => {
        return (
            <div className="w-full -mx-3 px-3 overflow-hidden">
                <div className="flex flex-row overflow-x-auto gap-4 snap-x snap-mandatory pb-4 pt-2 scrollbar-hide no-scrollbar">
                    {cars.map((car, i) => (
                        <div 
                            key={i} 
                            onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/car/${car.id}`;
                            }}
                            className="w-[220px] h-[220px] flex-shrink-0 snap-start bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow group/card"
                        >
                            {/* Top Half: Image */}
                            <div className="h-[110px] w-full bg-slate-100 relative overflow-hidden">
                                <img 
                                    src={car.image_url} 
                                    alt={`${car.make} ${car.model}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://placehold.co/220x110/f1f5f9/94a3b8?text=🚗';
                                    }}
                                />
                            </div>
                            
                            {/* Bottom Half: Details */}
                            <div className="p-3 flex flex-col justify-between h-[110px]">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 truncate">
                                        {car.year} {car.make} {car.model}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 truncate mt-1 uppercase tracking-tight font-medium">
                                        {car.type} • {car.overview?.fuel_type || 'Petrol'}
                                    </p>
                                </div>
                                <div className="text-lg font-black text-indigo-600">
                                    ${car.price.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const BookingForm = ({ toolInvocation, addToolResult, customerId }: { toolInvocation: any, addToolResult: any, customerId?: string }) => {
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [submitted, setSubmitted] = useState(false);
        const { register, handleSubmit, formState: { errors }, setValue } = useForm<BookingData>({
            resolver: zodResolver(bookingSchema),
            defaultValues: {
                name: toolInvocation?.input?.name || "",
                phone: toolInvocation?.input?.phone || "",
                location: 'Showroom'
            }
        });

        // Pre-fill from Supabase
        useEffect(() => {
            if (!customerId) return;
            const fetchUser = async () => {
                const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
                if (data) {
                    if (!toolInvocation?.input?.name) setValue('name', data.name || "");
                    if (!toolInvocation?.input?.phone) setValue('phone', data.phone || "");
                }
            };
            fetchUser();
        }, [customerId, setValue, toolInvocation?.input]);

        const onFormSubmit = async (data: BookingData) => {
            setIsSubmitting(true);
            try {
                // 1. Direct Supabase Update (Manual Bypass)
                if (customerId) {
                    // Ensure Customer exists (Upsert)
                    await supabase.from('customers').upsert({ 
                        id: customerId,
                        name: data.name, 
                        phone: data.phone 
                    });

                    // Update Lead Stage & Intent (Upsert with conflict resolution)
                    await supabase.from('vendor_leads').upsert({
                        customer_id: customerId,
                        vendor_id: vendorId,
                        stage: 'Sales',
                        intent_score: 'Hot',
                        intent_summary: JSON.stringify({
                            insights: { ...data, time_slot: data.time },
                            last_update: new Date().toISOString()
                        })
                    }, { onConflict: 'customer_id,vendor_id' });
                }

                // 2. Local UI Success State
                setSubmitted(true);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#4f46e5', '#6366f1', '#818cf8']
                });

                // 3. Update messages state manually (Manual sync to avoid AI SDK addToolResult crash)
                setMessages(prev => (prev as any).map((m: any) => {
                    const hasMatch = m.parts?.some((p: any) => p.toolCallId === toolInvocation.toolCallId);
                    if (hasMatch) {
                        return {
                            ...m,
                            parts: m.parts?.map((p: any) => p.toolCallId === toolInvocation.toolCallId ? 
                                { ...p, state: 'result', result: { success: true, booking: data } } : p)
                        };
                    }
                    return m;
                }));

            } catch (err) {
                console.error("Booking error details:", err);
            } finally {
                setIsSubmitting(false);
            }
        };

        if (submitted) {
            return (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center space-y-2 mt-2 shadow-sm animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-8 h-8 text-indigo-500 mx-auto" />
                    <h4 className="font-bold text-indigo-900 text-sm">✅ Demo Confirmed!</h4>
                    <p className="text-xs text-indigo-700">Our sales team will contact you shortly.</p>
                </div>
            );
        }

        return (
            <form onSubmit={handleSubmit(onFormSubmit)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 mt-2 mb-2 animate-in slide-in-from-bottom-2 duration-300 bg-show">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-sm text-slate-900">Request Test Drive</h4>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1">Full Name</label>
                        <input {...register('name')} disabled={isSubmitting} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" />
                        {errors.name && <p className="text-[9px] text-red-500 pl-1">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1">Phone Number</label>
                        <input {...register('phone')} disabled={isSubmitting} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50" />
                        {errors.phone && <p className="text-[9px] text-red-500 pl-1">{errors.phone.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1">Preferred Date</label>
                        <input type="date" {...register('date')} disabled={isSubmitting} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1">Preferred Time</label>
                        <select {...register('time')} disabled={isSubmitting} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                            <option value="Morning">Morning</option>
                            <option value="Afternoon">Afternoon</option>
                            <option value="Evening">Evening</option>
                        </select>
                    </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Booking"}
                </button>
            </form>
        );
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 z-50 flex items-center justify-center animate-bounce shadow-blue-500/50"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-100">
                    <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full relative">
                                <Bot className="w-5 h-5 text-white" />
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 border border-blue-600 rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-semibold leading-tight">Vini</h3>
                                <p className="text-xs text-blue-100">Personal Auto Expert</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1 rounded transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                        <button 
                            onClick={() => triggerManualDemo()}
                            className="w-full py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5 group"
                        >
                            <span className="group-hover:animate-bounce">🚗</span> Request Test Drive / Demo
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((m: any) => (
                            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`flex max-w-[90%] gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-white border border-gray-200' : 'bg-blue-600'}`}>
                                        {m.role === 'user' ? <User className="w-4 h-4 text-gray-600" /> : <Bot className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 flex flex-col gap-2'}`}>
                                        {/* Render Text Parts */}
                                        <div className="prose prose-sm prose-p:leading-snug prose-p:my-0">
                                            {m.parts?.map((p: any, i: number) => p.type === 'text' && <ReactMarkdown key={i}>{p.text}</ReactMarkdown>)}
                                        </div>

                                        {/* Render Tool Parts (SDK 6.x structure) */}
                                        {m.parts?.map((p: any, i: number) => {
                                            if (!p) return null;
                                            const isListCars = p.type === 'tool-list_cars' || (p.type === 'tool-invocation' && p.toolName === 'list_cars');
                                            const isBookDemo = p.type === 'tool-book_demo' || (p.type === 'tool-invocation' && p.toolName === 'book_demo');
                                            const hasResult = p.state === 'output-available' || p.state === 'result' || p.result;
                                            const data = p.output || p.result;

                                            if (isListCars && hasResult && data?.cars) {
                                                return <CarCarousel key={p.toolCallId || i} cars={data.cars} />;
                                            }
                                            if (isBookDemo && (p.state === 'call' || p.state === 'output-available' || p.state === 'result' || p.result)) {
                                                return <BookingForm key={p.toolCallId || i} toolInvocation={p} addToolResult={addToolResult} customerId={customerId} />;
                                            }
                                            return null;
                                        })}

                                        {/* Fallback for Tool Invocations if parts don't cover it (Legacy/Compatibility) */}
                                        {!m.parts?.some((p: any) => p && p.type && p.type.startsWith('tool-')) && m.toolInvocations?.map((ti: any) => {
                                            if (!ti) return null;
                                            if (ti.toolName === 'list_cars' && (ti.state === 'result' || ti.state === 'output-available')) {
                                                const cars = ti.result?.cars || ti.output?.cars;
                                                return cars ? <CarCarousel key={ti.toolCallId} cars={cars} /> : null;
                                            }
                                            if (ti.toolName === 'book_demo' && (ti.state === 'call' || ti.state === 'output-available')) {
                                                return <BookingForm key={ti.toolCallId} toolInvocation={ti} addToolResult={addToolResult} customerId={customerId} />;
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex max-w-[80%] gap-2">
                                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 shadow-sm">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="p-3 bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 shrink-0">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input || ""}
                                onChange={handleInputChange}
                                placeholder="Ask Vini for car recommendations..."
                                disabled={isLoading}
                                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !(input || "").trim()}
                                className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
