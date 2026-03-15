"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Wrench, Search, Settings, Save, CheckCircle2, User, Calendar, Gauge, History, ChevronRight, X } from "lucide-react";

export default function ServiceMaintenance() {
    const [loading, setLoading] = useState(true);
    const [cars, setCars] = useState<any[]>([]);
    const [selectedCar, setSelectedCar] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Edit form state
    const [editDate, setEditDate] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchCars();
    }, []);

    const fetchCars = async () => {
        const { data } = await supabase
            .from('customer_cars')
            .select(`
                *,
                customers ( name, phone )
            `)
            .order('purchase_date', { ascending: false });

        if (data) {
            setCars(data);
        }
        setLoading(false);
    };

    const filteredCars = cars.filter(c =>
        c.car_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.customers?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectCar = (car: any) => {
        setSelectedCar(car);
        setEditDate(car.last_service_date ? car.last_service_date.split('T')[0] : "");
        setEditNotes(car.service_notes || "");
        setSuccess(false);
    };

    const handleSave = async () => {
        if (!selectedCar) return;
        setSaving(true);
        setSuccess(false);

        const updates: any = {
            service_notes: editNotes,
        };
        if (editDate) {
            updates.last_service_date = new Date(editDate).toISOString();
        }

        try {
            const { error } = await supabase
                .from('customer_cars')
                .update(updates)
                .eq('id', selectedCar.id);

            if (error) throw error;
            setSuccess(true);
            fetchCars();
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            console.error(e);
            alert("Failed to save updates.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 h-[60vh] flex flex-col justify-center items-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Accessing Fleet Records...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
            {/* Left Sidebar: Vehicle List */}
            <div className="w-[400px] flex flex-col bg-white border-r border-slate-200 relative z-10">
                <div className="p-8 border-b border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Service Fleet</h2>
                    <div className="relative group">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find vehicle or owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {filteredCars.length === 0 ? (
                        <div className="text-center py-20 text-slate-300">
                            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold opacity-50 uppercase tracking-widest">No matching records</p>
                        </div>
                    ) : (
                        filteredCars.map(car => (
                            <button
                                key={car.id}
                                onClick={() => handleSelectCar(car)}
                                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group relative ${selectedCar?.id === car.id
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                                    : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`font-bold tracking-tight truncate pr-2 ${selectedCar?.id === car.id ? 'text-white' : 'text-slate-900'}`}>
                                        {car.car_model}
                                    </div>
                                    <div className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full ${selectedCar?.id === car.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                        {car.current_odometer?.toLocaleString()} MI
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <div className={`flex items-center gap-1.5 font-medium ${selectedCar?.id === car.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                        <User className="w-3 h-3" /> {car.customers?.name || "Owner Not Found"}
                                    </div>
                                    <div className={`font-black uppercase tracking-widest text-[9px] ${selectedCar?.id === car.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {car.last_service_date ? new Date(car.last_service_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No Record'}
                                    </div>
                                </div>
                                {selectedCar?.id === car.id && (
                                    <ChevronRight className="absolute -right-2 top-1/2 -translate-y-1/2 text-white w-5 h-5 drop-shadow-md lg:block hidden" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Detail & Form Panel */}
            <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
                {selectedCar ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        {/* Header Section */}
                        <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>
                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Service Management Terminal</div>
                                    <h2 className="text-4xl font-black tracking-tight">{selectedCar.car_model}</h2>
                                    <div className="flex items-center gap-6 mt-6">
                                        <div className="flex items-center gap-2.5 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                                            <User className="w-4 h-4 text-indigo-400" />
                                            <div className="text-xs font-bold">{selectedCar.customers?.name} <span className="text-white/40 ml-2">{selectedCar.customers?.phone}</span></div>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                                            <History className="w-4 h-4 text-indigo-400" />
                                            <div className="text-xs font-bold uppercase tracking-widest">Registered {new Date(selectedCar.purchase_date).getFullYear()}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-24 h-24 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <Wrench className="w-10 h-10 text-indigo-400" />
                                </div>
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            {/* KPI Metrics */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-indigo-100 transition-colors">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Gauge className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Odometer</div>
                                        <div className="text-2xl font-black text-slate-900">{selectedCar.current_odometer?.toLocaleString()} <span className="text-slate-400 font-bold ml-1 text-sm">MILES</span></div>
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-indigo-100 transition-colors">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Calendar className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Date</div>
                                        <div className="text-2xl font-black text-slate-900">{new Date(selectedCar.purchase_date).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Upgrade Requests */}
                            {selectedCar.maintenance_upgrades && (
                                <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-xl shadow-indigo-100">
                                    <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12">
                                        <Settings className="w-40 h-40" />
                                    </div>
                                    <div className="relative z-10 flex items-start gap-4">
                                        <Settings className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
                                        <div className="w-full">
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-indigo-400">Premium Upgrade Bundle Requested</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {selectedCar.maintenance_upgrades.split(',').map((u: string) => (
                                                    <span key={u} className="px-4 py-1.5 bg-white/20 rounded-full text-xs font-bold border border-white/20 backdrop-blur-sm">
                                                        {u.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                            {selectedCar.service_notes && (
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <p className="text-sm text-indigo-100 font-medium italic">"{selectedCar.service_notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Update Form */}
                            <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm animate-in slide-in-from-bottom-4 duration-700">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8 flex items-center gap-3">
                                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                                    Update Service Record
                                </h3>

                                <div className="grid grid-cols-1 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Execution Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                            <input
                                                type="date"
                                                value={editDate}
                                                onChange={(e) => setEditDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Engineering Notes & History</label>
                                        <textarea
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            rows={8}
                                            placeholder="Detail the work performed, replaced parts, and technical observations..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-6 text-slate-900 font-medium leading-relaxed focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            {success && (
                                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-in fade-in scale-in">
                                                    <CheckCircle2 className="w-4 h-4" /> Sync Successful
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center gap-3 group active:scale-95"
                                        >
                                            {saving ? (
                                                <> <Loader2 className="w-4 h-4 animate-spin" /> Committing... </>
                                            ) : (
                                                <> <Save className="w-4 h-4 group-hover:scale-110 transition-transform" /> Commit Changes </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center p-20 text-center animate-in fade-in duration-500">
                        <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-200 shadow-inner">
                            <Wrench className="w-16 h-16" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Service Maintenance Terminal</h2>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                            Select a customer vehicle from the fleet list on the left to start updating its maintenance logs and service history.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
