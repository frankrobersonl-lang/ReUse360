import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { queryRag, type RagResult } from "@/app/api/rag/query/route";

export const dynamic = 'force-dynamic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are the ReUse360 Water Conservation Assistant for Pinellas County Utilities. Help customers with watering schedules under SWFWMD FAC 40D-22.
WATERING DAYS: ODD addresses=Wednesday+Saturday. EVEN addresses=Thursday+Sunday. Non-residential=Tuesday+Friday.
HOURS: Only before 8AM or after 6PM. Watering 8AM-6PM is a VIOLATION.
EXEMPTIONS: Hand watering with shutoff nozzle, drip irrigation, new sod within 30 days, freeze prevention.
CITATION FEES: 1st citation=$193.00. 2nd citation within 30 days=$386.00 (doubles).
FINES: 1st=Warning 2nd=$50 3rd=$150 4th+=$300.
WATER SOURCE ENFORCEMENT: PCU enforces violations for ALL water source types — reclaimed (reuse), well water, lake/pond water, and potable (drinking) water. All sources are subject to the same SWFWMD watering restriction schedule. Source type does NOT exempt a customer from watering day/time restrictions.
PCU: (727) 464-4000. Drought info: watermatters.org`;

function buildSystemPrompt(ragResults: RagResult[]): string {
  if (ragResults.length === 0) return BASE_SYSTEM_PROMPT;

  const ragContext = ragResults
    .map((r, i) => `[Source ${i + 1}: ${r.title} (${r.sourceType}, relevance: ${(r.similarity * 100).toFixed(0)}%)]\n${r.content}`)
    .join('\n\n');

  return `${BASE_SYSTEM_PROMPT}

--- RETRIEVED CONTEXT FROM PCU KNOWLEDGE BASE ---
The following information was retrieved from the PCU document database based on the customer's question. Use this context to provide accurate, specific answers. If the context contains relevant violation records, cite specific details. If the context contradicts your base knowledge, prefer the retrieved context as it may reflect more recent data.

${ragContext}
--- END RETRIEVED CONTEXT ---`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    // Get the latest user message for RAG query
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
    let ragResults: RagResult[] = [];

    if (lastUserMessage && process.env.OPENAI_API_KEY) {
      try {
        ragResults = await queryRag(lastUserMessage.content, 3);
      } catch (err) {
        // RAG is best-effort — don't block the chat if it fails
        console.warn('RAG query failed, proceeding without context:', err);
      }
    }

    const systemPrompt = buildSystemPrompt(ragResults);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
