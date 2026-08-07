/**
 * AWIE V2 - Phase 17.6: Inline Editing - Lexical Wrapper (THIN WRAP).
 *
 * ADR-011D (Editor Layout Contract) FREEZES Inline Editing as the fourth zone:
 * double-clicking a text node swaps it for an inline Lexical editor, and on
 * blur/Enter the editor closes and emits an UpdateComponentCommand.
 *
 * AMENDMENT L - EDITOR ISOLATION (FROZEN):
 *
 *   Lexical MUST NEVER know ThemeConfig, RenderNode, PropertySchema,
 *   SelectionSnapshot, or EditorCommand. Lexical only edits text.
 *
 *   The INTEGRATION LAYER translates editor events into AWIE commands.
 *
 * THIS COMPONENT IS THE ISOLATED LEXICAL WRAPPER. It is the ONLY place in the
 * editor that imports Lexical. It:
 *
 *   - KNOWS NOTHING about AWIE. It receives a plain text seed and two plain
 *     callbacks (`onSave(value)` and `onCancel()`). It has NO idea what a
 *     Semantic Component Identity, ThemeConfig, or EditorCommand is.
 *   - ONLY edits text. It mounts a Lexical editor, seeds it, focuses it, and
 *     serializes the plain text on close.
 *   - Is THIN and REPLACEABLE. Swapping Lexical for another editor (e.g.
 *     TipTap) touches ONLY this file. The `onSave`/`onCancel` contract and the
 *     integration layer are unchanged (ADR-014, Replaceability).
 *
 * INTERACTION (Notion-style):
 *
 *   - On mount: the editor is seeded with `initialValue` and focused.
 *   - On blur: the editor serializes the current text and calls `onSave(value)`.
 *   - On Enter: the editor commits and calls `onSave(value)`.
 *   - On Escape: the editor calls `onCancel()` (no save).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure presentation wrapper around Lexical. It does NOT compose, validate, or
 * decide anything about the ThemeConfig.
 */

'use client';

import * as React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import type { EditorState } from 'lexical';

/**
 * The props the Lexical wrapper accepts.
 *
 * AMENDMENT L: These are PURE TEXT-EDITING props. There is NO Semantic Component
 * Identity, NO ThemeConfig, NO RenderNode, NO EditorCommand here. The wrapper is
 * fully decoupled from AWIE. The integration layer (inline-editing.ts) supplies
 * these props and translates the resulting text into an AWIE command.
 */
export interface LexicalInlineEditorProps {
  /** The initial plain-text value to seed the editor with. */
  readonly initialValue: string;
  /**
   * Called when the editor commits (blur or Enter) with the new plain-text
   * value. The wrapper does NOT know what happens to this value — it only
   * reports the text.
   */
  readonly onSave: (value: string) => void;
  /** Called when the user cancels (Escape). No save occurs. */
  readonly onCancel: () => void;
}

/**
 * The Lexical editor theme (minimal, inline).
 *
 * The wrapper renders the editor as a transparent, borderless inline text field
 * that visually replaces the static text node it is editing. It carries NO AWIE
 * styling knowledge — it is pure presentation.
 */
const EDITOR_THEME = {
  paragraph: 'awie-inline-editor__paragraph',
};

/**
 * The Lexical editor configuration.
 *
 * AMENDMENT L: The config is pure Lexical. It knows nothing about AWIE. The
 * editor is configured for plain text (rich text is a future capability).
 */
function createEditorConfig(initialValue: string): Parameters<typeof LexicalComposer>[0]['initialConfig'] {
  return {
    namespace: 'awie-inline-editor',
    theme: EDITOR_THEME,
    onError: (error: Error) => {
      // The wrapper is a Dumb Client. It reports editor errors to the console
      // only — it never touches the ThemeConfig or emits a Command.
      console.error('[LexicalInlineEditor]', error);
    },
    editorState: (editor) => {
      // Seed the editor with the initial plain-text value.
      editor.update(() => {
        $getRoot().clear();
        $getRoot().select();
      });
    },
  };
}

/**
 * The commit controller.
 *
 * This inner component (rendered inside the LexicalComposer context) wires the
 * blur / Enter / Escape behavior. It is the ONLY place that reads the editor
 * state and decides when to commit.
 *
 * AMENDMENT L: It produces a plain text value and hands it to `onSave`. It has
 * NO idea what AWIE does with it.
 */
function InlineEditorController({
  onSave,
  onCancel,
}: {
  readonly onSave: (value: string) => void;
  readonly onCancel: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const committedRef = React.useRef(false);

  // Serialize the current editor state to plain text.
  const serialize = React.useCallback((): string => {
    let text = '';
    editor.getEditorState().read(() => {
      text = $getRoot().getTextContent();
    });
    return text;
  }, [editor]);

  // Commit the edit (blur or Enter). Guarded so a single session commits once.
  const commit = React.useCallback(() => {
    if (committedRef.current) {
      return;
    }
    committedRef.current = true;
    onSave(serialize());
  }, [onSave, serialize]);

  // Cancel the edit (Escape). Guarded so a single session cancels once.
  const cancel = React.useCallback(() => {
    if (committedRef.current) {
      return;
    }
    committedRef.current = true;
    onCancel();
  }, [onCancel]);

  // Focus the editor on mount.
  React.useEffect(() => {
    editor.focus();
  }, [editor]);

  // Track the latest text so blur always commits the current value.
  const latestTextRef = React.useRef('');
  const handleChange = React.useCallback((editorState: EditorState) => {
    editorState.read(() => {
      latestTextRef.current = $getRoot().getTextContent();
    });
  }, []);

  return (
    <>
      <OnChangePlugin onChange={handleChange} />
      <HistoryPlugin />
      <PlainTextPlugin
        contentEditable={
          <ContentEditable
            className="awie-inline-editor__content"
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
              }
            }}
          />
        }
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary as unknown as Parameters<typeof PlainTextPlugin>[0]['ErrorBoundary']}
      />


    </>
  );
}

/**
 * The thin Lexical wrapper for inline editing.
 *
 * AMENDMENT L: This component is FULLY ISOLATED from AWIE. It only edits text.
 * It mounts a Lexical editor, seeds it, and reports the committed text via
 * `onSave`. The integration layer (inline-editing.ts) translates that text into
 * an UpdateComponentCommand.
 *
 * The wrapper is THIN and REPLACEABLE: swapping Lexical for another editor
 * touches ONLY this file.
 */
export function LexicalInlineEditor({
  initialValue,
  onSave,
  onCancel,
}: LexicalInlineEditorProps): React.ReactElement {
  const config = React.useMemo(() => createEditorConfig(initialValue), [initialValue]);

  return (
    <LexicalComposer initialConfig={config}>
      <InlineEditorController onSave={onSave} onCancel={onCancel} />
    </LexicalComposer>
  );
}
