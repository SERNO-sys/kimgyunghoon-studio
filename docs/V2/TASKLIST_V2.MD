\# TASKLIST\_V2.md

Version 2.0



Project

Site Builder CMS



\---



\# Development Rules

Version 1 is COMPLETE.

Version 2 MUST extend Version 1.

Never recreate Version 1.

Never duplicate existing functionality.

Always reuse existing modules whenever possible.

One Phase must be completed before the next Phase begins.

Every completed Phase must compile successfully.

No unfinished code should remain.



\---



\# Development Workflow

Every Phase follows the same structure.

Goal

Deliverables

Tasks

Done Criteria

Git Commit

Documentation Update



\---



\# PHASE 12

\## Admin Foundation



\### Goal

Create the administration framework without modifying Version 1.



\---

\### Deliverables

Admin Layout

Sidebar

Top Navigation

Authentication

Session Management

Shared Admin Components

Routing

User Management



\---

\### Tasks

Create `/admin`

Create admin layout

Create sidebar

Create header

Create dashboard home

Create authentication middleware

Create protected routes

Create shared admin components

Create loading screen

Create error boundary

Create notification system

Create user profile

Create user onboarding

Load current user

Create newsletter consent



\---

\### Done Criteria

Admin page loads successfully.

Unauthorized users cannot access `/admin`.

Shared layout is reusable.

Version 1 remains unchanged.



\---

\### Git Commit

feat(admin): create admin foundation



\---



\# PHASE 13

\## Setup Wizard



\### Goal

Allow first-time users to configure their website and save user information.



\---

\### Deliverables

Setup Wizard

Step Navigation

Configuration Storage

Validation



\---

\### Tasks

Create setup wizard

General Information step

Contact step

Social step

Theme selection

Review page

Save configuration

Validation

Wizard progress

Completion screen

Associate site with current user

Save site ownership



\---

\### Done Criteria

First-time users can finish setup.

Configuration is saved correctly.

Validation works.

Wizard supports restart.

Site is successfully linked to the authenticated user.



\---

\### Git Commit

feat(setup): implement setup wizard and site association



\---



\# PHASE 14

\## Site Settings



\### Goal

Allow users to edit website configuration and manage their account preferences.



\---

\### Deliverables

General Settings

Contact Settings

Social Settings

Localization

Analytics

Maintenance

Account Settings



\---

\### Tasks

General settings page

Contact page

Social links

Language

Timezone

Maintenance mode

Analytics settings

Save configuration

Reset configuration

Validation

Edit display name

Update profile image

Manage newsletter preferences



\---

\### Done Criteria

All settings can be edited.

Configuration persists.

Validation works.

No source code editing required.



\---

\### Git Commit

feat(settings): add website and account settings



\---



\# PHASE 15

\## Theme System



\### Goal

Implement a dynamic theme management system that allows users to switch website appearance without modifying source code.



\---

\### Deliverables

Theme Manager

Theme Preview

Theme Configuration

Theme Switcher

Theme Persistence



\---

\### Tasks

Create Appearance module

Create Theme Manager page

Display available themes

Implement live preview

Apply selected theme

Save theme configuration

Load current theme

Reset to default theme

Validate theme configuration

Implement fallback theme



\---

\### Done Criteria

Users can change themes through the dashboard.

Theme changes are reflected on the public website.

No source code modification is required.

Existing Version 1 layouts remain compatible.



\---

\### Git Commit

feat(theme): implement dynamic theme system



\---



\# PHASE 16

\## Content Manager



\### Goal

Replace manual Markdown creation with a beginner-friendly content management system.



\---

\### Deliverables

Post List

Post Editor

Draft System

Publishing

Category Manager

Tag Manager

Preview



\---

\### Tasks

Create Posts page

Create Post List

Create Post Editor

Implement Markdown generation

Generate frontmatter automatically

Generate slug automatically

Category management

Tag management

Featured image support

Draft support

Preview mode

Publish action

Update action

Delete action

Duplicate action

Search

Filter

Sort

Pagination

Autosave

Validation



\---

\### Done Criteria

Users can create, edit, preview, publish and delete posts without touching Markdown files.

Generated Markdown follows Version 1 conventions.

Publishing updates GitHub repository correctly.



\---

\### Git Commit

feat(posts): implement content management system



\---



\# PHASE 17

\## Media Manager (Cloudflare R2)



\### Goal

Provide centralized media management with automatic optimization and Cloudflare R2 integration.



\---

\### Deliverables

Media Library

Drag \& Drop Upload

Automatic Compression

Automatic WebP Conversion

Cloudflare R2 Upload

Media Browser



\---

\### Tasks

Create Media page

Implement drag \& drop uploader

Validate uploaded files

Resize oversized images

Compress images

Convert images to WebP

Upload files to Cloudflare R2

Receive public URL

Store media metadata

Display media library

Copy URL

Replace media

Delete media

Search media

Filter media

Usage tracking



\---

\### Done Criteria

Users can upload media directly from the dashboard.

Images are automatically optimized.

Cloudflare R2 stores uploaded assets successfully.

Media URLs can be reused inside the editor.



\---

\### Git Commit

feat(media): implement cloudflare r2 media manager



\---



\# PHASE 18

\## GitHub Repository Sync



\### Goal

Synchronize website content and configuration with the GitHub repository automatically.

The administrator should never interact with Git directly.



\---

\### Deliverables

GitHub Service

Repository Synchronization

Automatic Commit

Automatic Push

Commit History

Synchronization Status



\---

\### Tasks

Create GitHub Service

Configure GitHub authentication

Create repository validation

Implement commit generation

Implement automatic push

Generate commit messages

Handle merge conflicts

Synchronize configuration files

Synchronize Markdown files

Synchronize media references

Display synchronization status

Display latest commit information

Retry failed synchronization

Implement synchronization logs

Handle GitHub API errors

Verify repository ownership

Store repository connection per user



\---

\### Done Criteria

Every content change automatically creates a Git commit.

Synchronization completes successfully.

Repository status is displayed.

Failures can be retried safely.

Repository is strictly mapped to the authenticated user.



\---

\### Git Commit

feat(github): implement repository synchronization and ownership validation



\---



\# PHASE 19

\## Cloudflare Pages Deployment



\### Goal

Deploy website updates automatically after successful repository synchronization.

The deployment process should be fully automated.



\---

\### Deliverables

Deployment Service

Deployment Dashboard

Deployment History

Build Logs

Rollback Support



\---

\### Tasks

Create Deployment Service

Trigger Cloudflare Pages deployment

Monitor deployment progress

Display deployment status

Retrieve deployment history

Display build logs

Implement deployment retry

Implement deployment cancellation (if supported)

Validate deployment success

Refresh website status

Handle deployment errors

Create deployment notifications

Implement rollback support (where applicable)



\---

\### Done Criteria

Website is automatically deployed after repository synchronization.

Deployment status is visible in the dashboard.

Deployment failures are reported clearly.

Rollback is available when supported.



\---

\### Git Commit

feat(deployment): implement automatic deployment



\---



\# PHASE 20

\## Custom Domain Manager



\### Goal

Allow users to connect a custom domain without manual Cloudflare configuration.



\---

\### Deliverables

Domain Manager

Domain Validation

DNS Verification

SSL Status

Connection History



\---

\### Tasks

Create Domain page

Validate domain format

Verify domain ownership requirements

Verify site ownership before domain connection

Connect domain using Cloudflare API

Check DNS propagation

Request SSL certificate

Monitor SSL activation

Display domain status

Display SSL status

Display verification history

Reconnect failed domains

Remove connected domains

Handle Cloudflare API errors

Display user-friendly guidance



\---

\### Done Criteria

Users can connect a custom domain from the dashboard.

DNS status is displayed.

SSL activation is confirmed.

Connection failures provide clear guidance.

Only the verified site owner can modify domain settings.



\---

\### Git Commit

feat(domain): implement custom domain manager



\---



\# PHASE 21

\## AI Writer (Gemini)



\### Goal

Provide an AI-powered writing assistant that helps beginners generate professional content without leaving the editor.

The AI must act as an assistant, never automatically overwriting user content.



\---

\### Deliverables

\- AI Service Module (Abstracted Provider)

\- Gemini API Integration

\- Prompt Template Library

\- Generation UI (Widget \& Modal)

\- AI Generation History



\---

\### Tasks

\- Create AI Service architecture

\- Integrate Google Gemini API (Flash/Pro)

\- Create strict prompt templates (About, SEO, Copyright, Hero text)

\- Implement AI Generation UI within the Content Editor

\- Implement AI Quick Generate on the Dashboard

\- Save generation history to `ai.json` or local storage

\- Implement "Copy" and "Apply to Editor" actions

\- Handle AI Provider timeouts and errors gracefully



\---

\### Done Criteria

\- Users can generate contextual text based on simple keyword inputs.

\- Generated text can be previewed and inserted into the editor with one click.

\- API keys are securely protected on the server side.

\- AI history is logged and retrievable.



\---

\### Git Commit

`feat(ai): implement gemini ai assistant and prompt templates`



\---



\# PHASE 22

\## User Management



\### Goal

Manage authenticated users and their websites.



\---

\### Deliverables

User Profile

User Dashboard

Site Ownership

Newsletter Management

Account Preferences



\---

\### Tasks

View profile

Edit display name

Profile image

Newsletter opt-in/out

List owned sites

Delete account

Export account data



\---

\### Done Criteria

Users can manage their account and owned websites without administrator assistance.



\---

\### Git Commit

`feat(user): implement user management and profile settings`



\---



\# PHASE 23

\## Security \& Authentication



\### Goal

Secure the V2 Administration layer to prevent unauthorized access while keeping the V1 public website completely open.



\---

\### Deliverables

\- Secret Key Authentication System

\- Protected API Routes

\- Environment Variable Manager

\- Session Handling



\---

\### Tasks

\- Implement Secret Key verification flow

\- Create Authentication middleware for all `/admin` routes

\- Secure all `/api/admin/\*` endpoints

\- Ensure GitHub, Cloudflare, and Gemini API keys are NEVER exposed to the client

\- Implement secure file upload validation (prevent malicious scripts)

\- Create a logout mechanism and session expiration



\---

\### Done Criteria

\- Unauthenticated users are redirected from `/admin` to the login screen.

\- Public visitors accessing the V1 website experience zero interruption.

\- API keys are completely hidden from the browser console and network tabs.



\---

\### Git Commit

`feat(security): implement admin authentication and api protection`



\---



\# PHASE 24

\## Testing \& QA



\### Goal

Verify that the V2 CMS works flawlessly and ensure the "Protected Area" (V1) remains completely untouched and stable.



\---

\### Deliverables

\- V1 Regression Test Report

\- V2 End-to-End User Flow Test

\- Error Handling Validation



\---

\### Tasks

\- Verify V1 public rendering (Home, Music, Diary) is exactly as it was before V2.

\- Test the full "First Website Creation" Journey (FR-01).

\- Test the "Publishing a New Article" Journey (FR-02) from image upload to Cloudflare deployment.

\- Intentionally trigger GitHub API and Cloudflare API errors to verify error messages (🔴 배포 실패).

\- Verify Mobile, Tablet, and Desktop responsiveness for the Admin Dashboard.

\- Audit generated JSON configurations for data corruption.



\---

\### Done Criteria

\- V1 passes all regression tests with 0 modifications.

\- All User Journeys complete within the expected timeframes (e.g., publish under 3 minutes).

\- Error boundaries catch and display user-friendly messages for all API failures.



\---

\### Git Commit

`test: perform v1 regression and v2 end-to-end validation`



\---



\# PHASE 25

\## Release



\### Goal

Finalize the Version 2.0 system, update documentation, and prepare the project for production use.



\---

\### Deliverables

\- Final Production Build

\- Updated Documentation

\- Clean Architecture Handover



\---

\### Tasks

\- Clean up unused code, console logs, and temporary comments.

\- Verify final environment variables setup.

\- Run final `npm run build` to ensure static export succeeds.

\- Update `README.md` to explain the V1/V2 dual architecture.

\- Tag release `v2.0.0` in Git.



\---

\### Done Criteria

\- Project builds without errors or warnings.

\- Documentation accurately reflects the V2 CMS capabilities.

\- The system is ready to be handed over to beginner users.



\---

\### Git Commit

`chore: release version 2.0.0`



\---



\# Definition of Done (DoD) for Version 2.0



The entire V2 project is considered \*\*COMPLETE\*\* only when ALL of the following conditions are met:



1\. \*\*V1 Protection\*\*: The public website (V1) looks and performs exactly as it did before V2, with zero breaking changes.

2\. \*\*Zero Code Editing\*\*: A user can create a site, write posts, upload images, and change themes using only the web browser.

3\. \*\*Infrastructure Automation\*\*: GitHub commits, pushes, and Cloudflare deployments occur fully automatically behind the scenes.

4\. \*\*Media Separation\*\*: All uploaded images are routed to Cloudflare R2 and inserted as URLs, keeping the Git repository lightweight.

5\. \*\*Beginner Friendly\*\*: No technical jargon (Markdown, Git, DNS) is required for the user to operate the dashboard.

