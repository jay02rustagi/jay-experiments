"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, Wrench, Settings2, Car, ArrowRight } from "lucide-react";
import ViniChat from "@/components/ViniChat";

export default function CustomerDashboard() {
    const [customer, setCustomer] = useState<any>(null);
    const [car, setCar] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [odometer, setOdometer] = useState("");
    const [serviceNotes, setServiceNotes] = useState("");
    const [savingOdometer, setSavingOdometer] = useState(false);
    const [savingService, setSavingService] = useState(false);
    const [selectedUpgrades, setSelectedUpgrades] = useState<string[]>([]);

    const availableUpgrades = [
        "Ceramic Coating",
        "Interior Detailing",
        "Window Tinting",
        "Paint Protection Film",
        "Wheel Restoration"
    ];

    useEffect(() => {
        const fetchCustomerData = async () => {
            const customerId = localStorage.getItem("spyne_user_id");
            if (!customerId) {
                setLoading(false);
                return;
            }

            const { data: customerData } = await supabase
                .from("customers")
                .select("*")
                .eq("id", customerId)
                .single();

            if (customerData) {
                setCustomer(customerData);

                const { data: carData } = await supabase
                    .from("customer_cars")
                    .select("*")
                    .eq("customer_id", customerId)
                    .order('purchase_date', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (carData) {
                    setCar(carData);
                    setOdometer(carData.current_odometer?.toString() || "");
                }
            }
            setLoading(false);
        };

        fetchCustomerData();
    }, []);

    const toggleUpgrade = (upgrade: string) => {
        setSelectedUpgrades(prev =>
            prev.includes(upgrade) ? prev.filter(u => u !== upgrade) : [...prev, upgrade]
        );
    };

    const handleSyncOdometer = async () => {
        if (!car) return;
        setSavingOdometer(true);
        try {
            const { error } = await supabase
                .from("customer_cars")
                .update({
                    current_odometer: parseInt(odometer) || 0,
                })
                .eq("id", car.id);

            if (error) throw error;
            alert("Odometer synced successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to sync odometer.");
        } finally {
            setSavingOdometer(false);
        }
    };

    const handleRequestService = async () => {
        if (!car) return;
        setSavingService(true);
        try {
            const upgradesList = selectedUpgrades.join(", ");
            const { error } = await supabase
                .from("customer_cars")
                .update({
                    service_notes: serviceNotes ? (car.service_notes ? car.service_notes + "\n" + serviceNotes : serviceNotes) : car.service_notes,
                    maintenance_upgrades: upgradesList ? (car.maintenance_upgrades ? car.maintenance_upgrades + "\n" + upgradesList : upgradesList) : car.maintenance_upgrades,
                })
                .eq("id", car.id);

            if (error) throw error;
            alert("Service request submitted! Our team will contact you shortly.");
            setServiceNotes("");
            setSelectedUpgrades([]);
        } catch (err) {
            console.error(err);
            alert("Failed to submit service request.");
        } finally {
            setSavingService(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!customer || !car) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto text-center px-4">
                <Wrench className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Vehicle Found</h2>
                <p className="text-gray-500 mb-6">It looks like you haven't purchased a vehicle from SpyneAuto yet or you are not logged in.</p>
                <a href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Return to Storefront
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome back, {customer.name}</h1>
                    <p className="text-lg text-slate-500 mt-2 font-medium">Manage your {car.car_model}</p>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* Left: Car Identity Card */}
                    <div className="lg:col-span-1 border border-slate-200 bg-white rounded-3xl shadow-sm p-8 flex flex-col items-center text-center sticky top-24 h-fit">
                        <div className="w-28 h-28 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                            <Car className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">{car.car_model}</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4 w-full">Verified Owner Since {new Date(car.purchase_date).getFullYear()}</p>

                        <div className="w-full space-y-4">
                            <div className="bg-slate-900 rounded-2xl p-6 text-left">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current Mileage</div>
                                <div className="text-3xl font-extrabold text-white tracking-tight">{car.current_odometer?.toLocaleString()} <span className="text-sm font-bold text-slate-500">KMS</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-4 text-left">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status</div>
                                    <div className="text-sm font-bold text-emerald-600">Healthy</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-left">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Tier</div>
                                    <div className="text-sm font-bold text-indigo-600">VIP</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Operations Terminal */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="border border-slate-200 bg-white rounded-3xl shadow-sm p-8 sm:p-10">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance Terminal</h3>
                                    <p className="text-slate-500 text-sm mt-1">Manage your fleet record and premium upgrades.</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                    <Wrench className="w-6 h-6 text-slate-400" />
                                </div>
                            </div>

                            <div className="space-y-10">
                                {/* Odometer Section */}
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        Daily Usage Log
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={odometer}
                                                onChange={(e) => setOdometer(e.target.value)}
                                                placeholder="Enter mileage..."
                                                className="w-full rounded-xl border-slate-200 border px-5 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KMS</span>
                                        </div>
                                        <button
                                            onClick={handleSyncOdometer}
                                            disabled={savingOdometer}
                                            className="bg-slate-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 min-w-[180px]"
                                        >
                                            {savingOdometer ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Odometer"}
                                        </button>
                                    </div>
                                </div>

                                {/* Upgrade Services Selection */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        Premium Add-ons & Upgrades
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {availableUpgrades.map(upgrade => (
                                            <button
                                                key={upgrade}
                                                onClick={() => toggleUpgrade(upgrade)}
                                                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${selectedUpgrades.includes(upgrade)
                                                        ? "border-indigo-600 bg-indigo-50/50"
                                                        : "border-slate-100 bg-white hover:border-slate-300"
                                                    }`}
                                            >
                                                <span className={`text-sm font-bold ${selectedUpgrades.includes(upgrade) ? "text-indigo-900" : "text-slate-600"}`}>
                                                    {upgrade}
                                                </span>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${selectedUpgrades.includes(upgrade)
                                                        ? "bg-indigo-600 border-indigo-600"
                                                        : "border-slate-200"
                                                    }`}>
                                                    {selectedUpgrades.includes(upgrade) && <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Service Description */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Wrench className="w-3.5 h-3.5" />
                                        Service Instructions
                                    </label>
                                    <textarea
                                        value={serviceNotes}
                                        onChange={(e) => setServiceNotes(e.target.value)}
                                        placeholder="Describe any issues or specific instructions for the selected upgrades..."
                                        rows={3}
                                        className="w-full rounded-xl border-slate-200 border px-5 py-4 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                <button
                                    onClick={handleRequestService}
                                    disabled={savingService}
                                    className="w-full bg-indigo-600 text-white font-bold px-8 py-5 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
                                >
                                    {savingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Request Service & Upgrades <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        </div>

                        {/* Intelligence Section */}
                        <div className="bg-indigo-600 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden group">
                            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-110" />
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold tracking-tight mb-2">Vini Aftersales Intelligence</h3>
                                <p className="text-indigo-100 mb-6 max-w-lg font-medium">Your vehicle is currently in its optimal performance window. Vini has analyzed your driving patterns and recommends a general check-up in 2,500 kms.</p>
                                <button className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl backdrop-blur-md transition-all text-sm">
                                    View Service Roadmap
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <ViniChat userStage="Aftersales" />
            </main>
        </div>
    );
}
