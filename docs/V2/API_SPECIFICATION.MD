\# API Specification

Version 1.0



Project

Site Builder CMS



\---



\# 1. Purpose



This document defines all API endpoints used by

Site Builder CMS.



Every feature communicates through APIs.



UI must never access infrastructure directly.



Business logic always lives inside Services.



\---



\# 2. API Design Principles



API First



RESTful Design



Stateless



Authentication Required



Ownership Validation



Standard Response Format



Consistent Error Handling



\---



\# 3. Request Pipeline



Every request follows the same pipeline.



```text

Request

↓

Authentication

↓

Ownership Validation

↓

Input Validation

↓

Business Service

↓

Infrastructure

↓

Response

```



\---



\# 4. Standard Response



Success



```json

{

&#x20; "success": true,

&#x20; "message": "Success",

&#x20; "data": {},

&#x20; "requestId": "uuid"

}

```



Error



```json

{

&#x20; "success": false,

&#x20; "error": {

&#x20;   "code": "VALIDATION\_ERROR",

&#x20;   "message": "Invalid input"

&#x20; },

&#x20; "requestId": "uuid"

}

```



\---



\# 5. Authentication API



Base Route



```

/api/auth

```



Endpoints



| Method | Endpoint | Description |

|--------|----------|-------------|

| POST | /login | Google OAuth Login |

| POST | /logout | Logout |

| GET | /me | Current User |



Authentication Required



No



Except



/me



Logout



\---



\# 6. Site API



Base Route



```

/api/sites

```



Endpoints



| Method | Endpoint |

|--------|----------|

| GET | / |

| POST | / |

| GET | /:id |

| PATCH | /:id |

| DELETE | /:id |



Ownership Validation



Required



\---



\# 7. Post API



Base Route



```

/api/posts

```



Endpoints



| Method | Endpoint |

|--------|----------|

| GET | / |

| POST | / |

| GET | /:id |

| PATCH | /:id |

| DELETE | /:id |



Publishing



```

POST



/api/posts/publish

```



Draft



```

POST



/api/posts/draft

```



Ownership Required



Yes



\---



\# 8. Page API



Base Route



```

/api/pages

```



Endpoints



GET



POST



PATCH



DELETE



\---



\# 9. Media API



Base Route



```

/api/media

```



Endpoints



POST /upload



GET /



DELETE /:id



Upload Flow



```text

Image



↓



Validation



↓



Resize



↓



Compression



↓



WebP



↓



Cloudflare R2



↓



Public URL

```



\---



\# 10. Theme API



```

GET



/api/theme



PATCH



/api/theme

```



\---



\# 11. Navigation API



```

GET



/api/navigation



PATCH



/api/navigation

```



\---



\# 12. SEO API



```

GET



/api/seo



PATCH



/api/seo

```



\---



\# 13. Deployment API



Base Route



```

/api/deployment

```



Endpoints



POST /deploy



GET /history



POST /rollback



Deployment Flow



```text

Git Commit



↓



Git Push



↓



Cloudflare Build



↓



Deployment Result

```



\---



\# 14. AI API



Base Route



```

/api/ai

```



Endpoints



POST /generate



POST /improve



GET /history



POST /translate



POST /summarize



\---



\# 15. Domain API



Base Route



```

/api/domain

```



Endpoints



POST /connect



GET /status



DELETE /



PATCH /



\---



\# 16. Account API



Base Route



```

/api/account

```



Endpoints



GET /



PATCH /



DELETE /



PATCH /newsletter



PATCH /profile



\---



\# 17. Permission Rules



Every API must verify



Authentication



↓



Ownership



↓



Permission



↓



Validation



↓



Execution



Users may only modify

their own resources.



\---



\# 18. Validation Rules



Every endpoint must



Validate Session



Validate Ownership



Validate Input



Validate Required Fields



Validate File Size



Validate Image Format



Never trust client input.



\---



\# 19. HTTP Status Codes



| Code | Meaning |

|------|---------|

| 200 | Success |

| 201 | Created |

| 204 | No Content |

| 400 | Validation Error |

| 401 | Unauthorized |

| 403 | Forbidden |

| 404 | Not Found |

| 409 | Conflict |

| 422 | Invalid Data |

| 429 | Too Many Requests |

| 500 | Internal Server Error |



\---



\# 20. Error Codes



AUTH\_REQUIRED



INVALID\_SESSION



PERMISSION\_DENIED



RESOURCE\_NOT\_FOUND



VALIDATION\_ERROR



UPLOAD\_FAILED



DEPLOY\_FAILED



AI\_PROVIDER\_ERROR



UNKNOWN\_ERROR



\---



\# 21. Security Rules



Never expose



GitHub Token



Cloudflare Token



Gemini API Key



Environment Variables



Repository Secrets



All secrets remain

server-side only.



\---



\# 22. Logging



Every request logs



Request ID



User ID



Site ID



Endpoint



Execution Time



Result



Error



\---



\# 23. Versioning



Current Version



v1



Future



```

/api/v2

```



may be introduced without

breaking existing APIs.



\---



\# 24. Rate Limiting



Apply rate limits to



Authentication



AI Generation



Image Upload



Deployment



Protect APIs from abuse.



\---



\# 25. Future APIs



Reservation



Booking



Payment



Shop



CRM



Email Campaign



Analytics



Plugins



Community



without modifying

existing endpoints.



\---



\# 26. Final Summary



Every request follows

the same lifecycle.



Authentication



↓



Ownership Validation



↓



Input Validation



↓



Business Service



↓



Infrastructure



↓



Response



All APIs are designed to be



Secure



Reusable



Consistent



Scalable



Framework Independent



End of Document.

