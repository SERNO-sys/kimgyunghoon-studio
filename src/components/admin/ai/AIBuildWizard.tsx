'use client';

/**
 * AWIE V2 - Milestone A3: AI Build Wizard (Dumb Client).
 *
 * A thin, stateless wizard that drives the guided build flow by relaying
 * snapshots to the server. It NEVER composes, decides, or mutates ThemeConfig.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The client is a Dumb Client. It only sends the current brief + state +
 *     the user's answer to /api/ai/build/question and receives the updated
 *     brief + state + next question.
 *   - When the flow is done, it calls /api/ai/build/plan to produce the
 *     immutable ThemeConfig and hands it to the caller via onComplete.
 *   - The client NEVER imports Core, NEVER evaluates business logic, and NEVER
 *     mutates ThemeConfig.
 */

import { useCallback, useState } from 'react';
import type { BusinessBrief } from '@/lib/question-engine/brief';
import type { ConversationState } from '@/lib/question-engine/state';
import type { ThemeConfig } from '@/lib/theme-config/v2/types';

/** The shape of a question returned by the server. */
interface BuildQuestion {
  id: string;
  slot: string;
  text: string;
  intent?: string;
}

/** The shape of the /api/ai/build/question response. */
interface QuestionTurnResponse {
  success: boolean;
  message?: string;
  brief?: BusinessBrief;
  state?: ConversationState;
  question?: BuildQuestion;
  done?: boolean;
}

/** The shape of the /api/ai/build/plan response. */
interface PlanResponse {
  success: boolean;
  message?: string;
  config?: ThemeConfig;
  industry?: { industryId: string; label?: string };
  industryMatched?: boolean;
  recipeId?: string;
  recipeScore?: number;
  decisions?: string[];
  warnings?: string[];
}

/** Props for the AI Build Wizard. */
export interface AIBuildWizardProps {
  /** Called with the produced ThemeConfig when the build completes. */
  onComplete: (config: ThemeConfig, meta: { recipeId?: string; decisions: string[] }) => void;
  /** Called when the user cancels the wizard. */
  onCancel?: () => void;
  /** Optional initial brief to resume an in-progress build. */
  initialBrief?: BusinessBrief;
  /** Optional initial state to resume an in-progress build. */
  initialState?: ConversationState;
}

/**
 * The AI Build Wizard.
 *
 * A Dumb Client: it relays snapshots to the server and renders the current
 * question. It holds NO business logic.
 */
export function AIBuildWizard({
  onComplete,
  onCancel,
  initialBrief,
  initialState,
}: AIBuildWizardProps) {
  const [brief, setBrief] = useState<BusinessBrief | undefined>(initialBrief);
  const [state, setState] = useState<ConversationState | undefined>(initialState);
  const [question, setQuestion] = useState<BuildQuestion | undefined>();
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /** Starts the wizard by running the first turn with an empty answer. */
  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/build/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, state, answer: { text: '' } }),
      });
      const data = (await res.json()) as QuestionTurnResponse;
      if (!data.success) {
        setError(data.message ?? 'Failed to start build');
        return;
      }
      setBrief(data.brief);
      setState(data.state);
      setQuestion(data.question);
      setDone(data.done ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start build');
    } finally {
      setLoading(false);
    }
  }, [brief, state]);

  /** Submits the current answer and advances to the next question. */
  const submit = useCallback(async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/build/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          state,
          answer: { questionId: question?.id, text: answer },
        }),
      });
      const data = (await res.json()) as QuestionTurnResponse;
      if (!data.success) {
        setError(data.message ?? 'Failed to submit answer');
        return;
      }
      setBrief(data.brief);
      setState(data.state);
      setQuestion(data.question);
      setAnswer('');
      setDone(data.done ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  }, [answer, brief, state, question]);

  /** Plans the site build from the completed brief. */
  const plan = useCallback(async () => {
    if (!brief) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/build/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      const data = (await res.json()) as PlanResponse;
      if (!data.success || !data.config) {
        setError(data.message ?? 'Failed to plan site build');
        return;
      }
      onComplete(data.config, {
        recipeId: data.recipeId,
        decisions: data.decisions ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to plan site build');
    } finally {
      setLoading(false);
    }
  }, [brief, onComplete]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">AI Build Wizard</h2>
      <p className="mt-1 text-sm text-gray-500">
        Answer a few questions and AWIE will generate a deterministic site.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!question && !done && (
        <div className="mt-6">
          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Starting…' : 'Start Build'}
          </button>
        </div>
      )}

      {question && !done && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">
            {question.text}
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-gray-300 p-2 text-sm"
            placeholder="Type your answer…"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={loading || !answer.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {done && (
        <div className="mt-6">
          <p className="text-sm text-gray-600">
            Your brief is complete. Generate your site now.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={plan}
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate Site'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
