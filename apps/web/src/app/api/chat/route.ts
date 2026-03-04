import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the ReUse360 Water Conservation Assistant for Pinellas County Utilities. Help customers with watering schedules under SWFWMD FAC 40D-22.
WATERING DAYS: ODD addresses=Wednesday+Saturday. EVEN addresses=Thursday+Sunday. Non-residential=Tuesday+Friday.
HOURS: Only before 8AM or after 6PM. Watering 8AM-6PM is a VIOLATION.
EXEMPTIONS: Hand watering with shutoff nozzle, drip irrigation, new sod within 30 days, freeze prevention.
FINES: 1st=Warning 2nd=$50 3rd=$150 4th+=$300.
PCU: (727) 464-4000. Drought info: watermatters.org`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
