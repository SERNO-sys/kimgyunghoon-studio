/**
 * K.2 Decision Layer — DraftWriter.
 *
 * The DraftWriter is the concrete `DecisionWriter` adapter that bridges the
 * pure DecisionEngine to the persistence layer. It is the ONLY place in the
 * AI decision surface that touches the database. It reuses the existing
 * `updateSiteIfRevision` optimistic-concurrency write so a stale AI draft can
 * never silently overwrite a newer one.
 *
 * It is intentionally thin: it maps a `DecisionSurface` to the correct column
 * on the site row and delegates the atomic, revision-guarded write to the
 * existing query layer. No business logic lives here.
 */

import type { Db } from '../db/types';
import { updateSiteIfRevision } from '../db/queries';
import type { DecisionSurface, DecisionWriter } from './schema';

/** Maps a decision surface to the site column it mutates. */
function surfaceToColumn(surface: DecisionSurface): 'themeConfig' | 'description' | 'name' {
  switch (surface) {
    case 'themeConfig':
      return 'themeConfig';
    case 'settings':
      // The settings surface currently maps to the site description column.
      // Future settings surfaces can extend this mapping without touching the
      // engine or the writer contract.
      return 'description';
    case 'pages':
      // The pages surface currently maps to the site name column as a
      // placeholder. Extend here as page persistence is introduced.
      return 'name';
  }
}

/**
 * Creates a `DecisionWriter` backed by the D1/memory `Db`.
 */
export function createDraftWriter(db: Db): DecisionWriter {
  return {
    async commit(siteId, surface, baseRevision, payload) {
      const column = surfaceToColumn(surface);
      const updated = await updateSiteIfRevision(db, siteId, baseRevision, {
        [column]: payload,
      });
      // `updateSiteIfRevision` returns null when the optimistic concurrency
      // precondition fails (stale write). The engine treats that as a conflict.
      return updated ? updated.revision : null;
    },
  };
}
