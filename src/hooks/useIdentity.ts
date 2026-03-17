"use client";

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

export function useIdentity() {
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customer, setCustomer] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initIdentity = async () => {
            let storedId = localStorage.getItem('spyne_customer_id');
            
            if (!storedId) {
                storedId = uuidv4();
                localStorage.setItem('spyne_customer_id', storedId);
            }

            setCustomerId(storedId);

            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', storedId)
                    .single();

                if (data) {
                    setCustomer(data);
                }
            } catch (err) {
                console.error('Error fetching customer identity:', err);
            } finally {
                setLoading(false);
            }
        };

        initIdentity();
    }, []);

    return { customerId, customer, loading };
}
