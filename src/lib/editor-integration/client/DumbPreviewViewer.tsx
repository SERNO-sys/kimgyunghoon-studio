/**
 * AWIE V2 - Phase 12.5: Editor Integration - Dumb React Viewer (MANDATE 2).
 *
 * THE CLIENT IS A DUMB CLIENT.
 *
 * This component is the ONLY thing the client renders. It receives a RenderNode
 * preview (the canonical Runtime output) and materializes it into React via the
 * React Adapter. It NEVER:
 *
 *   - imports or holds the ThemeConfig (the SSOT),
 *   - imports the GoldenPathOrchestrator or any Runtime service,
 *   - imports the EditorService or any Application Layer service,
 *   - makes any business decision.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT NEVER DECIDES
 *      The client receives a fully-rendered RenderNode tree from the server and
 *      merely displays it. It does not interpret business meaning, does not
 *      validate, and does not render from raw config.
 *
 *   2. THE CLIENT NEVER HOLDS THE SSOT
 *      The ThemeConfig NEVER crosses the wire. The client only ever sees the
 *      RenderNode preview. This is the enforcement of the Dumb Client rule.
 *
 *   3. THE CLIENT IS FRAMEWORK-BOUND
 *      This is a React component (the Framework Adapter layer). It contains
 *      ZERO business logic. It only materializes the RenderNode via the React
 *      Adapter.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure client-side presentation for the integration layer.
 */

'use client';

import * as React from 'react';
import type { RenderNode } from '../../renderer-foundation';
import { DefaultReactAdapter } from '../../renderer-react';
import { InMemoryReactComponentRegistry } from '../../renderer-react';
import { Hero, Text } from '../../renderer-react/components';

/**
 * The Dumb React Viewer.
 *
 * Receives a RenderNode preview and materializes it into React via the React
 * Adapter. It is a pure presentation component. It NEVER decides and NEVER
 * holds the ThemeConfig.
 *
 * The React component registry is populated with the semantic presentation
 * components (Hero, Text) that the server's RenderNode references by
 * componentId. This is the Framework Adapter's responsibility — it maps
 * componentId -> React component. It contains no business logic.
 */
export function DumbPreviewViewer({
  renderNode,
}: {
  /** The RenderNode preview received from the server. */
  renderNode: RenderNode;
}) {
  // The React component registry maps componentId -> React component. This is
  // the Framework Adapter's job. It is populated once and reused across renders.
  const registryRef = React.useRef<InMemoryReactComponentRegistry | null>(null);
  if (registryRef.current === null) {
    const registry = new InMemoryReactComponentRegistry();
    registry.register('hero', Hero);
    registry.register('text', Text);
    registryRef.current = registry;
  }

  // Materialize the RenderNode into React via the React Adapter. The adapter
  // walks the tree and resolves each componentId through the registry. It
  // contains no business logic.
  const adapter = React.useMemo(() => new DefaultReactAdapter(), []);
  const element = adapter.render(renderNode, {
    registry: registryRef.current,
  });

  return <>{element}</>;
}
