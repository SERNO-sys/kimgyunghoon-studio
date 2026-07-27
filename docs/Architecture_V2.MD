\[ZEST-CHECK: OK]



\[목적 요약]

아키텍처 문서 V2.0의 최종본 완성을 위해 인증 계층과 서비스의 중복 제거, D1 인프라와 데이터 스토리지의 역할 명확화, 그리고 실제 CMS 구조에 맞춘 계층적 데이터 관계도 등 3가지 최종 수정 사항을 반영합니다.



\[핵심 답변]

AuthenticationService를 Application Layer로 옮겨 기능적 역할을 부여하고, Authentication Layer는 진입점(Gate) 역할로 한정했습니다. 인프라 엔진(Cloudflare D1 Service)과 실제 저장되는 데이터(Users, Sites 등)를 철저히 분리하였으며, 사용자(User)가 사이트(Site)를 소유하고 사이트가 하위 데이터(Posts, Media 등)를 가지는 실제적인 1:N:N 관계도로 수정하여 과설계 없이 최종 문서를 확정했습니다.



\[세부 단계]

다음은 최종 수정이 반영된 V2.0 아키텍처 문서 전문입니다.



```markdown

\# Architecture Document

Version 2.0



Project

Site Builder CMS



\---



\# 1. Architecture Philosophy



\## Overview

Version 2 extends Version 1.

Version 1 remains the public website.

Version 2 becomes the management system.



The architecture separates

Presentation

Business Logic

Infrastructure

Storage

Deployment

into independent layers.



No layer should directly depend on implementation details of another layer.



\---



\## Core Principles

Single Responsibility

Loose Coupling

High Cohesion

Configuration Driven

API First

Reusable Components

Scalable Modules

Independent Deployment



\---



\# 2. System Layers



```text

+--------------------------------------------------+

| Presentation Layer                               |

| Public Website (V1)                              |

| Admin Dashboard (V2)                             |

+--------------------------------------------------+

&#x20;                       │

&#x20;                       ▼

+--------------------------------------------------+

| Authentication Layer (Gate)                      |

| Google OAuth                                     |

| Session Middleware                               |

| Authorization                                    |

| Permission Check                                 |

+--------------------------------------------------+

&#x20;                       │

&#x20;                       ▼

+--------------------------------------------------+

| Application Layer                                |

| Site Service                                     |

| Content Service                                  |

| Media Service                                    |

| Authentication Service                           |

| AI Service                                       |

| Deployment Service                               |

+--------------------------------------------------+

&#x20;                       │

&#x20;                       ▼

+--------------------------------------------------+

| Infrastructure Layer (Engines \& APIs)            |

| GitHub API                                       |

| Cloudflare R2 Service                            |

| Cloudflare Pages Service                         |

| Cloudflare D1 Service                            |

| Gemini API                                       |

+--------------------------------------------------+

&#x20;                       │

&#x20;                       ▼

+--------------------------------------------------+

| Storage Layer (Stored Data)                      |

| Markdown                                         |

| JSON Config                                      |

| Users                                            |

| Sites                                            |

| Sessions                                         |

| Images                                           |

| Environment Variables                            |

+--------------------------------------------------+



```



\---



\# 3. Overall Folder Structure



```text

project/

│

├── docs/

├── content/

│   ├── posts/

│   ├── pages/

│   └── drafts/

├── public/

│   ├── images/

│   └── icons/

├── src/

│   ├── app/

│   │   ├── (public)/

│   │   ├── admin/

│   │   │   ├── dashboard/

│   │   │   ├── posts/

│   │   │   ├── pages/

│   │   │   ├── media/

│   │   │   ├── appearance/

│   │   │   ├── settings/

│   │   │   ├── seo/

│   │   │   ├── deployment/

│   │   │   ├── ai/

│   │   │   └── domain/

│   │   └── api/

│   ├── components/

│   │   ├── common/

│   │   ├── public/

│   │   └── admin/

│   ├── lib/

│   │   ├── github/

│   │   ├── cloudflare/

│   │   ├── ai/

│   │   ├── markdown/

│   │   ├── seo/

│   │   └── utils/

│   ├── server/

│   ├── types/

│   ├── hooks/

│   ├── styles/

│   ├── config/

│   └── middleware/



```



\---



\# 4. Architecture Separation



Public Website

↓

Only Rendering

No Administration Logic

No API Tokens

No Editing Logic



\---



Admin

↓

Only Management

No Public Rendering

No Static Website Code



\---



API

↓

Business Logic

Authentication

Validation

Storage

Deployment

AI



\---



Infrastructure

↓

GitHub

Cloudflare

Gemini

Environment Variables

No UI



\# 5. Module Dependency



Modules must depend only on lower layers.

Dependencies must always flow downward.

Never create circular dependencies.



```text

&#x20;                      +----------------------+

&#x20;                      |      Dashboard       |

&#x20;                      +----------+-----------+

&#x20;                                 |

&#x20;      +--------------------------+--------------------------+

&#x20;      |                          |                          |

&#x20;      ▼                          ▼                          ▼

Site Management           Content Manager            Theme Manager

&#x20;      |                          |                          |

&#x20;      +------------+-------------+-------------+------------+

&#x20;                   |                           |

&#x20;                   ▼                           ▼

&#x20;            Media Manager               AI Assistant

&#x20;                   |                           |

&#x20;                   +-------------+-------------+

&#x20;                                 |

&#x20;                                 ▼

&#x20;                        Deployment Service

&#x20;                                 |

&#x20;                +----------------+----------------+

&#x20;                |                                 |

&#x20;                ▼                                 ▼

&#x20;          GitHub Service                  Cloudflare Service

&#x20;                |                                 |

&#x20;                +----------------+----------------+

&#x20;                                 |

&#x20;                                 ▼

&#x20;                         External Infrastructure



```



\---



\# Dependency Rules



Dashboard

↓

Feature Modules

↓

Services

↓

Infrastructure

↓

External APIs



Never reverse this order.



\---



\# Service Architecture



Every business feature is implemented

through a dedicated service.



Services never depend on UI.

Services may be reused by

Admin

API

CLI

Automation

Future Mobile App



\---



SiteService

Responsible for

Site Metadata

Footer

Logo

Theme

Navigation

Configuration



\---



ContentService

Responsible for

Posts

Pages

Drafts

Publishing

Slug Generation

Categories

Tags

SEO Metadata



\---



MediaService

Responsible for

Upload

Compression

WebP Conversion

R2 Upload

Delete

Preview



\---



DeploymentService

Responsible for

Git Commit

Git Push

Deployment Trigger

Deployment History

Rollback



\---



DomainService

Responsible for

Domain Validation

Cloudflare Domain API

SSL

DNS

Verification



\---



AIService

Responsible for

Prompt Builder

Provider Selection

Prompt Execution

Response Validation

Generation History



\---



AuthenticationService

Responsible for

Google OAuth

Session

Authorization

Permissions

Current User



\---



NotificationService

Responsible for

Toast

Error Messages

Success Messages

Activity Logs



\---



\# 6. Data Flow



Every operation follows the same pipeline.



```text

User

↓

Authentication

↓

Admin UI

↓

Validation

↓

Business Service

↓

Infrastructure

↓

External API

↓

Result

↓

Notification

↓

Refresh UI



```



\---



\## Example



Publishing a Post



```text

Editor

↓

Validate Input

↓

Generate Frontmatter

↓

Generate Slug

↓

Upload Images

↓

Replace Image URLs

↓

Create Markdown

↓

Git Commit

↓

Git Push

↓

Cloudflare Build

↓

Deployment Success

↓

Website Updated



```



\---



\## Image Upload



```text

Drop Image

↓

Validate

↓

Resize

↓

Compress

↓

Convert WebP

↓

Upload R2

↓

Receive URL

↓

Insert URL

↓

Done



```



\---



\## Theme Change



```text

Theme Selection

↓

Validate

↓

Update Configuration

↓

Save

↓

Refresh UI

↓

Done



```



\---



\# 7. API Architecture



Every feature communicates through API.

Never access infrastructure directly from UI.



```text

Admin UI

↓

API Route

↓

Validation

↓

Service

↓

Infrastructure

↓

Response



```



\---



Example



```text

POST /api/posts/create

↓

ContentService

↓

GitHubService

↓

Repository

↓

Commit Success



```



\---



Another Example



```text

POST /api/media/upload

↓

MediaService

↓

CloudflareR2

↓

Public URL

↓

Editor



```



\---



\# API Design Rules



Every endpoint must

Validate Session

Validate Ownership

Validate Input

Return Standard Response

Write Logs

Handle Errors



Never expose secrets

Never expose tokens

Never call GitHub directly from React Components.



\# 8. State Management Architecture



\## Philosophy



The application is configuration-driven.

The UI must never own business data.

The UI only displays state.

Business logic lives inside services.

Persistent data lives inside configuration files or repositories.



\---



\## State Categories



The application separates state into four categories.



\### Global State



Used across the entire application.



Examples:

Authentication

Theme

Current User

Current Site

Notifications

Loading State



\---



\### Feature State



Owned by each feature module.



Examples:

Post Editor

Media Library

Deployment

AI Assistant

SEO

Settings



\---



\### Server State



Loaded from APIs.



Examples:

Posts

Pages

Images

Logs

Deployment Status

Domain Status

AI History



Never duplicate server state.

Always refresh through API.



\---



\### Temporary State



Lives only during interaction.



Examples:

Modal

Form Input

Wizard Step

Preview

Drag \& Drop

Upload Progress



Do not save temporary state.



\---



\# 9. Configuration Architecture



Everything configurable should be stored outside source code.

Changing configuration must never require editing React components.



\---



\## Configuration Modules



Site Configuration

Theme Configuration

Navigation Configuration

Footer Configuration

SEO Configuration

AI Configuration

Deployment Configuration

Media Configuration

Authentication Configuration

Analytics Configuration

Future Configuration



Each configuration has one responsibility.



\---



\## Configuration Rules



Configuration should

Be human readable

Be version controllable

Be portable

Be replaceable

Be extendable



Never hardcode values.



\---



\# 10. Repository Structure



Repository follows feature-first architecture.



```text

Repository

│

├── Public Website (V1)

├── Admin Dashboard (V2)

├── Shared Components

├── Shared Utilities

├── Services

├── Infrastructure

└── Documentation



```



\---



\## Shared Layer



The shared layer contains

Buttons

Cards

Modal

Icons

Typography

Utilities

Hooks

Validators

Formatters



No business logic.



\---



\## Feature Layer



Every feature owns

Pages

Components

Hooks

Services

Types

Validation

Styles



Never spread one feature across unrelated folders.



\---



\# 11. Admin Routing



Every administrator feature has its own route.



```text

/admin

↓

Dashboard



/admin/posts

↓

Posts



/admin/posts/new

↓

Create



/admin/posts/edit

↓

Edit



/admin/pages

↓

Pages



/admin/media

↓

Media



/admin/settings

↓

Settings



/admin/appearance

↓

Theme



/admin/navigation

↓

Navigation



/admin/seo

↓

SEO



/admin/deployment

↓

Deployment



/admin/domain

↓

Custom Domain



/admin/ai

↓

AI Assistant



/admin/account

↓

Account



```



\---



\## Routing Rules



One feature

One route

One responsibility



Nested routes should never share business logic.



\---



\# 12. JSON Architecture



The application stores structured configuration using JSON.

Every JSON file should have a single responsibility.



\*(Note: 사용자 정보 및 회원 관련 데이터는 JSON으로 생성하지 않습니다. 모든 회원의 계정, 사이트 소유권, 세션 정보는 Cloudflare D1의 Users Table에 저장됩니다.)\*



\---



\## site.json



Contains

Site Title

Description

Logo

Language

Theme

Timezone

Contact

Footer



\---



\## navigation.json



Contains

Menu

Order

Visibility

External Links



\---



\## social.json



Contains

Email

YouTube

Instagram

TikTok

Facebook

Threads

X

GitHub

LinkedIn



\---



\## seo.json



Contains

Title

Description

Keywords

Robots

Open Graph

Twitter Card

Schema Settings



\---



\## theme.json



Contains

Theme Name

Color Palette

Typography

Spacing

Radius

Animation



\---



\## analytics.json



Contains

Google Analytics

Google Search Console

Microsoft Clarity

Meta Pixel

Custom Scripts



\---



\## ai.json



Contains

Provider

Model

Temperature

Prompt Templates

History Limit



\---



\# JSON Rules



Every JSON file must have one purpose.

Never combine unrelated settings.

Never duplicate values.

Never store runtime state.



\# 13. Error Handling Architecture



Every module must implement a unified error handling strategy.



\---



\## Error Categories



Validation Error

Authentication Error

Authorization Error

API Error

Network Error

Storage Error

Deployment Error

AI Provider Error

Unknown Error



\---



\## Error Response



Every API should return

Success

Error Code

Error Message

Timestamp

Request ID

Technical Detail (Server Only)



Never expose stack traces.



\---



\## Retry Policy



Retry automatically:

Image Upload

Cloudflare Deployment

GitHub Push

AI Generation



Do not retry:

Authentication

Validation

Permission



\---



\# 14. Logging Architecture



Every important action should be logged.



\---



\## Log Categories



Authentication

Content

Media

Deployment

AI

Settings

Errors

System



\---



\## Log Levels



INFO

WARNING

ERROR

CRITICAL



\---



\## Logged Events



Login

Logout

Create Post

Update Post

Delete Post

Upload Image

Delete Image

Deploy

Rollback

AI Generation

Theme Change

Domain Connection



\---



\# 15. Security Architecture



Security is implemented in layers.



\---



Layer 1

Authentication

↓

Layer 2

Authorization

↓

Layer 3

Validation

↓

Layer 4

Business Logic

↓

Layer 5

Infrastructure



\---



\## Never expose



GitHub Token

Cloudflare Token

Gemini API Key

Environment Variables

Repository Secrets



\---



\## API Security



Every endpoint:

Validate Session

Validate Input

Validate Permission

Log Request

Return Standard Response



\---



\# 16. Extension Rules



Version 2 must remain modular.

Every future feature must be implemented as an independent module.



\---



Future Examples:

Reservation

Shop

Payment

Booking

Members

Courses

Events

Community

Plugins

CRM

Email Campaign

Marketing Automation

Analytics



\---



No future feature may modify core architecture.



\---



\# 17. Coding Standards



Every module follows the same internal structure.



```text

feature/

│

├── page.tsx

├── components/

├── hooks/

├── services/

├── types/

├── validation/

├── utils/

└── constants/



```



\---



\## Naming Rules



Pages: PascalCase

Components: PascalCase

Hooks: camelCase

Types: PascalCase

Constants: UPPER\_SNAKE\_CASE

Utilities: camelCase



\---



\## File Size



Recommended:

Component <300 lines

Service <300 lines

Hook <200 lines

Utility <150 lines



Large files should be divided.



\---



\# 18. Architecture Decision Record (ADR)



Major architectural changes must be documented.

Every decision should include:

Purpose

Reason

Alternatives

Trade-offs

Impact

Future Considerations



Never change architecture without updating documentation.



\---



\# 19. Future Migration Strategy



The architecture supports migration to:

Database

Supabase

PostgreSQL

Firebase

PlanetScale

Edge Database

without changing business logic.



Only Infrastructure Layer should require replacement.



\---



\# 20. Final Architecture Summary



Version 1

Public Website

↓

Version 2

Management Platform

↓

Infrastructure

Cloudflare D1 Service

Cloudflare Pages Service

GitHub API

R2 Service

AI Provider

↓

Configuration

JSON

↓

Content

Markdown

↓

Deployment

Automatic



The architecture is designed to maximize reuse, minimize coupling, and support future expansion without modifying Version 1.



\---



\# 21. Database Entity Relationships



```text

User (1)

&#x20;│

&#x20;├── owns

&#x20;▼

Site (N)

&#x20;│

&#x20;├── has

&#x20;├── Posts

&#x20;├── Pages

&#x20;├── Media

&#x20;├── Settings

&#x20;└── Navigation



```



End of Document.



