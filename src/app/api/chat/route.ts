import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, zodSchema, generateText, createUIMessageStream, createUIMessageStreamResponse, generateId } from 'ai';
import { z } from 'zod';
import cars from '@/data/cars.json';
import { supabase } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const body = await req.json();
    const { messages, stage, customer_id, vendor_id = 'dealer_default' } = body;

    // 1. Ensure Customer Exists
    if (customer_id) {
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('id', customer_id)
            .single();

        if (!existingCustomer) {
            await supabase.from('customers').insert({ id: customer_id, name: 'Anonymous User' });
        }
    }

    // 2. Ensure Vendor Lead Entry Exists (Upsert)
    if (customer_id && vendor_id) {
        await supabase
            .from('vendor_leads')
            .upsert({ 
                customer_id, 
                vendor_id 
              }, { 
                onConflict: 'customer_id,vendor_id' 
              });
    }

    // Helper to shuffle array
    const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

    // Get car data formatted as a context string (shuffled 10 for variety)
    const carContext = shuffle(cars).slice(0, 10).map(c =>
        `- ${c.year} ${c.make} ${c.model} (${c.type}): $${c.price.toLocaleString()}\n  Specs: ${JSON.stringify(c.specs)}`
    ).join('\n\n');

    let systemPrompt = "";
    if (stage === 'Presales') {
        systemPrompt = `You are Vini, the SpyneAuto AI sales assistant. 
YOUR OBJECTIVE: Collect user requirements and ultimately guide them to book a test drive.
INTERACTIVE TOOLS:
1. list_cars(preferences): Use this when the user asks for suggestions or shows interest in specific types of cars.
2. book_demo(collected_info): CRITICAL - You MUST use this tool immediately if the user expresses ANY interest in a test drive, demo, showroom visit, or says "Request Test Drive". Do not ask more questions if they trigger this intent. Pre-fill any info you have (name, phone).

CHAT FLOW:
- Greeting: Build rapport.
- Qualification: Briefly understand budget/use-case.
- Suggestion: Use 'list_cars' to show inventory.
- Conversion: Use 'book_demo' for the final call to action.

Car Inventory: ${carContext}`;
    } else if (stage === 'Sales') {
        systemPrompt = `You are Vini, a Senior Sales Executive. 
Your primary goal is to get the user to confirm their demo/test drive details. Use the 'book_demo' tool if they haven't confirmed yet or if they ask to schedule.
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
                const prefs = preferences.toLowerCase();
                const matched = cars.filter(c => {
                    const type = c.type.toLowerCase();
                    const make = c.make.toLowerCase();
                    const model = c.model.toLowerCase();
                    
                    // Direct match on type (handle plural like "sedans")
                    if (prefs.includes(type) || type.includes(prefs.replace(/s$/, ''))) return true;
                    // Match on make or model
                    if (prefs.includes(make) || prefs.includes(model)) return true;
                    // Match on special keywords
                    if (prefs.includes('luxury') && c.price > 40000) return true;
                    if (prefs.includes('budget') && c.price < 30000) return true;
                    
                    return false;
                });

                // Shuffle matches and take 3 for variety
                const recommended = shuffle(matched).slice(0, 3);
                
                // If no exact matches, provide 3 random ones to keep flow moving
                const results = recommended.length > 0 ? recommended : shuffle(cars).slice(0, 3);
                
                return { cars: results };
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

    // --- TIER 1: PRIMARY GEMINI ---
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        console.log(`Tier 1 (Gemini) Attempt Start...`);
        if (!apiKey) throw new Error("Primary Gemini API Key Missing");

        const google = createGoogleGenerativeAI({ apiKey });

        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages: sanitizedMessages as any,
            tools: tools as any,
            maxRetries: 0,
            onFinish: async (props) => {
                try {
                    await handleChatFinish(props, messages, google, customer_id, vendor_id);
                } catch (e) {
                    console.error("handleChatFinish failed:", e);
                }
            }
        });

        console.log("Tier 1: Primary Gemini Success!");
        return result.toUIMessageStreamResponse({ originalMessages: messages });
    } catch (primaryError: any) {
        console.error("TIER 1 (PRIMARY) FAILED:", primaryError.message || primaryError);

        // --- TIER 2: SECONDARY GEMINI ---
        try {
            const secondaryKey = process.env.SECONDARY_GEMINI_API_KEY;
            console.log(`Tier 2 (Gemini) Attempt Start...`);
            if (!secondaryKey) throw new Error("Secondary Gemini API Key Missing");

            const googleSecondary = createGoogleGenerativeAI({ apiKey: secondaryKey });

            const result = await streamText({
                model: googleSecondary('gemini-2.5-flash'),
                system: systemPrompt,
                messages: sanitizedMessages as any,
                tools: tools as any,
                maxRetries: 0,
                onFinish: async (props) => {
                    try {
                        await handleChatFinish(props, messages, googleSecondary, customer_id, vendor_id);
                    } catch (e) {
                        console.error("handleChatFinish failed (Secondary):", e);
                    }
                }
            });

            console.log("Tier 2: Secondary Gemini Success!");
            return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (secondaryError: any) {
            console.error("TIER 2 (SECONDARY) FAILED:", secondaryError.message || secondaryError);

            // --- TIER 3: HARDCODED FALLBACK ---
            console.log("Tier 3: Hardcoded Fallback Start...");
            let fallbackText = "Hi! I'm Vini. We're experiencing high chat volume, but I'm here to help!";

            if (stage === 'Presales') {
                fallbackText = `Tier 1 Error: ${primaryError.message}\nTier 2 Error: ${secondaryError.message}\nHi! I'm Vini. I'm currently in high-load mode. How can I help?`;
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

async function handleChatFinish({ text, toolCalls, toolResults }: any, messages: any[], google: any, customer_id?: string, vendor_id?: string) {
    try {
        console.log("Chat Finished - Tool Results:", JSON.stringify(toolResults, null, 2));
        if (!customer_id || !vendor_id) {
            console.log("Missing identity - skipping DB update");
            return;
        }

        const { data: lead } = await supabase
            .from('vendor_leads')
            .select('*')
            .eq('customer_id', customer_id)
            .eq('vendor_id', vendor_id)
            .single();

        if (lead) {
            const lastUserMsg = messages[messages.length - 1]?.parts?.[0]?.text || "";
            const newTranscript = [
                ...(lead.chat_transcript || []),
                { role: 'user', content: lastUserMsg },
                { role: 'assistant', content: text, toolInvocations: toolResults }
            ];

            const updatePayload: any = { chat_transcript: newTranscript };

            // Check for successful booking in toolResults
            const bookingResult = toolResults?.find((tr: any) => tr.toolName === 'book_demo' && (tr.result?.success || tr.output?.success));
            
            if (bookingResult) {
                const { name, phone, date, time } = bookingResult.result || bookingResult.output || {};
                
                updatePayload.stage = 'Sales';
                updatePayload.intent_score = 'Hot';
                updatePayload.intent_summary = JSON.stringify({
                    insights: { name, phone, date, time_slot: time },
                    last_update: new Date().toISOString()
                });

                if (name || phone) {
                    await supabase.from('customers').update({ 
                        ...(name && { name }), 
                        ...(phone && { phone }) 
                    }).eq('id', customer_id);
                }

                const currentPlan = lead.engagement_plan || [];
                updatePayload.engagement_plan = [
                    ...currentPlan,
                    { day: "Today", action: `📅 Demo Booking Confirmed for ${date} at ${time}. Lead moved to Sales stage.` }
                ];
            } else {
                // Regular extraction if no booking
                const { text: extractionText } = await generateText({
                    model: google('gemini-pro'),
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
                        
                        if (extractedData.name) {
                            await supabase.from('customers').update({ name: extractedData.name }).eq('id', customer_id);
                        }
                    }
                } catch (e) { }
            }

            await supabase.from('vendor_leads').update(updatePayload).eq('id', lead.id);
        }
    } catch (e) {
        console.error("handleChatFinish error:", e);
    }
}
