import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getSettingsBySiteId, getSiteById } from '@/lib/db/queries';
import { getCurrentUserTier, TIER_LIMITS } from '@/lib/config/tiers';
import { checkAiUsage, incrementAiUsage } from '@/lib/ai/usage';

export const runtime = 'edge';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }) : null;

const requestSchema = z.object({
  siteId: z.string().min(1),
  context: z.string().min(1),
  type: z.enum(['intro', 'menu_description', 'notice', 'profile', 'general']).default('general'),
});

const DRAFT_SYSTEM_PROMPT = `You are a helpful drafting assistant for a personal website.

Your job is to write a short text draft based on the user's context.

You must NOT generate HTML, CSS, code, or markdown tables.
You may use simple markdown such as **bold** or lists if it helps readability.
Write only plain, factual text. Do not invent achievements, careers, or services.
If context is insufficient, say exactly: "I need more information to write this."
`;

function buildUserPrompt(type: string, context: string): string {
  const typeLabel = {
    intro: 'introduction text',
    menu_description: 'menu description text',
    notice: 'announcement/notice text',
    profile: 'profile text',
    general: 'text draft',
  }[type];

  return `Write a ${typeLabel} in Korean based on the following context.\n\n${context}`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!genAI) {
    return NextResponse.json(
      { success: false, message: 'Gemini API key is not configured' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'siteId and context are required' },
      { status: 400 }
    );
  }

  const { siteId, context, type } = parsed.data;

  const db = getDb();
  const site = await getSiteById(db, siteId);
  if (!site) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  const userTier = getCurrentUserTier();
  const settings = await getSettingsBySiteId(db, siteId);
  const usage = settings
    ? checkAiUsage(settings.general, 'draft', userTier)
    : { allowed: true, used: 0, limit: TIER_LIMITS[userTier].AI_PATCH_LIMIT, remaining: TIER_LIMITS[userTier].AI_PATCH_LIMIT };

  if (!usage.allowed) {
    return NextResponse.json(
      { success: false, message: `Draft assistant limit reached (${usage.used}/${usage.limit})` },
      { status: 429 }
    );
  }

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `${DRAFT_SYSTEM_PROMPT}\n\n${buildUserPrompt(type, context)}`,
    });

    const text = result.text?.trim() ?? '';
    if (!text) {
      return NextResponse.json(
        { success: false, message: 'Empty response from AI' },
        { status: 500 }
      );
    }

    const updatedUsage = await incrementAiUsage(db, siteId, 'draft', userTier);

    return NextResponse.json({
      success: true,
      result: text,
      usage: updatedUsage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate draft';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
