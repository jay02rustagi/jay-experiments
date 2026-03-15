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

export default function ViniChat({ userStage = 'Presales' }: { userStage?: string }) {
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

    const { messages, sendMessage, status, addToolResult } = useChat({
        messages: [initialMessage]
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: UIMessage = {
            id: Date.now().toString(),
            role: 'user',
            parts: [{ type: 'text', text: input }]
        };

        sendMessage(userMsg, { body: { stage: currentStage } });
        setInput("");
    };

    useEffect(() => {
        const handleOpenChat = (event: any) => {
            const { message } = event.detail;
            setIsOpen(true);
            if (message) {
                const userMsg: UIMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    parts: [{ type: 'text', text: message }]
                };
                sendMessage(userMsg, { body: { stage: currentStage } });
            }
        };

        window.addEventListener('vini-chat-open', handleOpenChat as any);
        return () => window.removeEventListener('vini-chat-open', handleOpenChat as any);
    }, [currentStage, sendMessage]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- TOOL RENDERING HELPERS ---

    const CarCarousel = ({ cars }: { cars: any[] }) => {
        const scrollRef = useRef<HTMLDivElement>(null);
        return (
            <div className="relative group mt-2">
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto pb-3 snap-x scrollbar-hide no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {cars.map((car, i) => (
                        <div key={i} className="min-w-[200px] bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm snap-start">
                            <img src={car.image_url} alt={car.model} className="w-full h-24 object-cover" />
                            <div className="p-3">
                                <h4 className="font-bold text-xs truncate">{car.year} {car.make} {car.model}</h4>
                                <p className="text-blue-600 font-bold text-xs mt-1">${car.price.toLocaleString()}</p>
                                <button
                                    onClick={() => window.location.href = `/car/${car.id}`}
                                    className="w-full mt-2 py-1.5 bg-gray-50 hover:bg-blue-50 text-blue-600 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1"
                                >
                                    View Details <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const BookingForm = ({ toolInvocation, addToolResult }: { toolInvocation: any, addToolResult: any }) => {
        const [submitted, setSubmitted] = useState(false);
        const { register, handleSubmit, formState: { errors }, setValue } = useForm<BookingData>({
            resolver: zodResolver(bookingSchema),
            defaultValues: {
                name: toolInvocation.input?.name || "",
                phone: toolInvocation.input?.phone || "",
                location: 'Showroom'
            }
        });

        // Pre-fill from Supabase
        useEffect(() => {
            const fetchUser = async () => {
                const { data } = await supabase.from('customers').select('*').eq('name', 'Test Setup User').single();
                if (data) {
                    if (!toolInvocation.input?.name) setValue('name', data.name);
                    if (!toolInvocation.input?.phone) setValue('phone', data.phone);
                }
            };
            fetchUser();
        }, []);

        const onFormSubmit = async (data: BookingData) => {
            setSubmitted(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#2563eb', '#3b82f6', '#60a5fa']
            });

            (addToolResult as any)({
                toolCallId: toolInvocation.toolCallId,
                tool: 'book_demo',
                state: 'output-available',
                output: { success: true, booking: data }
            });
        };

        if (submitted) {
            return (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center space-y-2 mt-2">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                    <h4 className="font-bold text-green-900 text-sm">Booking Confirmed!</h4>
                    <p className="text-xs text-green-700">Our team will call you shortly to confirm your VIP demo.</p>
                </div>
            );
        }

        return (
            <form onSubmit={handleSubmit(onFormSubmit)} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-sm text-gray-900">Schedule Your Demo</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Name</label>
                        <input {...register('name')} className="w-full p-2 border border-gray-100 rounded-lg text-xs bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none" />
                        {errors.name && <p className="text-[9px] text-red-500 pl-1">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Phone</label>
                        <input {...register('phone')} className="w-full p-2 border border-gray-100 rounded-lg text-xs bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none" />
                        {errors.phone && <p className="text-[9px] text-red-500 pl-1">{errors.phone.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Date</label>
                        <input type="date" {...register('date')} className="w-full p-2 border border-gray-100 rounded-lg text-xs bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Preferred Time</label>
                        <select {...register('time')} className="w-full p-2 border border-gray-100 rounded-lg text-xs bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none">
                            <option value="10:00 AM">10:00 AM</option>
                            <option value="12:00 PM">12:00 PM</option>
                            <option value="02:00 PM">02:00 PM</option>
                            <option value="04:00 PM">04:00 PM</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Location</label>
                    <div className="flex gap-2">
                        {['Showroom', 'Home'].map((loc) => (
                            <button
                                key={loc}
                                type="button"
                                onClick={() => setValue('location', loc as any)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${loc === 'Showroom' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600'
                                    }`}
                            >
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md text-xs">
                    Confirm Booking
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

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((m: any) => (
                            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`flex max-w-[85%] gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-white border border-gray-200' : 'bg-blue-600'}`}>
                                        {m.role === 'user' ? <User className="w-4 h-4 text-gray-600" /> : <Bot className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                                        <div className="prose prose-sm prose-p:leading-snug prose-p:my-0">
                                            {m.parts?.map((p: any, i: number) => p.type === 'text' && <ReactMarkdown key={i}>{p.text}</ReactMarkdown>)}
                                        </div>
                                    </div>
                                </div>

                                {/* Render Tool Invocations */}
                                {m.toolInvocations?.map((ti: any) => (
                                    <div key={ti.toolCallId} className="w-[85%] ml-10">
                                        {ti.toolName === 'list_cars' && ti.state === 'result' && (
                                            <CarCarousel cars={ti.result.cars} />
                                        )}
                                        {ti.toolName === 'book_demo' && ti.state === 'call' && (
                                            <BookingForm toolInvocation={ti} addToolResult={addToolResult} />
                                        )}
                                    </div>
                                ))}
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
