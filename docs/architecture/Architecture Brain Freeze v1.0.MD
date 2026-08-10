AWIE V2 BRAIN SPECIFICATION v1.0

Architecture Freeze



Phase: G

Status: ARCHITECTURE FREEZE

Version: 1.0

Scope: Capability Vocabulary / Decision Rule Grammar / Recipe Compatibility

Implementation Status: NOT YET IMPLEMENTED



0\. Constitutional Statement



AWIE V2는 업종별 웹사이트 템플릿 시스템이 아니다.



AWIE V2는:



사업의 의미를 해석하고, 필요한 웹 기능을 결정하며, 이를 구현 가능한 Recipe로 변환하는 Universal Website Intelligence Engine이다.



따라서 다음 구조를 헌법으로 고정한다.



Business Meaning

&#x20;     ↓

Decision

&#x20;     ↓

Capability

&#x20;     ↓

Constraint

&#x20;     ↓

Recipe

&#x20;     ↓

ThemeConfig

&#x20;     ↓

Renderer



반드시 다음 방향으로만 흐른다.



WHAT → HOW → RENDER



역류는 허용하지 않는다.



1\. Non-Negotiable Architecture Boundaries

1.1 Question Engine



Question Engine의 책임:



User Input

&#x20;   ↓

Questions

&#x20;   ↓

BusinessBrief



Question Engine은:



Capability를 결정하지 않는다.

Section을 결정하지 않는다.

Layout을 결정하지 않는다.

Recipe를 선택하지 않는다.

Theme을 결정하지 않는다.



기존 헌법에서도 QuestionEngine → BusinessBrief로 역할을 제한하고 있습니다.



2\. Decision Engine



Decision Engine은 WHAT만 결정한다.



DecisionEngine

&#x20;   ↓

DecisionPlan



Decision Engine이 결정할 수 있는 것:



어떤 사업 기능이 필요한가

어떤 기능이 핵심인가

어떤 기능이 보조적인가

어떤 기능을 현재 활성화할 수 있는가

어떤 데이터 제약이 존재하는가

어떤 콘텐츠 요구사항이 존재하는가



Decision Engine이 결정하면 안 되는 것:



Hero.tsx

ProductGrid.tsx

CardLayout

CSS

specific component variant



즉:



Decision ≠ Component Selection



이 원칙은 기존 Brain 설계에서도 명시적으로 고정되어 있습니다.



3\. Capability Vocabulary v1

3.1 Capability의 정의



Capability는:



사용자가 웹사이트에서 수행하거나 제공해야 하는 사업적 기능



이다.



Capability는 Section이 아니다.



Capability는 Component가 아니다.



Capability는 Layout이 아니다.



Capability는 업종명이 아니다.



4\. Capability Vocabulary

4.1 Discovery

product\_discovery

service\_discovery

portfolio

content\_discovery

의미



사용자가 사업의 상품, 서비스, 결과물 또는 정보를 탐색할 수 있어야 하는 경우.



4.2 Conversion

purchase

booking

reservation

inquiry

lead\_capture

의미



사용자가 실제 사업 행동으로 전환할 수 있어야 하는 경우.



예:



구매

예약

상담 신청

문의

리드 확보

4.3 Physical / Local

location

operating\_hours

availability

의미



물리적 위치, 운영 시간 또는 실제 이용 가능 상태가 사업 경험에 중요한 경우.



4.4 Trust

trust

testimonial

case\_study

credentials

methodology

의미



신뢰 형성이 사업 전환에 중요한 경우.



예:



고객 평가

사례

자격

전문성

방법론

4.5 Time / Event

event

schedule

의미



시간 기반 서비스나 이벤트가 사업 구조의 중요한 부분인 경우.



4.6 Communication

contact

의미



사용자가 사업자와 직접 커뮤니케이션해야 하는 경우.



5\. Capability Vocabulary의 금지 항목



다음은 Capability로 등록하지 않는다.



about

team

faq

gallery

hero

footer

header

blog

card

grid

slider

testimonial-section

contact-section



이유:



이들은 표현 방식 또는 콘텐츠 구조이지 사업의 본질적 Capability가 아니기 때문이다.



예를 들어:



team



은 Capability가 아니다.



그것은 다음과 같이 표현될 수 있다.



trust

&#x20;   +

credentials

&#x20;   +

content



따라서 team을 하나의 Capability로 만들면 Vocabulary가 곧 Section Registry로 변질된다.



6\. Industry Registry



Industry Registry는 제거하지 않는다.



그러나 권한을 제한한다.



Industry Registry:



Knowledge Layer



이다.



Industry Registry는:



recommendation 제공

semantic hints 제공

일반적인 capability relevance 제공

recipe 후보군에 대한 knowledge 제공



만 할 수 있다.



Industry Registry는:



"Bakery → ProductGrid"



같은 강제 결정을 할 수 없다.



7\. Industry Independence



다음과 같은 규칙은 금지한다.



if industry === "bakery"



또는:



BakeryTemplate

RestaurantTemplate

LawFirmTemplate

HospitalTemplate



AWIE의 Core Decision Rule은 업종명이 아니라 semantic capability를 사용해야 한다.



따라서:



Bakery



와



Local artisan food producer



가 동일한 semantic structure를 갖는다면 동일한 Rule을 사용할 수 있어야 한다.



8\. Semantic Signals



Industry 이름 대신 다음과 같은 의미적 속성이 Decision에 입력될 수 있다.



예:



physical\_product

service\_based

location\_dependent

trust\_sensitive

time\_sensitive

transactional

appointment\_based

information\_heavy

portfolio\_oriented



단, 이 목록 역시 Capability와 동일한 Vocabulary가 아니다.



이들은:



Business Meaning



을 표현하는 Decision Context Signal이다.



9\. Evidence



Evidence는 Capability가 아니다.



Evidence는 Capability를 직접 생성하지 않는다.



정확한 관계는:



Business Meaning

&#x20;     ↓

Capability

&#x20;     ↓

Evidence

&#x20;     ↓

State



이다.



Evidence는:



해당 Capability를 현재 어느 수준까지 구체적으로 활성화할 수 있는가?



를 판단하는 Gate다.



10\. Evidence의 핵심 원칙

금지

No product data

→ no product capability

허용

product capability exists

→ data is insufficient

→ state = GENERIC



즉:



Evidence 부족은 WHAT을 삭제하지 않는다.



이것이 Phase G의 핵심 헌법 중 하나다.



11\. Capability State



Capability는 다음 상태를 가진다.



ACTIVE

GENERIC

DORMANT

DROP

ACTIVE



충분한 근거와 데이터가 있어 구체적으로 구현 가능.



GENERIC



사업상 의미는 명확하지만 구체적인 데이터가 부족함.



DORMANT



현재는 노출하지 않지만 향후 CMS/데이터 입력을 통해 활성화될 가능성이 있음.



DROP



현재 사이트 범위와 예산에서 제외.



12\. GENERIC의 의미



GENERIC은 실패 상태가 아니다.



예:



product\_discovery

state = GENERIC



는:



"상품 기능이 필요하지 않다"



가 아니다.



정확한 의미:



"상품 탐색은 사업적으로 의미가 있지만 현재 구체적인 상품 데이터가 충분하지 않다."



따라서 미래 CMS를 고려한 구조 보존이 가능하다.



13\. DecisionPlan



DecisionEngine의 공식 출력은 DecisionPlan이다.



개념적으로:



DecisionPlan

├── capabilities

├── businessModels

├── priorities

├── constraints

├── semanticSlots

└── provenance

14\. Business Model Axis



복합 사업을 위해 Capability와 별도로 Business Model을 둔다.



primary

secondary\[]

supporting\[]



예:



primary:

&#x20; purchase



secondary:

&#x20; inquiry



supporting:

&#x20; event



이것은 Capability의 우선순위를 결정하는 데 사용될 수 있지만, 서로 다른 사업 모델을 무조건 DROP시키는 근거가 되어서는 안 된다.



15\. Primary CTA Rule



기존의:



Primary CTA = exactly 1



이라는 강제 규칙은 폐기한다.



대신:



Primary Business Model

\+

Secondary Business Models



구조를 사용한다.



사이트 전체의 CTA는 여러 개일 수 있다.



다만 한 화면/한 문맥에서의 주 행동은 Recipe/Layout 단계에서 결정될 수 있다.



이 차이를 반드시 구분한다.



16\. Semantic Slot



Decision은 Component를 결정하지 않는다.



하지만 Recipe가 안전하게 선택될 수 있도록 semantic requirement를 선언할 수 있다.



예:



product\_discovery



dataMode:

&#x20; generic



collectionRequired:

&#x20; false



itemGeneration:

&#x20; forbidden



이것이 semantic slot requirement다.



17\. Recipe



Recipe는:



DecisionPlan을 실제 UI 구조로 조립하기 위한 HOW 계층



이다.



Recipe는 Component를 선택할 수 있다.



예:



ProductEditorialRecipe



내부에서:



Image

Text

CTA



등을 사용할 수 있다.



하지만 Recipe는 사업의 WHAT을 새로 결정할 수 없다.



18\. Recipe Requirements



모든 Recipe Variant는 자신이 요구하는 데이터 조건을 선언해야 한다.



예:



RecipeVariant

├── requiredCapabilities

├── dataRequirements

├── collectionRequirements

├── itemGenerationPolicy

└── compatibilityConstraints

19\. Recipe Compatibility Contract



Recipe 선택 전 반드시 Compatibility Check를 수행한다.



DecisionPlan

&#x20;     +

RecipeVariant

&#x20;     ↓

CompatibilityChecker

&#x20;     ↓

ACCEPT / REJECT

20\. Compatibility 예시



Decision:



product\_discovery

dataMode = generic

collectionRequired = false

itemGeneration = forbidden



Recipe A:



ProductGrid



requires:

&#x20; collection = true

&#x20; itemGeneration = allowed



결과:



REJECT



Recipe B:



ProductEditorial



requires:

&#x20; collection = false

&#x20; itemGeneration = forbidden



결과:



ACCEPT

21\. 절대 금지되는 Recipe 동작



Recipe가 다음과 같이 행동하면 Architecture Violation이다.



No products found

→ invent product cards



또는:



No testimonials

→ create testimonial section



또는:



No team data

→ generate team members



Recipe는 부족한 데이터를 생성할 권한이 없다.



22\. AI #2



AI #2는:



Expression Layer



이다.



기존 원칙:



AI #2 = expression



을 유지한다.



AI #2는:



문장 작성

카피 표현

정보의 자연어 표현



을 담당할 수 있다.



AI #2는:



새로운 Business Fact 생성

Capability 생성

실제 상품 생성

고객 후기 생성

수치 생성

자격/경력 생성



을 할 수 없다.



23\. Fact Boundary



다음은 사실로 취급된다.



price

address

phone

years

certification

rating

customer count

award

product name

staff name



이런 정보는 provenance 없이 AI가 생성할 수 없다.



24\. Provenance



Fact에는 출처가 있어야 한다.



최소 개념:



user\_asserted

cms

verified

approved

system\_generated



중요한 것은:



user\_asserted ≠ verified



이다.



사용자가 입력했다고 해서 시스템 검증 사실과 동일하게 취급해서는 안 된다.



이 문제는 기존 Red-Team에서도 Fact Validator의 provenance substrate 부족으로 지적되었습니다.



25\. Budget Grammar



Budget은 사업 의미를 파괴해서는 안 된다.



기본 우선순위:



MANDATORY

&#x20;   ↓

CONVERSION\_CRITICAL

&#x20;   ↓

BUSINESS\_CRITICAL

&#x20;   ↓

SUPPORTING

&#x20;   ↓

DECORATIVE



Evidence-backed를 Business-critical보다 위에 두는 방식은 사용하지 않는다.



Evidence의 양이 사업의 중요도를 결정해서는 안 된다.



26\. Mandatory Inflation 방지



모든 Rule 작성자가 자신의 기능을:



MANDATORY



로 지정하는 것을 허용하지 않는다.



따라서 향후 Rule Grammar에는:



priority

conflict

tie-break

mutual exclusion

budget resolution



이 명시적으로 정의되어야 한다.



Rule registration order가 결과를 결정해서는 안 된다.



27\. Determinism



동일한 입력은 동일한 DecisionPlan을 생성해야 한다.



same BusinessBrief

\+

same Context

\+

same Evidence

\+

same Rules

=

same DecisionPlan



Rule 등록 순서에 따라 결과가 달라지면 실패다.



28\. Renderer



Renderer의 역할은 최종적으로 다음 한 줄이다.



ThemeConfig → render



Renderer는:



추측하지 않는다.

inference하지 않는다.

사업 결정을 하지 않는다.

Capability를 생성하지 않는다.

Recipe를 선택하지 않는다.



기존 설계에서도 Renderer는 ThemeConfig만 따라야 하며 판단하지 않아야 한다고 명시되어 있습니다.



29\. ThemeConfig



ThemeConfig는 최종 immutable output이다.



Decision

&#x20;   ↓

Recipe

&#x20;   ↓

Content

&#x20;   ↓

ThemeConfig



ThemeConfig 이후에는 사업 판단이 발생하면 안 된다.



30\. 최종 Pipeline



따라서 AWIE V2 Brain의 공식 Pipeline은 다음으로 동결한다.



USER INPUT

&#x20;   ↓

QUESTION ENGINE

&#x20;   ↓

BUSINESS BRIEF

&#x20;   ↓

SEMANTIC NORMALIZATION

&#x20;   ↓

DECISION CONTEXT

&#x20;   ↓

DECISION ENGINE

&#x20;   ↓

DECISION PLAN

&#x20;   │

&#x20;   ├───────────────┐

&#x20;   ↓               ↓

INDUSTRY          EVIDENCE

KNOWLEDGE            │

&#x20;   │               │

&#x20;   └───────┬───────┘

&#x20;           ↓

&#x20;    RECIPE SELECTION

&#x20;           ↓

&#x20;  COMPATIBILITY CHECK

&#x20;           ↓

&#x20;     RECIPE MERGER

&#x20;           ↓

&#x20;      CONTENT PLAN

&#x20;           ↓

&#x20;         AI #2

&#x20;           ↓

&#x20;     FACT VALIDATOR

&#x20;           ↓

&#x20;      THEME CONFIG

&#x20;           ↓

&#x20;        RENDERER

&#x20;           ↓

&#x20;        WEBSITE

31\. 권한 모델

Layer	권한

Question Engine	Business information 수집

BusinessBrief	Business facts 보존

Normalizer	Semantic context 생성

Industry Registry	Knowledge / Recommendation

Evidence	Activation 조건

DecisionEngine	WHAT 결정

DecisionPlan	결정 + 제약 기록

RecipeSelector	HOW 후보 선택

CompatibilityChecker	계약 위반 차단

RecipeMerger	Recipe 조립

AI #2	표현

Fact Validator	사실 경계 검증

ThemeConfig	최종 결정 저장

Renderer	RENDER ONLY

32\. V2.6 자산과의 매핑



현재 V2.6 자산은 다음과 같이 처리한다.



KEEP

BusinessBrief

MergeEngine

GuidedBuildService

RecipeSelector

RecipeMerger

ThemeConfig

Renderer

Component Registry

AI v2 Coordinator

EXTEND / REDESIGN

AiInformationExtractor

IndustryProfile

BuildPlanner

DecisionContext

ThemeConfig schema

Recipe contracts

Validation

NEW

DecisionEngine

DecisionPlan

Capability Vocabulary

Evidence / Provenance

ContentPlan

Fact Validator

Decision ↔ Recipe Compatibility Contract

RETIRE

MOCK\_INDUSTRY\_PROFILES

MOCK\_RECIPES

V1 autobuild decision logic

V1 menu assumptions

renderer typeToSection business logic

settings.general duplicated AI copy



단, Mock 자산은 실제 Registry/Recipe 검증이 완료되기 전까지 fixture/mock으로 한시 유지할 수 있다. 즉 Phase G에서 즉시 삭제하지 않는다. 이 처분 원칙은 기존 Phase C 매핑과 동일합니다.



33\. Migration Rule



현재 시스템에는 두 경로가 공존한다.



Path A

one-liner

→ autobuild

→ V1 AI

→ direct ThemeConfig



과



Path B

Question Engine

→ BusinessBrief

→ Planner

→ Mock Registry/Recipe



이 두 경로가 동시에 존재하는 것이 현재 가장 큰 구조적 부채 중 하나입니다. 실제 감사에서도 Path A는 Question/Registry/Recipe를 우회하고, Path B는 Mock 데이터에 의존하는 것으로 확인되었습니다.



따라서 최종 AWIE에서는:



Path A

&#x20;  ↓

RETIRE / REWIRE



Path B

&#x20;  ↓

V2 Brain



으로 수렴시킨다.



34\. Implementation Prohibition



이 Architecture Freeze가 승인되기 전에는 다음 작업을 하지 않는다.



❌ Capability Enum 구현

❌ DecisionEngine 구현

❌ Recipe compatibility 구현

❌ Mock 삭제

❌ Renderer 대규모 변경

❌ Autobuild 전환

❌ UI 변경



문서가 먼저다.



35\. Implementation Order



Architecture Freeze 이후 구현 순서는 다음과 같이 한다.



1\. Capability Vocabulary types

2\. Evidence / Provenance contracts

3\. DecisionPlan schema

4\. Decision Rule Grammar

5\. DecisionEngine

6\. Industry Registry real data contract

7\. Recipe requirements contract

8\. CompatibilityChecker

9\. RecipeSelector integration

10\. ContentPlan

11\. Fact Validator

12\. ThemeConfig integration

13\. Renderer integration

14\. Autobuild migration

15\. Mock retirement

16\. End-to-end validation



한 번에 전부 구현하지 않는다.



기존 AWIE의 구현 원칙 역시 한 단계만 구현하고 중단한 뒤 승인받는 방식으로 명시되어 있습니다.



36\. Architecture Freeze Acceptance Criteria



Phase G는 다음 질문에 모두 YES여야 동결 완료로 판정한다.



Vocabulary

Capability가 업종명을 포함하지 않는가?

Capability가 Section 이름으로 오염되지 않았는가?

Capability 수가 불필요하게 폭발하지 않는가?

Decision

DecisionEngine이 WHAT만 결정하는가?

Industry Registry가 Decision을 강제하지 않는가?

Evidence가 Capability 자체를 생성하지 않는가?

Generic

데이터가 없다고 사업 의미가 사라지지 않는가?

GENERIC 상태가 존재하는가?

Generic 상태에서 AI가 사실을 발명할 수 없는가?

Recipe

Recipe가 WHAT을 결정하지 않는가?

Recipe가 요구사항을 선언하는가?

Compatibility Check가 존재하는가?

Decision constraint를 초과하는 Recipe를 기계적으로 거부할 수 있는가?

Composite

Primary/Secondary/Supporting 구조가 있는가?

하나의 CTA 때문에 다른 사업 모델이 무조건 삭제되지 않는가?

Fact

AI #2가 Business Fact를 생성할 수 없는가?

Fact provenance가 존재하는가?

user-asserted와 verified를 구분하는가?

Renderer

Renderer가 판단하지 않는가?

ThemeConfig만으로 렌더링 가능한가?

37\. Final Architecture Declaration



이 문서에서 가장 중요한 문장은 이것입니다.



AWIE는 업종을 선택하는 엔진이 아니다.



그리고:



AWIE는 템플릿을 선택하는 엔진도 아니다.



AWIE는:



사업의 의미

&#x20;   ↓

필요한 기능

&#x20;   ↓

필요한 제약

&#x20;   ↓

구현 가능한 표현



을 결정하는 엔진이다.



따라서:



Industry



는 Knowledge이고,



Capability



는 Meaning이며,



Decision



은 Judgment이고,



Constraint



는 Boundary이며,



Recipe



는 Implementation이고,



ThemeConfig



는 최종 계약이며,



Renderer



는 실행기다.



PHASE G STATUS

🟢 ARCHITECTURE DIRECTION: GREEN

🟢 VOCABULARY: GREEN

🟢 DECISION / RECIPE BOUNDARY: GREEN

🟢 GENERIC / EVIDENCE MODEL: GREEN

🟢 COMPOSITE BUSINESS MODEL: GREEN

🟡 RULE GRAMMAR IMPLEMENTATION: NOT YET IMPLEMENTED

🟡 RECIPE COMPATIBILITY IMPLEMENTATION: NOT YET IMPLEMENTED

🔴 CODE MODIFICATION: NONE

