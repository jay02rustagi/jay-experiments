import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, zodSchema, generateText, createUIMessageStream, createUIMessageStreamResponse, generateId } from 'ai';
import { z } from 'zod';
import cars from '@/data/cars.json';
import { supabase } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const body = await req.json();
    const { messages, stage } = body;

    // Get car data formatted as a context string
    const carContext = cars.map(c =>
        `- ${c.year} ${c.make} ${c.model} (${c.type}): $${c.price.toLocaleString()}\n  Specs: ${JSON.stringify(c.specs)}`
    ).sort(() => Math.random() - 0.5).slice(0, 10).join('\n\n');

    let systemPrompt = "";
    if (stage === 'Presales') {
        systemPrompt = `You are Vini, the SpyneAuto AI sales assistant. 
STRICT CONSTRAINT: Every response must be under 100 characters. Be punchy and direct.
YOUR OBJECTIVE: Collect user requirements into this JSON format: { "name": "", "budget": "", "use_case": "", "urgency": "" }.
INTERACTIVE TOOLS:
1. list_cars(preferences): Use this when the user asks for suggestions or shows interest in buying. Suggest 3 relevant cars.
2. book_demo(collected_info): Use this when the user wants to book a test drive.
CHAT FLOW: Greeting -> Budget -> Use Case -> Urgency -> Call to Action.
Car Inventory: ${carContext}`;
    } else if (stage === 'Sales') {
        systemPrompt = `You are Vini, a Senior Sales Executive. Use 'book_demo' if the user is ready.
Goal: Convert to showroom visit. 
Car Inventory: ${carContext}`;
    } else {
        systemPrompt = `You are Vini, the Service Concierge.
Goal: Help book service.
Car Inventory: ${carContext}`;
    }

    // CRITICAL: Robust sanitization for ALL tiers.
    const sanitizedMessages = (messages || []).map((m: any) => {
        let text = "";
        if (typeof m.content === 'string') {
            text = m.content;
        } else if (Array.isArray(m.content)) {
            text = m.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join("");
        } else if (m.parts && Array.isArray(m.parts)) {
            text = m.parts
                .filter((p: any) => p.text)
                .map((p: any) => p.text)
                .join("");
        }

        return {
            role: (m.role === 'user' || m.role === 'assistant' || m.role === 'system') ? m.role : 'user',
            content: text || "Hello"
        };
    }).filter((m: any) => m.content.length > 0);

    const tools = {
        list_cars: {
            description: 'Suggest 3 relevant cars based on preferences.',
            inputSchema: zodSchema(z.object({
                preferences: z.string()
            })),
            execute: async ({ preferences }: { preferences: string }) => {
                const recommended = cars
                    .filter(c => preferences.toLowerCase().includes(c.type.toLowerCase()) || preferences.toLowerCase().includes(c.make.toLowerCase()) || Math.random() > 0.5)
                    .slice(0, 3);
                return { cars: recommended };
            }
        },
        book_demo: {
            description: 'Trigger booking form.',
            inputSchema: zodSchema(z.object({
                name: z.string().optional(),
                phone: z.string().optional(),
                car_model: z.string().optional()
            })),
            execute: async (data: any) => data
        }
    };

    // --- TIER 1: PRIMARY GEMINI (New Key: ...q1Lm60) ---
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        console.log(`Tier 1 (Gemini) Attempt Start...`);
        if (!apiKey) throw new Error("Primary Gemini API Key Missing");

        const google = createGoogleGenerativeAI({ apiKey });
        // PROBE: Use the verified 'gemini-flash-latest' model.
        await generateText({
            model: google('gemini-flash-latest'),
            prompt: 'hi',
            maxRetries: 0
        });

        const result = await streamText({
            model: google('gemini-flash-latest'),
            system: systemPrompt,
            messages: sanitizedMessages as any,
            tools: tools as any,
            maxRetries: 0,
            onFinish: async (props) => {
                try {
                    await handleChatFinish(props, messages, google);
                } catch (e) {
                    console.error("handleChatFinish failed:", e);
                }
            }
        });

        console.log("Tier 1: Primary Gemini Success!");
        return result.toUIMessageStreamResponse();
    } catch (primaryError: any) {
        console.error("TIER 1 (PRIMARY) FAILED:", primaryError.message || primaryError);

        // --- TIER 2: SECONDARY GEMINI (Old Key: ...2cHg) ---
        try {
            const secondaryKey = process.env.SECONDARY_GEMINI_API_KEY;
            console.log(`Tier 2 (Gemini) Attempt Start...`);
            if (!secondaryKey) throw new Error("Secondary Gemini API Key Missing");

            const googleSecondary = createGoogleGenerativeAI({ apiKey: secondaryKey });
            // PROBE: Fall back to verified model if primary fails.
            await generateText({
                model: googleSecondary('gemini-flash-latest'),
                prompt: 'hi',
                maxRetries: 0
            });

            const result = await streamText({
                model: googleSecondary('gemini-flash-latest'),
                system: systemPrompt,
                messages: sanitizedMessages as any,
                tools: tools as any,
                maxRetries: 0,
                onFinish: async (props) => {
                    try {
                        await handleChatFinish(props, messages, googleSecondary);
                    } catch (e) {
                        console.error("handleChatFinish failed (Secondary):", e);
                    }
                }
            });

            console.log("Tier 2: Secondary Gemini Success!");
            return result.toUIMessageStreamResponse();
        } catch (secondaryError: any) {
            console.error("TIER 2 (SECONDARY) FAILED:", secondaryError.message || secondaryError);

            // --- TIER 3: HARDCODED FALLBACK ---
            console.log("Tier 3: Hardcoded Fallback Start...");
            let fallbackText = "Hi! I'm Vini. We're experiencing high chat volume, but I'm here to help!";

            if (stage === 'Presales') {
                fallbackText = "Hi! I'm Vini. We're experiencing high chat volume, but I'm here to help! Could you tell me your name and what budget you have in mind?";
            } else if (stage === 'Sales') {
                fallbackText = "Hi! I'm Vini. Our team is currently busy, but I can help you book a showroom visit. What time works for you?";
            }

            return createUIMessageStreamResponse({
                stream: createUIMessageStream({
                    async execute({ writer }) {
                        const messageId = generateId();
                        writer.write({ type: 'text-start', id: messageId });
                        writer.write({ type: 'text-delta', id: messageId, delta: fallbackText });
                        writer.write({ type: 'text-end', id: messageId });
                    },
                }),
            });
        }
    }
}

async function handleChatFinish({ text, toolCalls }: any, messages: any[], google: any) {
    try {
        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('name', 'Test Setup User')
            .single();

        if (customer) {
            const lastUserMsg = messages[messages.length - 1]?.parts?.[0]?.text || "";
            const newTranscript = [
                ...(customer.chat_transcript || []),
                { role: 'user', content: lastUserMsg },
                { role: 'assistant', content: text, toolCalls }
            ];

            const updatePayload: any = { chat_transcript: newTranscript };

            const { text: extractionText } = await generateText({
                model: google('gemini-flash-latest'),
                system: "Extract lead data JSON: {name, budget, use_case, urgency}",
                prompt: `History: ${JSON.stringify(newTranscript)}`
            });

            try {
                const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const extractedData = JSON.parse(jsonMatch[0]);
                    updatePayload.intent_summary = JSON.stringify({
                        insights: extractedData,
                        last_update: new Date().toISOString()
                    });

                    const filledCount = ['name', 'budget', 'use_case', 'urgency'].filter(f => extractedData[f]?.length > 0).length;
                    if (filledCount >= 3) updatePayload.intent_score = 'Hot';
                    else if (filledCount >= 1) updatePayload.intent_score = 'Warm';
                }
            } catch (e) { }

            const bookingTool = toolCalls?.find((tc: any) => tc.toolName === 'book_demo');
            if (bookingTool) {
                const { car_model } = (bookingTool as any).input || {};
                const currentPlan = customer.engagement_plan || [];
                updatePayload.engagement_plan = [
                    ...currentPlan,
                    { day: "Today", action: `📅 Demo Booking Triggered for ${car_model || 'selected car'}.` }
                ];
            }

            await supabase.from('customers').update(updatePayload).eq('id', customer.id);
        }
    } catch (e) {
        console.error("handleChatFinish error:", e);
    }
}
