"use client";

import { useParams, useRouter } from "next/navigation";
import cars from "@/data/cars.json";
import { useState, useMemo } from "react";
import {
    ChevronLeft,
    Rotate3d,
    Image as ImageIcon,
    CheckCircle2,
    Zap,
    MessageCircle,
    ArrowRight
} from "lucide-react";

export default function CarDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'static' | '360'>('static');

    const car = useMemo(() => {
        return cars.find(c => c.id.toString() === id);
    }, [id]);

    if (!car) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
                <h1 className="text-2xl font-bold text-slate-900 mb-4">Car Not Found</h1>
                <button
                    onClick={() => router.push('/')}
                    className="text-indigo-600 hover:underline flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Storefront
                </button>
            </div>
        );
    }

    const handleTalkToVini = () => {
        const message = `I am currently viewing the ${car.year} ${car.make} ${car.model}. I'd like to request a demo and learn more about it.`;
        window.dispatchEvent(new CustomEvent('vini-chat-open', { detail: { message } }));
    };

    return (
        <div className="flex-1 bg-slate-50 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
                {/* 2-Column Split Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-slate-900">

                    {/* Left Side: Media Section */}
                    <div className="space-y-6">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold mb-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to listings
                        </button>

                        <div className="bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200 aspect-[4/3] flex items-center justify-center shadow-inner group">
                            {viewMode === 'static' ? (
                                <img
                                    src={car.image_url}
                                    alt={car.model}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full relative bg-slate-50 flex items-center justify-center">
                                    <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 text-xs rounded-full backdrop-blur z-20 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                                        <Rotate3d className="w-3.5 h-3.5" /> ↻ Drag to rotate
                                    </div>
                                    <img src={car.image_url} alt="360 placeholder" className="opacity-20 grayscale scale-110" />
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xl uppercase tracking-[0.2em]">360° Interactive Console</div>
                                </div>
                            )}

                            {/* Floating Pill Toggle */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg rounded-full p-1.5 flex items-center gap-1 z-10 border border-white/50">
                                <button
                                    onClick={() => setViewMode('static')}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'static'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-600 hover:text-slate-900 transition-colors'
                                        }`}
                                >
                                    <ImageIcon className="w-4 h-4" /> Static
                                </button>
                                <button
                                    onClick={() => setViewMode('360')}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${viewMode === '360'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-600 hover:text-slate-900 transition-colors'
                                        }`}
                                >
                                    <Rotate3d className="w-4 h-4" /> 360° View
                                </button>
                            </div>
                        </div>

                        {/* Badges Grid */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {[
                                car.overview.fuel_type,
                                car.overview.transmission,
                                car.overview.km_driven,
                                car.overview.ownership
                            ].map((badge, i) => (
                                <div key={i} className="bg-white text-slate-700 px-5 py-2.5 rounded-full text-sm font-bold border border-slate-200 shadow-sm">
                                    {badge}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Info Section */}
                    <div className="space-y-8">
                        <div>
                            <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-3">Certified Pre-Owned</div>
                            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                {car.year} {car.make} <br />
                                <span className="text-indigo-600">{car.model}</span>
                            </h1>
                            <div className="text-4xl font-black text-indigo-600 mt-6 tracking-tight">${car.price.toLocaleString()}</div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Interested in this car?</h3>
                            <p className="text-slate-500 text-sm mb-6">Let Vini, our AI assistant, help you with a digital tour, finance options, or a test drive.</p>

                            <button
                                onClick={handleTalkToVini}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <MessageCircle className="w-6 h-6 fill-white" />
                                Talk to Vini for VIP Request
                            </button>
                            <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider mt-4">
                                Available for immediate delivery
                            </p>
                        </div>

                        {/* Pitch section */}
                        <div className="p-6 border-l-4 border-indigo-600 bg-white rounded-r-2xl shadow-sm">
                            <p className="text-slate-600 italic leading-relaxed font-medium">
                                "{car.presales_pitch}"
                            </p>
                            <div className="mt-3 text-sm font-bold text-slate-900">— Vini, AI Sales Expert</div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: More Specs */}
                <div className="mt-16 pt-16 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center gap-3">
                            <CheckCircle2 className="w-7 h-7 text-indigo-600" /> Key Specifications
                        </h2>
                        <div className="space-y-2">
                            {[
                                { label: "Engine", value: car.specs.engine_displacement },
                                { label: "Max Power", value: car.specs.max_power },
                                { label: "Max Torque", value: car.specs.max_torque },
                                { label: "Seating", value: car.specs.seating_capacity + " Persons" },
                                { label: "Fuel Type", value: car.overview.fuel_type }
                            ].map((spec, i) => (
                                <div key={i} className="flex justify-between py-4 border-b border-slate-50 last:border-0">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">{spec.label}</span>
                                    <span className="text-slate-900 font-bold text-sm tracking-tight">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center gap-3">
                            <Zap className="w-7 h-7 text-indigo-600" /> Premium Features
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {car.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <CheckCircle2 className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                                    <span className="text-sm font-bold text-slate-700 tracking-tight">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
