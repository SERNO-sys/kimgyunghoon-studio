\# Database Schema Document

Version 1.0



Project

Site Builder CMS



\---



\# 1. Purpose



This document defines the database schema used by

Site Builder CMS.



The goal is to establish a stable data model

independent from implementation.



All business logic must follow this schema.



\---



\# 2. Database Philosophy



Database stores only dynamic data.



Static website content remains inside GitHub.



Markdown files remain the source of truth

for website content.



Cloudflare D1 stores



Users



Sites



Permissions



Sessions



Logs



Deployment History



Newsletter Settings



No Markdown content is stored inside D1.



\---



\# 3. Entity Relationship



```text

User (1)

│

├── owns

│

▼

Site (N)

│

├── Posts (GitHub)

├── Pages (GitHub)

├── Media (R2)

├── Navigation (JSON)

├── Theme (JSON)

├── Settings (JSON)

└── Deployment History (D1)



User

│

└── Newsletter Consent

```



\---



\# 4. Users Table



Purpose



Store authenticated users.



Columns



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary Key |

| google\_id | TEXT | Google OAuth ID |

| email | TEXT | User Email |

| name | TEXT | Display Name |

| avatar | TEXT | Profile Image |

| newsletter\_consent | BOOLEAN | Newsletter Agreement |

| created\_at | DATETIME | Account Creation |

| updated\_at | DATETIME | Last Update |

| last\_login | DATETIME | Last Login |



Constraints



Primary Key



Unique(email)



Unique(google\_id)



\---



\# 5. Sites Table



Purpose



Store websites created by users.



Columns



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary Key |

| owner\_id | UUID | FK → Users |

| name | TEXT | Site Name |

| slug | TEXT | Unique Site Slug |

| custom\_domain | TEXT | Optional |

| theme | TEXT | Current Theme |

| status | TEXT | Active / Draft |

| created\_at | DATETIME | Creation Date |

| updated\_at | DATETIME | Last Update |



Relationship



One User



↓



Many Sites



\---



\# 6. Sessions Table



Purpose



Track active login sessions.



Columns



| Field | Type |

|--------|------|

| id | UUID |

| user\_id | UUID |

| session\_token | TEXT |

| expires\_at | DATETIME |

| created\_at | DATETIME |



\---



\# 7. Deployment Table



Purpose



Deployment history.



Columns



| Field | Type |

|--------|------|

| id | UUID |

| site\_id | UUID |

| commit\_hash | TEXT |

| deployment\_status | TEXT |

| deployed\_at | DATETIME |

| rollback\_version | TEXT |



\---



\# 8. Activity Logs



Purpose



Audit log.



Columns



| Field | Type |

|--------|------|

| id | UUID |

| user\_id | UUID |

| site\_id | UUID |

| action | TEXT |

| target | TEXT |

| created\_at | DATETIME |



Examples



Create Post



Delete Image



Deploy



Theme Change



Domain Change



Login



Logout



\---



\# 9. Relationships



```text

Users



1



↓



N



Sites







Sites



1



↓



N



Deployment History







Users



1



↓



N



Sessions







Users



1



↓



N



Activity Logs

```



\---



\# 10. Ownership Rules



Every Site belongs to exactly one User.



Every Deployment belongs to exactly one Site.



Every Session belongs to exactly one User.



Every Log belongs to exactly one User.



Ownership must always be validated

before modifying resources.



\---



\# 11. Database Indexes



Users



email



google\_id



Sites



owner\_id



slug



custom\_domain



Deployment



site\_id



deployed\_at



Logs



user\_id



created\_at



\---



\# 12. Database Constraints



Never duplicate User.



Never duplicate Site Slug.



Every Site must have an Owner.



Delete User



↓



Never automatically delete Site.



Ownership must be transferred first.



\---



\# 13. Future Tables



The following tables may be added

without changing current schema.



Invitations



Roles



Teams



Payments



Subscriptions



Reservations



Orders



Bookings



Courses



CRM



Email Campaigns



Analytics



\---



\# 14. Data Source Policy



Cloudflare D1



↓



Users



Sites



Sessions



Deployments



Logs



GitHub



↓



Posts



Pages



Markdown



JSON Configuration



Cloudflare R2



↓



Images



Media Files



\---



\# 15. Final Summary



Cloudflare D1 stores only dynamic data.



GitHub remains the source of truth

for website content.



Cloudflare R2 stores media.



Every Site belongs to one User.



The database schema is designed to support

future expansion without modifying

existing business logic.



End of Document.

