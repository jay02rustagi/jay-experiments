import Link from 'next/link';
import { Car, LayoutDashboard, Settings } from 'lucide-react';

export default function NavBar() {
    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-gray-900">Spyne<span className="text-blue-600">Auto</span><span className="text-gray-400 font-medium text-sm ml-1">AI</span></span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                            Storefront
                        </Link>
                        <Link href="/customer-dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                            <LayoutDashboard className="w-4 h-4" />
                            Customer Portal
                        </Link>
                        <div className="h-4 w-px bg-gray-200" />
                        <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                            <Settings className="w-4 h-4" />
                            Admin CRM
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
