\# Admin UI Specification

Version 2.0



Project



Site Builder CMS



\---



\# 1. Overview



The Admin Dashboard is the control center of Version 2.



Every management feature begins here.



The dashboard must allow beginners to manage

their website without editing source code.



No GitHub.



No Cloudflare.



No Markdown editing.



Everything is managed through UI.



\---



\# 2. Design Principles



The interface should follow these principles.



Simple



Fast



Minimal



Consistent



Responsive



Beginner Friendly



Every screen should have one clear purpose.



Avoid unnecessary options.



\---



\# 3. Dashboard Layout



```



+----------------------------------------------------------+

| Logo | Site Name | Search | Notification | User |

+----------------------+-----------------------------------+

| Sidebar | |

| | |

| | Dashboard |

| | |

| | |

| | |

| | |

| | |

| | |

| | |

+----------------------+-----------------------------------+



```



\---



\# 4. Sidebar Navigation



Dashboard



Posts



Pages



Media



Appearance



Site Settings



SEO



AI Assistant



Deployment



Domain



Account



\---



Each menu owns one responsibility.



\---



\# 5. Dashboard Home



Purpose



Provide overall project status.



\---



Widgets



Recent Posts



Deployment Status



Storage Usage



Latest Activity



Website Status



Quick Actions



Recent AI Activity



\---



Quick Actions



Create Post



Upload Image



Deploy



Generate About



Open Website



Settings



\---



\# 6. Posts



Purpose



Manage blog articles.



\---



Functions



Create



Edit



Delete



Preview



Draft



Publish



Unpublish



Duplicate



Search



Filter



Sort



\---



Screen Layout



```



\--------------------------------------------------



All Posts



\--------------------------------------------------



Search



Category



Status



Date



\--------------------------------------------------



Title



Category



Status



Date



Actions



\--------------------------------------------------



```



\---



Actions



Edit



Preview



Duplicate



Delete



Publish



\---



\# 7. Post Editor



Purpose



Create articles.



\---



Sections



Title



Slug



Category



Tags



Featured Image



Editor



SEO



Publish



\---



Editor Toolbar



Bold



Italic



Heading



Quote



Code



Table



Image



Video



Link



Undo



Redo



Preview



AI Assist



\---



Publishing



Draft



Preview



Publish



Schedule



\# 8. Pages



Purpose



Manage static pages.



Examples



Home



About



Contact



Privacy Policy



Terms of Service



Gallery



FAQ



Landing Page



\---



Functions



Create



Edit



Delete



Duplicate



Preview



Publish



Hide



Reorder



\---



Page Types



Standard Page



Landing Page



Portfolio Page



Gallery Page



Contact Page



Custom Template



\---



\# 9. Media Library



Purpose



Manage all uploaded assets.



\---



Supported Files



Images



Logo



Background



BGM



Documents (Future)



Video (Future)



\---



Functions



Upload



Preview



Rename



Replace



Delete



Copy URL



Search



Filter



\---



Upload Flow



Drag \& Drop



↓



Validate



↓



Compress



↓



Convert to WebP



↓



Upload to Cloudflare R2



↓



Generate Public URL



↓



Store Metadata



↓



Done



\---



Media Card



Thumbnail



Filename



File Size



Upload Date



Used By



Copy URL



Delete



\---



\# 10. Appearance



Purpose



Customize website design.



\---



Modules



Themes



Homepage



Navigation



Footer



Logo



Favicon



Typography



Colors



Buttons



Animations (Future)



\---



Theme Screen



Theme List



↓



Live Preview



↓



Apply Theme



↓



Save



\---



Navigation Screen



Menu List



Add Menu



Delete Menu



Reorder



External Link



Visibility



\---



Footer Screen



Footer Text



Copyright



Social Icons



Contact



Custom HTML (Future)



\---



Homepage Screen



Hero Title



Hero Subtitle



Hero Button



Banner Image



Featured Posts



Latest Posts



BGM



\---



\# 11. Site Settings



Purpose



Configure global website information.



\---



Sections



General



Contact



Social



Localization



SEO Defaults



Analytics



Maintenance



\---



General



Site Name



Description



Language



Timezone



Date Format



\---



Contact



Email



Phone



Address



Business Hours



\---



Social



YouTube



Instagram



Facebook



Threads



TikTok



X



GitHub



LinkedIn



\---



Localization



Language



Timezone



Date Format



Currency (Future)



\---



Maintenance



Maintenance Mode



Coming Soon



Site Visibility



Read Only Mode (Future)



\---



\# 12. SEO



Purpose



Manage search engine optimization.



\---



Global SEO



Site Title



Default Description



Keywords



Canonical URL



Robots



\---



Social Preview



Open Graph Image



Facebook Preview



Twitter Card



\---



Structured Data



Schema



Organization



Website



Article



Breadcrumb



\---



Functions



Generate with AI



Preview



Validate



Save



\# 13. AI Assistant



Purpose



Assist users in creating high-quality website content using AI.



The AI Assistant is a writing assistant.



It never publishes content automatically.



The user always reviews and approves AI-generated content.



\---



\## AI Dashboard



Sections



Quick Generate



Rewrite



SEO Assistant



Translation (Future)



History



Templates



Provider Settings



\---



\## Quick Generate



Generate



About Page



Homepage Hero



Introduction



Footer Copyright



Privacy Policy



Terms of Service



SEO Description



Meta Keywords



Blog Summary



\---



\## Rewrite



Rewrite Existing Content



Improve Readability



Professional Tone



Friendly Tone



Shorten



Expand



Grammar Correction



\---



\## Prompt Templates



Frequently used prompts should be saved.



Examples



Business Introduction



Portfolio



Restaurant



Temple



Church



Landing Page



Blog Article



\---



\## AI History



Every AI generation is stored.



History includes



Prompt



Generated Result



Date



Provider



Model



Status



Users can



Reuse



Copy



Delete



Restore



\---



\# 14. Deployment



Purpose



Manage publishing and deployment.



Users should understand deployment

without learning Git or Cloudflare.



\---



\## Dashboard



Current Status



Last Deployment



Deployment History



Current Branch



Current Commit



Build Duration



Deployment URL



\---



\## Available Actions



Deploy



Rollback



Rebuild



View Logs



Refresh Status



\---



\## Deployment History



Deployment Time



Commit



Status



Duration



Triggered By



Rollback Button



\---



\## Build Status



Waiting



Building



Success



Failed



Cancelled



\---



\## Build Log



Step List



Elapsed Time



Error Messages



Warnings



Completion Status



\---



\# 15. Domain



Purpose



Connect a custom domain.



No DNS knowledge required.



\---



\## Sections



Current Domain



Connect Domain



SSL Status



DNS Verification



Connection History



\---



\## Domain Workflow



Enter Domain



↓



Validate



↓



Cloudflare Verification



↓



DNS Check



↓



SSL Request



↓



Connected



\---



\## Display Information



Primary Domain



Subdomain



SSL Status



Last Verification



Connection Date



\---



\# 16. Account



Purpose



Manage administrator account.



\---



\## Profile



Name



Email



Profile Image



Language



Timezone



Password



\---



\## Security



Secret Key



Change Password



Login History



Sessions



Future OAuth



\---



\## Preferences



Theme



Language



Notifications



Dashboard Layout



Default Editor



Auto Save



\---



\# 17. Notification Center



Purpose



Provide system feedback.



\---



Types



Success



Information



Warning



Error



\---



Examples



Article Published



Image Uploaded



Deployment Success



Deployment Failed



AI Generation Complete



Settings Saved



Domain Connected



\---



\# 18. Global Search



Purpose



Search the entire administration system.



\---



Search Targets



Posts



Pages



Media



Settings



Menus



SEO



AI History



Deployment History



\---



Search Features



Keyword



Recent



Filter



Category



Quick Jump



\---



\# 19. Responsive Design



The Admin Dashboard supports



Desktop



Tablet



Mobile



\---



Desktop



Full Sidebar



Multiple Panels



Large Tables



\---



Tablet



Collapsible Sidebar



Adaptive Layout



\---



Mobile



Bottom Navigation



Stack Layout



Touch Friendly



\---



\# 20. User Flow



The administrator should complete

all common tasks within three clicks.



Examples



Dashboard



↓



New Post



↓



Publish



\----------------------------



Dashboard



↓



Media



↓



Upload



\----------------------------



Dashboard



↓



Settings



↓



Save



\----------------------------



Dashboard



↓



AI



↓



Generate



\----------------------------



Dashboard



↓



Deploy



↓



Deploy



\----------------------------



Dashboard



↓



Domain



↓



Connect



\---



\# 21. UI Principles



Every screen should follow

the same design language.



Rules



One primary action per screen



Consistent spacing



Consistent typography



Consistent button placement



Consistent form layout



Minimal clicks



Clear feedback



No unnecessary complexity



\---



\# End of Document

