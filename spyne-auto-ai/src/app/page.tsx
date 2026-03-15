"use client";

import cars from "@/data/cars.json";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function Storefront() {
  const router = useRouter();
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateBuy = async (car: any) => {
    setIsSimulating(true);
    try {
      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', '555-0100')
        .maybeSingle();

      const purchaseSummary = `Simulated purchase of ${car.year} ${car.make} ${car.model}.`;

      if (!customer) {
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({
            name: 'Test Setup User',
            phone: "555-0100",
            stage: 'Aftersales',
            intent_score: 'Hot',
            intent_summary: purchaseSummary
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);
        customer = newCustomer;
      } else {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            stage: 'Aftersales',
            intent_score: 'Hot',
            intent_summary: purchaseSummary
          })
          .eq('id', customer.id);

        if (updateError) throw new Error(updateError.message);
      }

      const { error: carError } = await supabase
        .from('customer_cars')
        .insert({
          customer_id: customer.id,
          car_model: `${car.make} ${car.model}`,
          current_odometer: car.overview?.km_driven ? parseInt(car.overview.km_driven.replace(/[^0-9]/g, '')) : 10,
          purchase_date: new Date().toISOString()
        });

      if (carError) throw new Error(carError.message);
      localStorage.setItem('spyne_user_id', customer.id);
      router.push('/customer-dashboard');

    } catch (e) {
      console.error(e);
      alert("Failed to simulate buy. Is Supabase configured correctly?");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
            Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">Perfect Drive</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience the future of car buying with AI-guided recommendations and a premium selection of hand-picked vehicles.
          </p>
        </div>
      </section>

      {/* Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col"
            >
              {/* Image Container */}
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                <img
                  src={car.image_url}
                  alt={`${car.make} ${car.model}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{car.year} {car.make} {car.model}</h3>
                  <div className="text-2xl font-bold text-indigo-600 mt-2">${car.price.toLocaleString()}</div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2 mb-6 text-slate-500">
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-center">
                    {car.overview?.fuel_type || "Petrol"}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-center">
                    {car.overview?.transmission || "Auto"}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-center">
                    {car.overview?.km_driven || "12k km"}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-semibold flex items-center justify-center">
                    {car.overview?.ownership || "1st Owner"}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3 mt-auto">
                  <button
                    onClick={() => router.push(`/car/${car.id}`)}
                    className="w-full bg-slate-900 text-white rounded-xl py-3 hover:bg-black font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleSimulateBuy(car)}
                    disabled={isSimulating}
                    className="w-full text-slate-500 hover:text-indigo-600 font-medium text-sm transition-colors flex justify-center items-center gap-1.5"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Simulate Buy <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
