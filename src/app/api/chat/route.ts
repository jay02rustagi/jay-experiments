import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, zodSchema, generateText, createUIMessageStream, createUIMessageStreamResponse, generateId, stepCountIs } from 'ai';
import type { UIMessageChunk } from 'ai';
import { z } from 'zod';
import cars from '@/data/cars.json';
import { supabase } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type Car = (typeof cars)[number];

const CHAT_MODEL = 'gemini-2.5-flash';
// Lead extraction runs after every reply; a separate model keeps it off the chat model's free-tier quota
const EXTRACTION_MODEL = 'gemini-2.5-flash-lite';

// The whole inventory is small, so the model always sees all of it, in a fixed order
const inventoryContext = cars.map((c: Car) =>
    `- ${c.year} ${c.make} ${c.model}: ${c.type}, $${c.price.toLocaleString()}, ${c.specs.seating_capacity} seats, ` +
    `${c.overview.fuel_type}, ${c.overview.transmission}, ${c.specs.max_power}. ` +
    `Features: ${c.features.join(', ')}. ${c.presales_pitch} Service: ${c.aftersales_schedule}`
).join('\n');

const CONVERSATION_RULES = `HOW TO TALK
- You are having a conversation, not running a search engine. Always reply in words, and answer the buyer's actual question first.
- Keep replies short: 2 to 4 sentences, or a few bullets when comparing. Ask at most one question per reply.
- Use the buyer's name once you know it.
- Only discuss cars in the inventory below. Never invent cars, prices or specs. Prices are in US dollars.
- If you don't know something (finance rates, trade-in value, delivery dates), say a sales executive will confirm it.

TOOLS
- list_cars shows car cards in the chat. Call it only when the buyer asks to see cars or options, or when you have just learned enough (at least body type, budget or seats) to recommend cars for a new need.
- Do NOT call list_cars when the buyer asks a question, wants advice, asks to compare, asks about a car already shown, or is just chatting. Answer in words and name specific cars from the inventory where it helps.
- Earlier cards appear in the conversation as "[Showed cars: ...]". Never show the same cars again unless asked.
- After cards appear, add one or two sentences on why they fit this buyer, then one question.
- book_demo opens the test-drive booking form. Call it as soon as the buyer wants a test drive, demo, showroom visit or call back. Pass any name, phone or car you already know, and don't ask more questions first.

EXAMPLE
Buyer: "Which is better, a sedan or an SUV for a family?"
Good reply: explain the trade-off in words using this inventory (for example, the one SUV with third-row seating if the family is large, or a cheaper, more efficient sedan for four), then ask how many people usually ride. No cards.

INVENTORY
${inventoryContext}`;

const STAGE_PROMPTS: Record<string, string> = {
    Presales: `You are Vini, the virtual sales assistant for SpyneAuto, a car dealership, chatting with a buyer on the dealership website.
YOUR GOAL: understand what the buyer needs, help them narrow down to one to three cars, then get them to book a test drive.
Worth learning, one thing at a time and only when it comes up naturally: who rides in the car, main use (city, highway, off-road), budget, must-have features.`,
    Sales: `You are Vini, the senior sales executive at SpyneAuto, chatting with a returning buyer who has already shown interest.
YOUR GOAL: answer any remaining questions about their shortlisted car, then get the test drive confirmed with book_demo.`,
    Aftersales: `You are Vini, the service concierge at SpyneAuto, chatting with an existing owner.
YOUR GOAL: answer questions about servicing, maintenance schedules and features of their car, using the service notes in the inventory. Don't try to sell a new car unless they ask.`,
};

// The model can't read UI tool parts, so turn them into short notes it can follow ("[Showed cars: ...]")
function toModelMessages(messages: any[]) {
    return (messages || []).map((m: any) => {
        const pieces: string[] = [];

        if (typeof m.content === 'string') pieces.push(m.content);

        for (const p of m.parts || []) {
            if (p?.type === 'text' && p.text) {
                pieces.push(p.text);
                continue;
            }
            const toolName = p?.type === 'tool-invocation' ? p.toolName : p?.type?.replace(/^tool-/, '');
            const output = p?.output || p?.result;
            if (toolName === 'list_cars' && output?.cars) {
                const shown = output.cars.map((c: Car) => `${c.year} ${c.make} ${c.model} ($${c.price.toLocaleString()})`);
                pieces.push(shown.length > 0 ? `[Showed cars: ${shown.join('; ')}]` : '[Searched inventory: no matching cars]');
            } else if (toolName === 'book_demo') {
                pieces.push('[Showed the test-drive booking form]');
            }
        }

        return {
            role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: pieces.join('\n').trim(),
        };
    }).filter((m) => m.content.length > 0);
}

const tools = {
    list_cars: {
        description: 'Show up to 3 car cards from inventory that match the buyer\'s stated needs. Only use when the buyer wants to see options.',
        inputSchema: zodSchema(z.object({
            body_type: z.enum(['Sedan', 'SUV', 'Coupe']).optional().describe('Only if the buyer has chosen one'),
            max_price: z.number().optional().describe('Budget ceiling in US dollars'),
            min_seats: z.number().optional().describe('Seats needed, e.g. 7 for a large family'),
            make: z.string().optional().describe('Brand, if the buyer named one'),
        })),
        execute: async ({ body_type, max_price, min_seats, make }: { body_type?: string; max_price?: number; min_seats?: number; make?: string }) => {
            const matched = cars
                .filter((c: Car) => !body_type || c.type === body_type)
                .filter((c: Car) => !max_price || c.price <= max_price)
                .filter((c: Car) => !min_seats || c.specs.seating_capacity >= min_seats)
                .filter((c: Car) => !make || c.make.toLowerCase().includes(make.toLowerCase()))
                .sort((a: Car, b: Car) => a.price - b.price);

            // An empty result is returned as-is so the model can say so, instead of showing random cars
            return { cars: matched.slice(0, 3) };
        }
    },
    book_demo: {
        description: 'Open the test-drive booking form in the chat.',
        inputSchema: zodSchema(z.object({
            name: z.string().optional(),
            phone: z.string().optional(),
            car_model: z.string().optional()
        })),
        execute: async (data: any) => data
    }
};

// Starts a streamed reply and waits for its first real chunk; returns null if the provider errors
// before any content (bad key, quota), so the caller can move on to the next tier
async function startReply(
    apiKey: string | undefined,
    system: string,
    modelMessages: ReturnType<typeof toModelMessages>,
    uiMessages: any[],
    onFinish: (props: any, google: any) => Promise<void>,
): Promise<ReadableStream<UIMessageChunk> | null> {
    if (!apiKey) return null;
    const google = createGoogleGenerativeAI({ apiKey });

    const result = streamText({
        model: google(CHAT_MODEL),
        system,
        messages: modelMessages,
        tools: tools as any,
        // Step 1 may call a tool; step 2 lets Vini say something about the cards it just showed
        stopWhen: stepCountIs(2),
        maxRetries: 0,
        onFinish: (props) => onFinish(props, google),
    });

    let providerError = '';
    const reader = result
        .toUIMessageStream({
            originalMessages: uiMessages,
            onError: (e: any) => {
                providerError = e?.message || String(e);
                return "Sorry, I lost my train of thought. Could you say that again?";
            },
        })
        .getReader();

    const buffered: UIMessageChunk[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === 'error') {
            console.error('Chat tier failed:', providerError);
            reader.cancel();
            return null;
        }
        buffered.push(value);
        if (value.type !== 'start' && value.type !== 'start-step') break;
    }

    return new ReadableStream<UIMessageChunk>({
        start(controller) {
            buffered.forEach((chunk) => controller.enqueue(chunk));
        },
        async pull(controller) {
            const { done, value } = await reader.read();
            if (done) controller.close();
            else controller.enqueue(value);
        },
        cancel() {
            reader.cancel();
        },
    });
}

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

    const systemPrompt = `${STAGE_PROMPTS[stage] || STAGE_PROMPTS.Presales}\n\n${CONVERSATION_RULES}`;
    const modelMessages = toModelMessages(messages);

    const onFinish = async (props: any, google: any) => {
        try {
            await handleChatFinish(props, messages, google, customer_id, vendor_id);
        } catch (e) {
            console.error("handleChatFinish failed:", e);
        }
    };

    // --- TIER 1 AND 2: PRIMARY, THEN SECONDARY GEMINI KEY ---
    for (const apiKey of [process.env.GOOGLE_GENERATIVE_AI_API_KEY, process.env.SECONDARY_GEMINI_API_KEY]) {
        try {
            const stream = await startReply(apiKey, systemPrompt, modelMessages, messages, onFinish);
            if (stream) return createUIMessageStreamResponse({ stream });
        } catch (e: any) {
            console.error("Chat tier threw:", e?.message || e);
        }
    }

    // --- TIER 3: SCRIPTED FALLBACK ---
    console.log("Tier 3: Scripted fallback");
    let fallbackText = "Hi! I'm Vini. We're experiencing high chat volume, but I'm here to help!";

    if (stage === 'Presales') {
        fallbackText = "Hi! I'm Vini. I'm in high-load mode right now, but I can still help you shortlist cars or book a test drive. What are you looking for?";
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

async function handleChatFinish({ text, steps }: any, messages: any[], google: any, customer_id?: string, vendor_id?: string) {
    try {
        // With multi-step replies, tool results live on the individual steps
        const toolResults = (steps || []).flatMap((s: any) => s.toolResults || []);
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
                    model: google(EXTRACTION_MODEL),
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
