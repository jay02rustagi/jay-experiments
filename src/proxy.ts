import { NextResponse, type NextRequest } from 'next/server';

// Optional lock for the dealer admin: set ADMIN_PASSWORD in Vercel to require it, leave unset to keep the demo open
export function proxy(req: NextRequest) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return NextResponse.next();

    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Basic ')) {
        const decoded = atob(auth.slice(6));
        if (decoded.slice(decoded.indexOf(':') + 1) === password) return NextResponse.next();
    }

    return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="SpyneAuto Admin"' },
    });
}

export const config = {
    matcher: ['/admin/:path*'],
};
