import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { generateText } from '@/lib/ai/client';
import { saveGeneration } from '@/lib/ai/history';
import { templates } from '@/lib/ai/templates';

export const runtime = 'edge';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      templateKey?: string;
      context?: string;
    };
    const { templateKey, context } = body;

    if (!templateKey || typeof context !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Missing templateKey or context' },
        { status: 400 }
      );
    }

    const template = templates.find((item) => item.key === templateKey);
    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Unknown template' },
        { status: 400 }
      );
    }

    const result = await generateText(templateKey, context);
    const historyItem = {
      id: crypto.randomUUID(),
      templateKey,
      context,
      result,
      createdAt: new Date().toISOString(),
    };
    saveGeneration(historyItem);

    return NextResponse.json({
      success: true,
      result,
      historyItem,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
