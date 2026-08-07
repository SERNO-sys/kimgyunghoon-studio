#!/usr/bin/env bash
#
# AWIE V2 — v2.0.0 FROZEN ENGINE TAG
#
# This script officially tags the AWIE V2 Engine as FROZEN at v2.0.0.
#
# It is a PREPARED script for the CTO to execute. It does NOT run automatically.
# The CTO must explicitly approve and run this script to declare the engine
# FROZEN.
#
# PREREQUISITES:
#   - All engine tests pass (npx tsx scripts/ci-guard.ts)
#   - All Reference Products render (npx tsx scripts/products-test.ts)
#   - The working tree is clean (git status)
#
# USAGE:
#   bash scripts/tag-v2.0.0.sh
#
# WHAT IT DOES:
#   1. Verifies the working tree is clean.
#   2. Creates an annotated git tag `v2.0.0` marking the FROZEN engine.
#   3. Prints the FROZEN declaration.
#
# NOTE: This is a NON-DESTRUCTIVE, additive operation. It only creates a tag.
# It does NOT modify any engine source. It is the operational declaration of
# the Architecture Freeze (Phase 10.5).

set -euo pipefail

echo "=============================================="
echo " AWIE V2 — v2.0.0 FROZEN ENGINE TAG"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Verify the working tree is clean
# ---------------------------------------------------------------------------
echo "[1/3] Verifying the working tree is clean..."
if [ -n "$(git status --porcelain)" ]; then
  echo "  ERROR: The working tree has uncommitted changes."
  echo "  Commit or stash all changes before tagging the FROZEN engine."
  exit 1
fi
echo "  OK: Working tree is clean."
echo ""

# ---------------------------------------------------------------------------
# 2. Verify the tag does not already exist
# ---------------------------------------------------------------------------
echo "[2/3] Checking for an existing v2.0.0 tag..."
if git rev-parse "v2.0.0" >/dev/null 2>&1; then
  echo "  ERROR: Tag v2.0.0 already exists."
  echo "  The engine is already tagged FROZEN."
  exit 1
fi
echo "  OK: No existing v2.0.0 tag."
echo ""

# ---------------------------------------------------------------------------
# 3. Create the annotated tag
# ---------------------------------------------------------------------------
echo "[3/3] Creating the v2.0.0 FROZEN tag..."
git tag -a "v2.0.0" -m "AWIE V2 Engine FROZEN at v2.0.0

The AWIE V2 Engine is declared FROZEN. No further engine modifications are
permitted without explicit CTO approval. The engine is now a dependency,
never a target. All forward work happens ON TOP of the frozen engine.

Frozen layers:
  - AI Infrastructure (Phase 01)
  - ThemeConfig SSOT (Phase 02)
  - Generic Renderer (Phase 03)
  - Tenant Routing (Phase 04)
  - Question Engine (Phase 05)
  - Industry Registry (Phase 06)
  - Recipe Engine (Phase 07)
  - Renderer Foundation (Phase 08)
  - System Integration (Phase 09A)
  - UI Component System (Phase 09B)
  - Theme Ecosystem (Phase 10)
  - Architecture Freeze (Phase 10.5)
  - Runtime Services (Phase 11)
  - CMS Core (Phase 12)
  - Golden Path (Phase 12)
  - SDK (Phase 13)
  - CLI (Phase 13)

Reference Products (built ON TOP, not frozen):
  - products/ — 6 Business Reference Websites

See ENGINE_STATUS.md for the full FROZEN declaration."
echo "  OK: Tag v2.0.0 created."
echo ""

echo "=============================================="
echo " AWIE V2 ENGINE IS FROZEN AT v2.0.0"
echo "=============================================="
echo ""
echo "The engine is now a dependency, never a target."
echo "Only implementations evolve. Never redesign the platform"
echo "without explicit CTO approval."
echo ""
echo "To push the tag: git push origin v2.0.0"
