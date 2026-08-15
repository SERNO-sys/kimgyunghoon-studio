import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getSiteById } from '@/lib/db/queries';
import {
  AnswerIngestionBridge,
  EnrichmentRegenerator,
  type EnrichmentAnswer,
} from '@/lib/enrichment';
import type { SlotKey } from '@/lib/question-engine/brief';


export const runtime = 'edge';

/**
 * AWIE V2 — Enrichment Answer Submission.
 *
 * The minimal bridge that lets question answers re-enter the existing
 * Brain/BusinessBrief/content pipeline and regenerate an already-built site.
 *
 * FLOW (reuses the Golden Path — no redesign):
 *   user answers
 *     → AnswerIngestionBridge (answers → semantic business evidence)
 *     → EnrichmentRegenerator.regenerate() (existing BrainGoldenPath + evidence)
 *     → existing RecipeMerger / Design Intelligence
 *     → EnrichmentRegenerator.persist() (existing DB update path)
 *
 * SAFETY / FACT RULES:
 *   - Answers become evidence/input (user_asserted provenance), NOT facts.
 *   - Unanswered / blank fields are ignored — never treated as facts.
 *   - The existing Fact Validator remains authoritative: if the regenerated
 *     content fails validation, the bridge returns a structured failure and
 *     does NOT overwrite the site.
 *   - Only the site owner may submit answers.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This route does NOT add ThemeConfig fields, Renderer IDs, CSS, layout
 *     concepts, or component IDs.
 *   - It does NOT modify the canonical one-line generation path.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { siteId } = await params;
  const db = getDb();
  const site = await getSiteById(db, siteId);

  if (!site) {
    return NextResponse.json(
      { success: false, message: 'Site not found' },
      { status: 404 }
    );
  }

  // Only the site owner may enrich this site.
  if (site.ownerId !== session.userId) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
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

  const { prompt, answers } = (body ?? {}) as {
    prompt?: unknown;
    answers?: unknown;
  };

  // The original one-line prompt is required so the Golden Path can be re-run
  // with the additional semantic evidence. It is the canonical input.
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json(
      { success: false, message: 'Prompt is required' },
      { status: 400 }
    );
  }

  // Validate the answers array shape. Each answer must carry a questionId, a
  // slot, and a text string. Blank text is allowed (it is simply ignored by the
  // ingestion bridge — never treated as a fact), but the structural fields must
  // be present.
  if (!Array.isArray(answers)) {
    return NextResponse.json(
      { success: false, message: 'Answers must be an array' },
      { status: 400 }
    );
  }

  const validAnswers: EnrichmentAnswer[] = [];
  for (const a of answers) {
    if (!a || typeof a !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Each answer must be an object' },
        { status: 400 }
      );
    }
    const { questionId, slot, text } = a as {
      questionId?: unknown;
      slot?: unknown;
      text?: unknown;
    };
    if (typeof questionId !== 'string' || !questionId.trim()) {
      return NextResponse.json(
        { success: false, message: 'Each answer requires a questionId' },
        { status: 400 }
      );
    }
    if (typeof slot !== 'string' || !slot.trim()) {
      return NextResponse.json(
        { success: false, message: 'Each answer requires a slot' },
        { status: 400 }
      );
    }
    if (typeof text !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Each answer requires a text string' },
        { status: 400 }
      );
    }
    validAnswers.push({ questionId, slot: slot as SlotKey, text });

  }

  try {
    // 1. Answers → semantic business evidence (user_asserted provenance).
    //    Blank answers are ignored here — they never become facts.
    const evidence = new AnswerIngestionBridge().ingest(validAnswers);

    // 2. Re-run the existing Golden Path with the additional evidence and
    //    produce the updated ThemeConfig. The Fact Validator remains
    //    authoritative inside the pipeline.
    const regenerator = new EnrichmentRegenerator();
    const result = await regenerator.regenerate(prompt.trim(), evidence);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Enrichment failed: ${result.error.code} — ${result.error.message}`,
        },
        { status: 422 }
      );
    }

    // 3. Persist the regenerated ThemeConfig onto the existing site via the
    //    existing DB update path. This is the ONLY write performed.
    const updated = await regenerator.persist(
      site,
      result.v2Config,
      result.legacyConfig
    );
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to persist enriched site' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      siteId,
      factValidation: result.factValidation.status,
      answered: evidence.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to enrich site';
    console.error('[EnrichAnswers] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
