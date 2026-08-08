import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { GuidedBuildService } from '@/lib/ai/build';
import type { BusinessBrief } from '@/lib/question-engine/brief';
import type { ConversationState } from '@/lib/question-engine/state';

export const runtime = 'edge';

/**
 * POST /api/ai/build/question
 *
 * Runs one guided-build question turn. The client is a Dumb Client: it sends
 * the current brief + state + the user's answer, and receives the updated
 * brief + state + the next question (or done=true).
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The client NEVER composes or decides. It only relays snapshots.
 *   - The server owns the Question Engine + AI extraction.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { brief, state, answer } = body as {
      brief?: BusinessBrief;
      state?: ConversationState;
      answer?: { questionId?: string; text?: string };
    };

    if (!answer || typeof answer.text !== 'string' || !answer.text.trim()) {
      return NextResponse.json(
        { success: false, message: 'Answer text is required' },
        { status: 400 },
      );
    }

    const service = new GuidedBuildService();
    const result = await service.runTurn({
      brief,
      state,
      answer: {
        questionId: answer.questionId ?? '',
        text: answer.text,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[ai/build/question]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to run question turn';
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
