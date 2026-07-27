\# Product Requirement Document

Version 2.0



Project Name

Site Builder CMS



Author

Serno



Status

Planning



Last Updated

2026



\---



\# 1. Vision



\## Overview



Version 2 transforms the existing static homepage into a complete website management platform.



The objective is not to redesign Version 1.



The objective is to build an administration system that allows complete website management without touching source code.



Users should never need to edit Markdown, HTML, GitHub repositories or Cloudflare settings directly.



Everything must be manageable from a web browser.



\---



\## Product Vision



Create a professional website builder that allows complete beginners to build and manage their own website with almost zero technical knowledge.



The system should automate every repetitive task including



• Site creation



• Content publishing



• Image optimization



• Deployment



• Domain connection



• AI assisted writing



The user should only focus on creating content.



Everything else should happen automatically.



\---



\## Target Users



Primary



People with no programming experience.



Examples



• Small business owners



• Artists



• Musicians



• Bloggers



• Local stores



• Restaurants



• Churches



• Temples



• Personal portfolio owners



\---



Secondary



Developers who want to generate websites faster.



\---



\# 2. Project Scope



Version 2 adds an administration layer on top of Version 1.



Version 1 remains unchanged.



Version 2 provides



• Admin Dashboard



• Setup Wizard



• Content Manager



• Media Library



• Theme Management



• Site Configuration



• Deployment Management



• AI Assistant



• Domain Management



\---



Version 2 does NOT replace Version 1.



Version 2 extends Version 1.



\---



\# 3. Design Principles



The following principles define every design decision.



\## Simplicity



Every feature must require as few clicks as possible.



The target user is a beginner.



\---



\## Automation



Every repetitive task should be automated.



Examples



Image optimization



Slug generation



Metadata generation



Deployment



SEO generation



Copyright generation



\---



\## Separation



Content



Configuration



Media



Deployment



must all be managed independently.



Never mix responsibilities.



\---



\## Reusability



Existing Version 1 components should be reused whenever possible.



New code should never duplicate existing functionality.



\---



\## Scalability



Every module should support future expansion.



No feature should be designed for only one website.



The architecture should support multiple websites in the future.



\---



\## Stability



Version 1 is production ready.



Version 2 must never reduce its stability.



Every new module should be independently testable.



\---



\# 4. Protected Area



Version 1 is considered stable.



The following resources are protected.



Existing Pages



Existing Components



Existing Layouts



Existing Styles



Existing Routing



Existing Markdown Structure



Existing Build Process



Existing Deployment Configuration



Existing Data Models



\---



Modification requires explicit approval.



Extension is always preferred over modification.



\---



\# 5. Product Goals



The system should achieve the following goals.



Goal 1



A beginner can create a complete website within five minutes.



\---



Goal 2



Publishing a new article requires only one button.



\---



Goal 3



Images are automatically optimized.



\---



Goal 4



The website automatically rebuilds after publishing.



\---



Goal 5



A custom domain can be connected without technical knowledge.



\---



Goal 6



AI assists beginners in writing professional content.



\---



Goal 7



The entire platform operates primarily within free-tier cloud services.



Preferred Infrastructure



Cloudflare Pages



Cloudflare R2



GitHub



Gemini API



\# 6. System Overview



\## System Architecture



Version 2 consists of six independent systems.



Each system has a single responsibility.



They communicate through clearly defined APIs.



```

\\\\\\\\\\\\\\\&#x20;               +----------------------+

\\\\\\\\\\\\\\\&#x20;               |     Admin Dashboard  |

\\\\\\\\\\\\\\\&#x20;               +----------+-----------+

\\\\\\\\\\\\\\\&#x20;                          |

\\\\\\\\\\\\\\\&#x20;       +------------------+------------------+

\\\\\\\\\\\\\\\&#x20;       |                  |                  |

\\\\\\\\\\\\\\\&#x20;       ▼                  ▼                  ▼

\\\\\\\\\\\\\\\&#x20;Site Settings      Content Manager     Media Manager

\\\\\\\\\\\\\\\&#x20;       |                  |                  |

\\\\\\\\\\\\\\\&#x20;       +---------+--------+---------+--------+

\\\\\\\\\\\\\\\&#x20;                 |                  |

\\\\\\\\\\\\\\\&#x20;                 ▼                  ▼

\\\\\\\\\\\\\\\&#x20;            GitHub Repository    Cloudflare R2

\\\\\\\\\\\\\\\&#x20;                 |                  |

\\\\\\\\\\\\\\\&#x20;                 +--------+---------+

\\\\\\\\\\\\\\\&#x20;                          |

\\\\\\\\\\\\\\\&#x20;                          ▼

\\\\\\\\\\\\\\\&#x20;                Cloudflare Pages Build

\\\\\\\\\\\\\\\&#x20;                          |

\\\\\\\\\\\\\\\&#x20;                          ▼

\\\\\\\\\\\\\\\&#x20;                  Public Website (V1)

```



\---



\## Core Modules



The platform consists of the following modules.



\### 1. Admin Dashboard



Central control panel.



Provides access to every management function.



Responsibilities



• Authentication



• Navigation



• Dashboard



• Notifications



\---



\### 2. Site Management



Controls global website settings.



Responsibilities



• Site title



• Description



• Logo



• Favicon



• Footer



• Contact



• Social Links



• Theme



• Navigation



\---



\### 3. Content Management



Responsible for every page and article.



Responsibilities



• Create



• Edit



• Delete



• Publish



• Draft



• Categories



• Tags



• Slug



• SEO Metadata



\---



\### 4. Media Library



Responsible for every uploaded asset.



Responsibilities



• Image upload



• Compression



• WebP conversion



• Cloudflare R2 upload



• File management



• Preview



• Delete



\---



\### 5. Deployment



Responsible for publishing.



Responsibilities



• Git Commit



• Git Push



• Build Trigger



• Deployment Status



• Build History



\---



\### 6. AI Assistant



Responsible for AI generated content.



Responsibilities



• About page



• Copyright



• SEO description



• Meta keywords



• Hero text



• Suggestions



\---



\# 7. Functional Requirements



The platform provides the following capabilities.



\---



\## FR-01



Website Initialization



The platform shall provide a setup wizard

for first-time users.



The wizard shall collect



• Site Name



• Description



• Logo



• Theme



• Contact Information



• Social Links



After completion



The configuration shall be saved automatically.



\---



\## FR-02



Dashboard



The platform shall provide

a central dashboard.



The dashboard displays



Recent Posts



Deployment Status



Storage Usage



Latest Activity



Quick Actions



\---



\## FR-03



Content Editor



The platform shall allow users

to create content without editing files.



The editor shall support



Markdown



Rich Text



Image Drag \& Drop



Auto Save



Preview



Publish



\---



\## FR-04



Media Upload



Users shall upload images

using drag and drop.



The system shall automatically



Compress



Convert to WebP



Upload to Cloudflare R2



Return the public URL



Insert the URL into the editor.



\---



\## FR-05



Publishing



Publishing shall require only one button.



After publishing



The platform shall



Generate Markdown



Generate Frontmatter



Commit to GitHub



Push Repository



Trigger Build



Refresh Website



without manual intervention.



\---



\## FR-06



Theme Switching



Users shall change themes

without editing source code.



Changing a theme updates

configuration only.



No manual deployment

is required.



\---



\## FR-07



Navigation Manager



Users shall create menus

using the dashboard.



The system automatically updates



Navigation



Routing



Header



Footer



\# 8. User Journey



The entire platform is designed around four user journeys.



\---



\## Journey 1

First Website Creation



```



Open Website



↓



Enter Secret Key



↓



Setup Wizard



↓



Basic Information



↓



Theme Selection



↓



Review



↓



Create Website



↓



Dashboard



```



Expected Time



Less than 5 minutes.



\---



\## Journey 2

Publishing a New Article



```



Dashboard



↓



Posts



↓



New Post



↓



Write



↓



Drag Images



↓



AI Assist (Optional)



↓



Preview



↓



Publish



↓



Website Updated



```



Expected Time



Less than 3 minutes.



\---



\## Journey 3

Website Customization



```



Dashboard



↓



Settings



↓



Change Logo



↓



Change Theme



↓



Change Footer



↓



Save



↓



Website Updated



```



No coding required.



\---



\## Journey 4

Custom Domain



```



Dashboard



↓



Domain



↓



Enter Domain



↓



Verify



↓



Connect



↓



SSL Ready



↓



Completed



```



No DNS knowledge required.



\---



\# 9. Dashboard Structure



The administration system is divided into independent modules.



```

Dashboard



├── Home

│

├── Posts

│     ├── All Posts

│     ├── Drafts

│     └── Categories

│

├── Pages

│

├── Media

│

├── Appearance

│     ├── Themes

│     ├── Navigation

│     ├── Footer

│     └── Homepage

│

├── Site Settings

│

├── SEO

│

├── AI Assistant

│

├── Deployment

│

├── Domain

│

└── Account

```



Every module should be independently maintainable.



\---



\# 10. Data Management Philosophy



The platform separates data by responsibility.



Never store unrelated data together.



\---



\##Site Configuration



Configuration is divided into multiple independent configuration files.



Core Configuration



site.json



Navigation



navigation.json



Social Links



social.json



Theme



theme.json



SEO



seo.json



Analytics



analytics.json



AI



ai.json



Deployment



deployment.json



Each configuration file has one responsibility.



Configuration files should never contain unrelated settings.---



\## Content



Contains



Articles



Pages



Categories



Tags



Drafts



Published Content



\---



\## Media



Contains



Images



Logos



Backgrounds



BGM



Documents



\---



\## Deployment



Contains



Build History



Git Status



Deployment Status



Logs



\---



\## AI



Contains



Prompt Templates



Generation History



Saved Outputs



Provider Settings



\---



\# 11. Configuration Strategy



The system should be configuration-driven.



Changing configuration should never require source code changes.



Everything should be editable through the dashboard.

Configuration should be modular.



Each configuration module should have its own JSON file.



Avoid storing all settings in a single configuration file.



Small independent files are easier to maintain,

version,

backup,

validate,

and extend.



Examples



Theme



Footer



Navigation



Homepage



SEO



Contact



Logo



BGM



Social Links



Analytics



Every setting should update configuration files rather than source code.



\---



\# 12. AI Assistant



The AI Assistant is an optional productivity feature.



The user should always remain in control.



AI suggestions must never overwrite existing content automatically.



\---



\## Supported Features



Generate About Page



Generate Hero Text



Generate Copyright



Generate SEO Description



Generate Meta Keywords



Generate Homepage Introduction



Rewrite Existing Text



Summarize Content



Grammar Correction



Tone Adjustment



\---



\## AI Providers



The architecture should support multiple providers.



Default



Google Gemini



Future Support



OpenAI



Anthropic Claude



Local LLM



The provider should be replaceable without changing business logic.



\# 13. Security



Security is a core requirement.



The platform should protect both users and infrastructure.



\---



\## Authentication



Version 2 uses Secret Key authentication.



Future versions may support



• Google Login



• Kakao Login



• GitHub Login



• Email Login



Authentication providers should be modular.



\---



\## Authorization



Only authenticated users may access



/admin



Administration APIs



Deployment



Settings



AI Features



Media Upload



GitHub Synchronization



\---



\## Secrets



The following values must never be exposed

to the browser.



GitHub Token



Cloudflare API Token



Cloudflare Account ID



Cloudflare Zone ID



Gemini API Key



Environment Variables



All secrets must remain server-side.



\---



\## Upload Security



Uploaded files should be validated.



Allowed



jpg



jpeg



png



webp



gif



svg (optional)



Rejected



Executable files



Scripts



Unknown extensions



Oversized files



\---



\## API Security



Every API endpoint must



Validate input



Validate authentication



Return standardized errors



Write logs



Never expose internal errors.



\---



\# 14. Error Handling



Every module must implement

consistent error handling.



\---



\## Standard Response



Every API returns



Success



Error Code



Human Readable Message



Technical Details (Server Only)



\---



\## Common Errors



Authentication Failed



Upload Failed



GitHub Commit Failed



Deployment Failed



Cloudflare Error



Gemini API Error



Validation Error



Network Timeout



Unknown Error



\---



\## Logging



Every important action should be logged.



Examples



Login



Publish



Deployment



Image Upload



Theme Change



AI Generation



Domain Connection



\---



\# 15. Performance



Performance is a product requirement.



\---



\## Goals



Initial Load



< 1 second



Dashboard



< 2 seconds



Publishing



< 5 seconds



Image Upload



< 10 seconds



Theme Switching



Instant



\---



\## Optimization



Lazy Loading



Image Compression



WebP Conversion



Incremental Build



Caching



Code Splitting



Dynamic Import



Bundle Optimization



\---



\# 16. Future Expansion



Version 2 is designed for future growth.



Possible future modules



\---



Multi User



Role Management



Plugin System



Template Marketplace



Analytics Dashboard



Newsletter



Comment System



Member Management



E-Commerce



Booking System



Reservation System



Portfolio Templates



Restaurant Templates



Temple Templates



Church Templates



Business Templates



Education Templates



Multiple Website Management



White Label Service



\---



Every future feature should be

implemented as an independent module.



\---



\# 17. Success Metrics



The project will be considered successful

when the following conditions are met.



A beginner creates a website

within five minutes.



A new article can be published

within one minute.



No source code editing required.



No GitHub knowledge required.



No Cloudflare knowledge required.



Images are automatically optimized.



Deployment is automatic.



The platform remains stable.



Version 1 remains untouched.



\---



\# 18. Out of Scope



The following features are NOT included

in Version 2.



Native Mobile App



E-Commerce



Online Payment



Membership System



Forum



Comment Moderation



Multi-language Translation



Plugin Marketplace



Template Store



These features belong to future versions.



\---



\# Final Statement



Version 2 is not a replacement

for Version 1.



Version 2 is an administration layer

built on top of Version 1.



The mission is simple.



Allow anyone to create and manage

a professional website

without writing code.



Version 1 remains stable.



Version 2 provides the management experience.



Both systems evolve independently.



\## Future Modules



The following modules are planned for future versions.



\- Template Manager

\- Plugin System

\- Multi-site Management

\- User Roles

\- Marketplace



\### Template Manager



The system may provide predefined website templates.



Examples



\- Portfolio

\- Cafe

\- Company

\- Restaurant

\- Temple

\- Church

\- Landing Page



Selecting a template automatically generates



\- Navigation

\- Default Pages

\- Homepage Layout

\- Recommended Theme

\- Default Configuration

