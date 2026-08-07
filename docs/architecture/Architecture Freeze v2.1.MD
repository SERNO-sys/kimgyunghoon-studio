AWIE V2 — Architecture Freeze v2.1 (Draft)
Status

FROZEN

Reason

The Editor interaction architecture has converged. Selection, History, and Command execution now follow a single deterministic pipeline. Future editor features (Move, Duplicate, Replace, etc.) are expected to extend this architecture rather than redefine it.

10A. Command Handler Constitution (NEW)

The Editor never modifies ThemeConfig directly.

All editor interactions MUST follow the immutable command pipeline.

Editor UI
↓

EditorCommandPayload

↓

Command Handler

↓

ThemePatch

↓

ThemePatchPipeline

↓

NEW ThemeConfig

↓

RenderNode

Rules:

CommandHandlers translate intent only.
CommandHandlers NEVER mutate ThemeConfig.
CommandHandlers NEVER execute business logic.
Every CommandHandler MUST produce deterministic ThemePatches.
Undo/Redo MUST reuse the existing InversePatchGenerator.

Current canonical handlers:

UpdateComponentHandler
InsertComponentHandler
DeleteComponentHandler

Future handlers:

MoveComponentHandler
DuplicateComponentHandler
ReplaceComponentHandler

must follow the same architecture.

11A. Editor Interaction Constitution (NEW)

Editor UI is event driven.

User Interaction

↓

Selection Event

↓

SelectionSnapshot

↓

EditorCommandPayload

↓

ServerSideOrchestrator

UI components never manipulate each other directly.

Canvas

Tree

Inspector

TopBar

communicate only through shared events and snapshots.

13A. State Rule (NEW)

Derived data is NOT state.

Do not store data that can be derived.

Examples:

canUndo

canRedo

SelectionSnapshot

must be derived whenever possible.

Persistent state exists only when ownership is required.

16A. Development Workflow (NEW)

Every implementation follows this workflow.

Goal

↓

Reality Check

↓

Architecture Review

↓

Implementation

↓

Verification

↓

Merge

Additional steps such as OSS Survey or Constitution Check are required only when they reduce architectural risk.

Do not repeat completed Reality Checks.

Do not over-analyze completed phases.

16B. Buy Before Build (Clarification)

No new dependency may be introduced without approval.

When a dependency is required:

Need

↓

OSS Evaluation

↓

BUY / WRAP

↓

Approval

↓

Implementation

Never build infrastructure already solved by mature OSS.

17A. Stop Conditions (NEW)

Implementation MUST stop and report back when any of the following becomes necessary:

Core modification
Constitutional change
Approved architecture change
New dependency requiring approval

Never continue by inventing a new architecture.

Freeze Snapshot

The following editor architecture is now considered stable.

Selection

↓

SelectionSnapshot

↓

EditorCommandPayload

↓

CommandHandler

↓

ThemePatch

↓

History

↓

ThemePatchPipeline

↓

NEW ThemeConfig

↓

RenderNode

Current completed editor operations:

Update
Insert
Delete

Future operations are extensions of this pipeline.

Move
Duplicate
Replace