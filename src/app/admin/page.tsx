"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Users, UserCheck, CalendarDays, Loader2, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activePresales: 0,
        activeSales: 0,
        serviceAppointments: 0,
        totalRevenue: "$1,250,500"
    });
    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            const { data: customers } = await supabase.from('customers').select('*');

            if (customers) {
                const presales = customers.filter(c => c.stage === 'Presales').length;
                const sales = customers.filter(c => c.stage === 'Sales').length;
                const aftersales = customers.filter(c => c.stage === 'Aftersales').length;

                let hot = 0; let warm = 0; let cold = 0;
                customers.forEach(c => {
                    if (c.intent_score === 'Hot') hot++;
                    else if (c.intent_score === 'Warm') warm++;
                    else cold++;
                });

                setStats(prev => ({
                    ...prev,
                    activePresales: presales,
                    activeSales: sales,
                    serviceAppointments: aftersales
                }));

                setFunnelData([
                    { name: 'Prospects', count: presales + sales + aftersales + 10 },
                    { name: 'Leads', count: presales + sales },
                    { name: 'Closures', count: aftersales }
                ]);

                setPieData([
                    { name: 'Hot Intent', value: hot },
                    { name: 'Warm Interest', value: warm },
                    { name: 'Cold/New', value: cold }
                ]);
            }
            setLoading(false);
        };

        fetchAnalytics();
    }, []);

    const COLORS = ['#4f46e5', '#f59e0b', '#cbd5e1'];

    if (loading) {
        return (
            <div className="flex-1 h-[60vh] flex flex-col justify-center items-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Engine...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance Overview</h1>
                <p className="text-slate-500 font-medium">Real-time intelligence from Vini AI interactions</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total Revenue", value: stats.totalRevenue, icon: DollarSign, trend: "+12.5%", isUp: true, color: "indigo" },
                    { label: "Presales Pipeline", value: stats.activePresales, icon: Users, trend: "+4 new", isUp: true, color: "blue" },
                    { label: "Active Sales", value: stats.activeSales, icon: UserCheck, trend: "Stable", isUp: true, color: "amber" },
                    { label: "Service Ops", value: stats.serviceAppointments, icon: CalendarDays, trend: "-2% seasonal", isUp: false, color: "rose" }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl bg-slate-50 group-hover:bg-indigo-50 transition-colors`}>
                                <kpi.icon className={`w-6 h-6 text-slate-900 group-hover:text-indigo-600`} />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${kpi.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {kpi.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {kpi.trend}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Conversion Funnel */}
                <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Conversion Funnel</h3>
                        <button className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
                            View Report <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '1rem',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        padding: '1rem'
                                    }}
                                />
                                <Bar dataKey="count" fill="url(#barGradient)" radius={[10, 10, 0, 0]} maxBarSize={80} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lead Quality */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8">Lead Intent (Vini AI)</h3>
                    <div className="flex-1 flex flex-col justify-center">
                        {pieData.reduce((a, b) => a + b.value, 0) === 0 ? (
                            <div className="text-center py-10">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold">Waiting for new leads...</p>
                            </div>
                        ) : (
                            <div className="h-[300px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Quality</span>
                                    <span className="text-2xl font-black text-slate-900">Score</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 space-y-3">
                            {pieData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
