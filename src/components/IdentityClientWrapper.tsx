"use client";

import { useIdentity } from "@/hooks/useIdentity";
import ViniChat from "@/components/ViniChat";

export default function IdentityClientWrapper({ children }: { children: React.ReactNode }) {
    const { customerId } = useIdentity();
    
    return (
        <>
            {children}
            <ViniChat customerId={customerId || undefined} />
        </>
    );
}
