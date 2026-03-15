"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, Wrench, Menu, Car, Bell } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Analytics', href: '/admin', icon: BarChart3 },
        { name: 'Lead Management', href: '/admin/crm', icon: Users },
        { name: 'Service & Maintenance', href: '/admin/service', icon: Wrench },
    ];

    return (
        <div className="flex flex-1 min-h-[calc(100vh-4rem)] bg-slate-50">
            {/* Sidebar */}
            <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col fixed inset-y-16 left-0 z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Car className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-white tracking-tight uppercase text-sm">Spyne Vendor</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800/50 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">JD</div>
                            <div>
                                <div className="text-xs font-bold text-white">John Dealer</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administrator</div>
                            </div>
                        </div>
                        <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">
                            Settings
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 pl-72 flex flex-col overflow-hidden">
                {/* Minimal Top Header for Admin */}
                <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-16 z-10 w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Dashboard</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900 text-sm font-bold uppercase tracking-wider">
                            {navItems.find(i => i.href === pathname)?.name || 'Overview'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="text-sm font-bold text-slate-900 tracking-tight">Enterprise Tier</div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
