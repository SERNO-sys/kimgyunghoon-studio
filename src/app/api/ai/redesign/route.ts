import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getSiteById, updateSite } from '@/lib/db/queries';
import { PRESETS } from '@/constants/presets';
import type { ThemeConfig, ThemePresetId } from '@/types/site';

export const runtime = 'edge';

const apiKey =
  typeof process !== 'undefined' && process.env
    ? process.env.GEMINI_API_KEY
    : undefined;
const genAI = apiKey ? new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }) : null;

const requestSchema = z.object({
  siteId: z.string().min(1),
  request: z.string().min(1).max(500),
});

const PRESET_IDS: ThemePresetId[] = [
  'default',
  'modern',
  'warm',
  'luxury',
  'minimal',
];

/**
 * V2 Theme System - Phase 5.
 *
 * Lightweight "AI vibe change" endpoint. The model is instructed to ONLY
 * analyze the user's request and return a single preset id as JSON. It must
 * never generate content text or CSS, keeping token usage and cost minimal.
 */
const REDESIGN_SYSTEM_PROMPT = `You are a design mood analyzer for a personal website builder.

Your ONLY job is to map the user's requested mood/vibe to exactly one of these design presets:
- "default" : warm, organic, classic feel (the current default look)
- "modern"  : clean, contemporary, crisp blue accent
- "warm"    : warm, cozy, stronger amber accents
- "luxury"  : premium, high-end, deep gold and charcoal
- "minimal" : clean monochrome, subtle contrast

Rules:
- Analyze the user's request and pick the single most fitting preset id.
- Respond with ONLY a JSON object in this exact shape: {"presetId": "one_of_the_ids_above"}
- Do NOT include any other text, explanation, markdown, or code fences.
- Do NOT generate any content text, HTML, or CSS. Never invent copy.
- If the request is ambiguous, choose the closest match; never return anything outside the 5 ids.`;

function buildUserPrompt(request: string): string {
  return `User's requested mood: "${request}"\n\nReturn the single best preset id as JSON.`;
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
      { success: false, message: 'siteId and request are required' },
      { status: 400 }
    );
  }

  const { siteId, request: userRequest } = parsed.data;

  const db = getDb();
  const site = await getSiteById(db, siteId);
  if (!site) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  // Only the owner (or an admin) may change this site's design.
  if (site.ownerId !== session.userId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `${REDESIGN_SYSTEM_PROMPT}\n\n${buildUserPrompt(userRequest)}`,
    });

    const raw = result.text?.trim() ?? '';
    if (!raw) {
      return NextResponse.json(
        { success: false, message: 'Empty response from AI' },
        { status: 500 }
      );
    }

    // Tolerate code fences / surrounding text by extracting the first JSON
    // object found in the response.
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, message: 'AI did not return a valid preset' },
        { status: 500 }
      );
    }

    let presetId: ThemePresetId;
    try {
      const parsedJson = JSON.parse(jsonMatch[0]) as { presetId?: unknown };
      const candidate = String(parsedJson.presetId ?? '').trim();
      if (!PRESET_IDS.includes(candidate as ThemePresetId)) {
        throw new Error('Invalid preset id');
      }
      presetId = candidate as ThemePresetId;
    } catch {
      return NextResponse.json(
        { success: false, message: 'AI returned an invalid preset' },
        { status: 500 }
      );
    }

    // Persist the chosen preset to the site's theme config.
    const themeConfig: ThemeConfig = {
      ...(site.themeConfig ?? {}),
      presetId,
    };
    await updateSite(db, site.id, { themeConfig });

    const preset = PRESETS[presetId];

    return NextResponse.json({
      success: true,
      presetId,
      preset: {
        id: preset.presetId,
        name: preset.name,
        description: preset.description,
        colors: preset.colors,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to redesign site';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
