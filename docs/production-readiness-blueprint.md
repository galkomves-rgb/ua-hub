# UAHUB — керівний документ з доведення платформи до релізу

## Статус документа

- Версія: 1.0
- Дата: 2026-03-24
- Призначення: робочий blueprint для переведення платформи зі стану MVP/Prototype у стан production-ready продукту
- Основа: технічний та продуктовий аудит поточної кодової бази і UX, а також бенчмарк проти `sharvarok.com`

### Тимчасові локальні QA-зміни, які не є частиною production design

Для ручного E2E тестування локально в кодову базу тимчасово додані dev-only елементи:

- локальний `dev-login` без зовнішнього OIDC, який вмикається тільки через env-прапорець;
- мінімальна admin moderation page для ручної перевірки approve/reject flow.

Ці зміни потрібні для прискорення QA, але вони не повинні безконтрольно перейти в production як остаточна модель.

### Release gate перед публічним запуском

- [ ] `DEV_AUTH_ENABLED` вимкнений у всіх non-local середовищах
- [ ] локальний dev-login або видалений, або ізольований так, щоб не був доступний з production-конфігурації
- [ ] мінімальна сторінка `/admin/moderation` або замінена повним admin/backoffice, або свідомо залишена як частина підтримуваного admin tooling
- [ ] усі production secrets винесені в кероване сховище секретів, а не в локальні `.env`

---

## 1. Мета документа

Цей документ задає:

- що саме потрібно вважати релізною готовністю;
- які проблеми блокують запуск зараз;
- які системи мають бути побудовані до launch;
- у якій послідовності виконувати роботи;
- за якими критеріями приймати рішення про перехід між фазами.

Це **не просто опис проблем**. Це керівний документ для:

- продакт-менеджменту;
- технічного планування;
- постановки backlog;
- контролю готовності до релізу.

---

## 2. Поточна реальність платформи

### 2.1 Фактичний стан

Поточний продукт є **MVP з частково реалізованими ядровими сценаріями**, але не є релізно готовою платформою.

Поточна реалізація містить:

- фронтенд на `Vite + React + React Router`;
- бекенд на `FastAPI + SQLAlchemy`;
- auth, listings, profiles, messaging у базовому вигляді;
- значну частину продуктових даних та логіки у frontend static/mock шарі;
- паралельні UX-парадигми в одному продукті.

### 2.2 Важлива управлінська примітка

Опис `Next.js + Supabase` **не відповідає поточній кодовій базі**.

Це означає, що:

- архітектурні рішення не можна планувати на основі припущення про SSR/ISR від Next.js;
- SEO-ready launch зараз неможливо оцінювати як для Next-платформи;
- data/security/scaling план треба будувати від реального стеку, а не від очікуваного.

**Рішення:** до завершення фази фундаменту команда планує продукт, інфру і launch тільки від фактичного стеку.

---

## 3. Цільовий стан продукту

Платформа має вийти в стан:

- **production-ready** — стабільна, захищена, керована через admin/backoffice;
- **monetizable** — платежі та entitlement-механіки реально впливають на доступ, видимість і статуси;
- **scalable** — додавання нових модулів, категорій, тарифів і міст не ламає архітектуру;
- **trust-ready** — є верифікація, модерація, ownership, anti-spam і базові safety-процеси;
- **operationally manageable** — команда може адмініструвати listings, payments, users, reports, verification без ручного хаосу.

---

## 4. Продуктові принципи

Усі подальші рішення по продукту й технічній архітектурі мають проходити через ці принципи.

### 4.1 Один продукт — одна UX-система

Не допускається існування двох паралельних layout/navigation систем для одного й того самого сценарію.

### 4.2 Backend є джерелом правди

Frontend не визначає:

- featured;
- promoted;
- verified;
- pricing eligibility;
- ownership;
- subscription access.

### 4.3 Соціальні сценарії — дешеві або безкоштовні

Безкоштовними або майже безкоштовними лишаються сценарії, що збільшують ліквідність і довіру:

- looking for job;
- looking for housing;
- community/help;
- nonprofit/resource sections.

### 4.4 Комерційний намір — монетизується

Платити мають ті сценарії, де є:

- прямий продаж;
- вакансія від бізнесу;
- комерційна оренда / нерухомість;
- бізнес-послуги;
- підвищена видимість;
- premium business presence.

### 4.5 Trust важливіший за швидкість контентного росту

Краще менше, але контрольованого контенту, ніж багато спаму й низької довіри.

---

## 5. Ключові блокери релізу

Нижче — тільки ті проблеми, які реально блокують реліз.

### 5.1 Архітектурний split між старим і новим фронтендом

У продукті присутні паралельні layout/page-парадигми, що веде до:

- дублювання логіки;
- різних UX-патернів для схожих сценаріїв;
- високої ціни підтримки кожної фічі;
- розриву між старим і новим routing/data flow.

**Рішення:** обрати один canonical frontend shell і вивести другий з продукту.

### 5.2 Немає єдиного source of truth по listings/categories/business data

Ключові продукті сутності частково живуть:

- у backend-моделях;
- у frontend static datasets;
- у mock-like helpers;
- у локальній логіці фільтрів.

Наслідки:

- роз’їзд між API і UI;
- фейкові або неповні дані в релізі;
- неможливість нормально рахувати monetization/performance;
- низька достовірність пошуку та фільтрів.

**Рішення:** усі listings/businesses/profiles/search states мають працювати від backend/API як від джерела правди.

### 5.3 Trust-статуси та monetization flags не захищені сервером

Поля на кшталт:

- `is_featured`
- `is_promoted`
- `is_verified`

не можуть контролюватися з клієнта.

Наслідки:

- підміна комерційних статусів;
- руйнування довіри;
- неможливість чесного платного просування.

**Рішення:** ці прапори переводяться в server-managed entitlements/admin-only transitions.

### 5.4 Відсутній повний listing lifecycle

Потрібні стани та переходи:

- draft
- moderation_pending
- approved/published
- rejected
- expired
- archived
- renewed

Зараз lifecycle надто спрощений.

Наслідки:

- немає якісної модерації;
- немає керування строком життя оголошення;
- немає коректної логіки повторної публікації;
- не можна нормально продавати boosts/subscriptions.

### 5.5 Відсутня trust & safety система

Немає повноцінних систем:

- report listing / report user;
- moderation queue;
- anti-spam/rate limiting;
- duplicate listing detection;
- verification workflow;
- prohibited content enforcement.

Для classifieds/community продукту це launch blocker.

### 5.6 Неповний user system

Є базова auth/profile рамка, але немає цілісної системи:

- saved listings/businesses;
- recently viewed;
- complete account center;
- listing ownership dashboard;
- search alerts;
- бізнес-кабінету з квотами і billing state.

### 5.7 SEO-модель слабша за benchmark

Sharvarok краще працює як indexable marketplace завдяки:

- crawlable category pages;
- контентним landing pages;
- явним pricing/trust pages;
- видимому verified business directory.

Поточний SPA-підхід не дає аналогічної SEO-сили без окремої стратегії.

### 5.8 Admin/backoffice практично відсутній як launch-instrument

Без операційної панелі команда не зможе масштабувати:

- модерацію;
- верифікацію;
- платежі;
- entitlement disputes;
- видимість проблемних listings/users.

---

## 6. Що обов’язково має бути побудовано до релізу

### 6.1 Canonical domain model

Необхідно зафіксувати єдину продуктову модель для:

- modules;
- categories;
- subcategories;
- listing types;
- owner types;
- listing statuses;
- monetization types;
- verification states.

#### Мінімальний перелік сутностей

- User
- UserProfile
- BusinessProfile
- Listing
- ListingMedia
- ListingEntitlement
- Subscription
- Purchase
- Message
- SavedListing
- SavedBusiness
- SearchAlert
- SearchHistory
- Report
- VerificationRequest
- ModerationDecision
- CategoryTaxonomy

### 6.2 Listing entitlement system

Потрібна окрема серверна логіка для:

- featured placement;
- urgent badge;
- promoted visibility;
- subscription-based quota;
- verification-linked trust status.

**Правило:** оплата не міняє статус напряму; статус змінює лише entitlement engine після серверної перевірки.

### 6.3 Moderation system

Потрібно реалізувати:

- ручну або rules-based premoderation для окремих категорій;
- report flow;
- admin review queue;
- decision log;
- reason codes: spam, duplicate, fraud, prohibited, low quality.

### 6.4 Verification system

Потрібна окрема бізнес-процедура для бізнесів:

- подача на верифікацію;
- review статус;
- ручна перевірка;
- підтверджувальні дані;
- verified badge як server-side state.

### 6.5 Full account center

Потрібні розділи:

- profile;
- my listings;
- saved;
- messages;
- billing;
- business profiles;
- verification status;
- alerts;
- settings.

### 6.6 Notification system

Мінімальний комплект:

- new message;
- listing approved / rejected;
- listing expiring soon;
- payment success / failure;
- verification status changed;
- saved search match.

### 6.7 Admin / backoffice

Мінімум для launch:

- listings moderation;
- reports queue;
- business verification queue;
- manual feature/promote controls;
- pricing and category config;
- refund/dispute visibility;
- user suspensions.

---

## 7. Цільова продуктова структура

### 7.1 Модулі

Рекомендується залишити таку верхньорівневу модульну структуру:

- Робота
- Житло
- Послуги
- Маркетплейс
- Події
- Спільнота
- Організації та ресурси
- Бізнес-каталог
- Допомога новоприбулим

### 7.2 Роль модулів

#### Робота

Ціль: вакансії, пошук роботи, працевлаштування.

#### Житло

Ціль: пошук оренди, кімнат, запити на житло, комерційна нерухомість.

#### Послуги

Ціль: приватні послуги, професійні послуги, бізнес-послуги.

#### Маркетплейс

Ціль: товари, перепродаж, локальні угоди.

#### Події

Ціль: community events + paid/commercial events.

#### Спільнота

Ціль: неліквідні, але high-retention соціальні сценарії.

#### Організації та ресурси

Ціль: trust layer для нових користувачів і соціального капіталу платформи.

#### Бізнес-каталог

Ціль: monetizable B2B/B2C discovery layer.

#### Допомога новоприбулим

Ціль: retention/brand/trust growth. Не як класичний classified модуль, а як guided onboarding section.

---

## 8. Цільовий UX-каркас

### 8.1 Головна сторінка

Головна не повинна бути просто showcase списків.

Вона має відповідати на 5 питань:

- де знайти роботу;
- де знайти житло;
- як швидко опублікувати оголошення;
- як знайти перевірений бізнес;
- де знайти допомогу / community.

#### Рекомендований порядок блоків

1. Hero + primary CTA
2. Quick module entry grid
3. Search + city context
4. Featured listings
5. Verified businesses
6. Newcomer/help block
7. Community & events
8. Monetization CTA for business users

### 8.2 Навігація

Navigation має бути однозначною:

- глобальний пошук — один патерн;
- глобальний city selector — один патерн;
- module navigation — одна система;
- account entry — одна точка;
- post listing CTA — завжди видимий.

### 8.3 Search

Пошук має бути розділений на:

- global discovery search;
- local/module scoped filtering.

#### Правило

- глобальний пошук шукає по всій платформі;
- фільтри модуля працюють тільки в межах модуля;
- місто — або глобальний контекст, або локальний фільтр, але це має бути прозоро для користувача.

### 8.4 Sharvarok benchmark implication

У Sharvarok сильні:

- ясні category pages;
- пряма CTA логіка `login → post listing`;
- окремий verified businesses section;
- публічний pricing.

Що треба взяти:

- простий public flow;
- окрему trust-visible business section;
- явний pricing page;
- SEO-friendly category and intent pages.

---

## 9. Дані та taxonomy: як має бути

### 9.1 Listings

У кожного listing мають бути:

- canonical ID;
- owner type;
- owner identity;
- module/category/subcategory;
- structured attributes;
- publication state;
- monetization state;
- moderation state;
- timestamps;
- visibility state.

### 9.2 Structured attributes by module

Потрібно піти від підходу “все в `meta_json` string”.

#### Jobs

- employment type
- salary range
- schedule
- remote/hybrid/on-site
- required language
- contract type

#### Housing

- property type
- rent/sale
- rooms
- deposit
- utilities included
- pets allowed
- furnished

#### Services

- service area
- delivery mode
- response time
- pricing model
- language support

#### Events

- date/time
- venue/online
- organizer type
- paid/free
- registration link

#### Marketplace

- condition
- brand
- pickup/shipping
- price negotiable

### 9.3 Business vs private separation

Це має бути не просто label, а системна різниця:

- інші pricing rules;
- інші moderation thresholds;
- інші profile requirements;
- інші ranking rules;
- інші trust expectations.

---

## 10. Цільова user system архітектура

### 10.1 Authentication

Має лишитися як server-backed auth flow, але потребує:

- чіткої токен-стратегії;
- єдиного frontend auth layer;
- контрольованої logout/invalidation логіки;
- route protection;
- admin role policy.

### 10.1.1 User Registration & Onboarding

#### Current state (as-is)

- auth побудований на backend OIDC flow;
- user створюється автоматично після першого успішного login;
- окремого sign-up UI немає;
- окремого email verification flow немає;
- captcha / anti-bot layer у user onboarding відсутній.

#### Target state (to-be)

- primary onboarding model: social login через Google / Apple;
- optional future extension: email magic link або email/password;
- продукт не має вводити дубльовані auth системи або паралельні user stores;
- login і registration мають лишатися частиною одного canonical auth flow.

#### UX flow

- entry points у продукті мають бути сформульовані як `Login / Register`;
- flow має бути unified: якщо user новий, перший login одночасно означає registration;
- після першого входу запускається короткий onboarding;
- onboarding має створити базовий user profile;
- user обирає роль: private user або business;
- на першому кроці збираються базові profile fields, достатні для подальшого account/use-case routing.

#### Security & validation

- базова верифікація identity делегується зовнішньому identity provider через OIDC / Google;
- окремий app-level email verification не є обов’язковим, доки email auth не вводиться як окремий сценарій;
- як future hardening layer плануються captcha механіки рівня Cloudflare Turnstile або hCaptcha;
- для auth/onboarding endpoints має бути передбачений rate limiting.

#### Technical integration

- backend лишається source of truth для auth;
- frontend працює через єдиний auth layer без окремої registration архітектури;
- social/email/optional phone methods мають відкриватися через єдиний hosted OIDC entry flow;
- email confirmation, provider verification і credential recovery лишаються в зоні відповідальності identity provider;
- profile creation/onboarding flow має інтегруватися в існуючий account center, а не обходити його.

#### Future extensions

- email verification, якщо буде додано email auth;
- account recovery flows;
- multi-role accounts, де user може мати private і business контекст без дублювання identity.

### 10.2 User profile

Має містити:

- базову ідентичність;
- місто;
- preferred language;
- avatar;
- bio;
- activity summary;
- listing ownership summary.

### 10.3 Business profile

Має бути monetization-ready entity:

- slug;
- бізнес-назва;
- категорія;
- локація;
- contacts;
- website/social;
- verification status;
- subscription plan;
- active quota;
- analytics summary.

### 10.4 Saved / alerts / history

До релізу необхідно мати:

- saved listings;
- saved businesses;
- saved searches;
- recent searches;
- optionally recently viewed.

### 10.5 New account cabinet spec

Окремий цільовий spec нового кабінету зафіксований у [docs/account-cabinet-spec.md](docs/account-cabinet-spec.md).

Цей spec є обов’язковим орієнтиром для:

- account information architecture;
- UX shell кабінету;
- dashboard counters;
- my listings management center;
- business profile center;
- saved entities;
- billing and messaging integration.

---

## 11. Messaging system: релізний мінімум

Поточний messaging — це базова технічна реалізація, але не повна продуктова система.

### До релізу обов’язково

- conversation context by listing;
- unread state;
- participant metadata;
- block/report user;
- anti-spam throttling;
- moderation visibility;
- message initiation from listing/business page;
- notification on new message.

### Після релізу

- attachments;
- canned replies for businesses;
- lead status;
- CRM-lite for business inbox.

---

## 12. Monetization модель (рекомендована)

### 12.1 Принципи

- community/help сценарії залишаються безкоштовними;
- monetization базується на комерційному намірі і додатковій видимості;
- pricing має бути демократичним і зрозумілим;
- кількість plan-ів має бути обмеженою.

### 12.2 Рекомендована модель

#### Безкоштовно

- community clubs;
- volunteering/help;
- nonprofit resources;
- looking for job;
- looking for housing;
- деякі newcomer-oriented sections.

#### Разові listing payments

- basic paid listing;
- featured add-on;
- urgent add-on;
- homepage/category boost add-on.

#### Business subscriptions

- Starter
- Pro
- Growth

#### Verification fee

- окремий one-time verification review fee.

### 12.3 Що не робити на старті

Не копіювати надто деталізовану і складну сітку цін Sharvarok.

Причина:

- складно підтримувати;
- важко пояснювати користувачу;
- важко керувати в admin;
- складно тестувати unit economics на MVP-stage.

---

## 13. Технічна цільова архітектура

### 13.1 Backend

Потрібно перейти до моделі, де FastAPI є керованим application backend із чіткими bounded contexts:

- auth
- users/profiles
- listings
- taxonomy
- messaging
- moderation
- billing
- analytics
- search

### 13.2 Database

Потрібні:

- нормалізація ключових сутностей;
- відмова від stringified JSON там, де потрібні query/filter/reporting use cases;
- індекси на listings search/filter полях;
- окремі entitlement/payment/subscription таблиці;
- audit trail для moderation/payment state changes.

### 13.3 Search

Потрібно запланувати:

- full-text search strategy;
- ranking by recency + paid visibility + trust;
- fast category/city filtering;
- separate search logging for analytics.

### 13.4 Security

До launch потрібно:

- прибрати open wildcard CORS для production;
- ввести rate limits;
- захистити admin routes;
- захистити payment webhooks;
- обмежити клієнтське керування trust/commercial flags;
- ввести базові anti-abuse controls.

---

## 14. Кодова база: правила очищення перед релізом

### 14.1 Що треба прибрати

- дубльовані layouts;
- дубльовані пошукові патерни;
- mixed data sources;
- hardcoded labels у компонентах;
- product logic у frontend static layer;
- temporary/scaffold-like entity endpoints як public product API.

### 14.2 Що треба централізувати

- i18n;
- taxonomy;
- auth token handling;
- cards/labels/badges rendering;
- listing/business DTOs;
- pricing rules;
- entitlement logic.

---

## 15. Фази виконання

## Phase 1 — Fix foundation

### Phase 1 — Ціль

Прибрати архітектурну нестабільність і зафіксувати єдину продуктову основу.

### Phase 1 — Завдання

- обрати один canonical frontend shell;
- видалити/заморозити дубльований UI flow;
- перейти на API-backed listings/business data;
- зафіксувати taxonomy;
- забрати trust/commercial flags з клієнтського контролю;
- уніфікувати account/auth/search patterns;
- підготувати production-safe security baseline.

### Phase 1 — Пріоритети

- P0: single source of truth;
- P0: unified UI architecture;
- P0: secure monetization/trust state ownership;
- P1: cleanup and normalization.

### Phase 1 — Залежності

- без завершення цієї фази не починати повноцінну monetization rollout.

### Phase 1 — Критерій завершення

- у продукті один layout system;
- listings/businesses рендеряться з backend;
- frontend не керує `verified/featured/promoted`;
- taxonomy centralized;
- auth/search/account flows узгоджені.

---

## Phase 2 — Core systems

### Phase 2 — Ціль

Добудувати ядро маркетплейса і social trust layer.

### Phase 2 — Завдання

- реалізувати listing lifecycle;
- moderation queue;
- report flows;
- complete favorites/saved/alerts/history;
- business account center;
- notifications;
- messaging hardening;
- admin/backoffice v1.

#### Phase 2 — Cabinet workstream

- імплементувати новий shell кабінету згідно [docs/account-cabinet-spec.md](docs/account-cabinet-spec.md);
- замінити поточний tab-based `AccountPage` на account center architecture з sidebar;
- винести розділи `Dashboard`, `Мій профіль`, `Бізнес-профіль`, `Мої оголошення`, `Збережене`, `Повідомлення`, `Billing`, `Налаштування` у окремі screen containers;
- додати dashboard aggregate endpoint для counters і alerts;
- реалізувати реальні saved listings / saved businesses / saved searches;
- додати canonical listing status filters в `Мої оголошення`;
- додати meaningful empty state для `Бізнес-профілю` та activation path;
- перевести account navigation у URL-driven state;
- локалізувати всі тексти кабінету через i18n layer;
- адаптувати кабінет під mobile/tablet через responsive sidebar behavior.

### Phase 2 — Пріоритети

- P0: moderation and trust;
- P0: complete ownership/account flows;
- P1: notifications and analytics baseline.

### Phase 2 — Залежності

- вимагає завершення нормалізації даних і UI consolidation з Phase 1.

### Phase 2 — Критерій завершення

- кожне listing має життєвий цикл;
- є moderation/report/verification workflows;
- account center повністю робочий;
- saved/favorites/search alerts працюють стабільно;
- admin може управляти контентом і trust state.

#### Phase 2 — Cabinet Definition of Done

- новий кабінет відповідає [docs/account-cabinet-spec.md](docs/account-cabinet-spec.md);
- sidebar shell працює як canonical account navigation;
- dashboard показує реальні counters, а не placeholder values;
- `Мої оголошення` працює як management center, а не як пустий список;
- `Збережене` працює для listings і businesses;
- `Бізнес-профіль` підтримує empty / create / active states;
- `Повідомлення` інтегровані в shell кабінету;
- `Billing` має хоча б overview + history state;
- account center придатний до щоденного використання на desktop і mobile.

---

## Phase 3 — Monetization

### Phase 3 — Ціль

Запустити безпечну, прозору і контрольовану модель доходу.

### Phase 3 — Завдання

- payment catalog;
- purchases/subscriptions/entitlements;
- Stripe webhook reconciliation;
- paid boosts;
- business subscriptions;
- verification fee;
- billing UI + admin pricing controls.

### Phase 3 — Пріоритети

- P0: server-side entitlements;
- P0: webhook reliability;
- P0: admin override and auditability;
- P1: pricing experiments.

### Phase 3 — Залежності

- вимагає completed listing lifecycle, business profiles, admin workflows.

### Phase 3 — Критерій завершення

- paid features не можуть бути підроблені клієнтом;
- subscription state впливає на квоти та видимість;
- всі платежі traceable;
- business plans реально керують доступом.

---

## Phase 4 — Scaling

### Phase 4 — Ціль

Підготувати платформу до стабільного органічного росту й операційного масштабу.

### Phase 4 — Завдання

- SEO category/city/intent pages;
- analytics dashboards;
- async jobs;
- ranking improvements;
- reputation system;
- anti-fraud signals;
- performance optimization.

### Phase 4 — Пріоритети

- P0: SEO and observability;
- P1: advanced ranking and reputation;
- P1: automated moderation support.

### Phase 4 — Залежності

- стабільна core product model і working monetization layer.

### Phase 4 — Критерій завершення

- видно funnel metrics;
- категорії отримують SEO traffic;
- admin operations не залежать від ручного firefighting;
- product scale не руйнує performance.

---

## 16. Definition of Ready для релізу

Продукт не вважається готовим до launch, поки всі пункти нижче не виконані.

### Product

- одна узгоджена UX-система;
- зрозумілий homepage intent model;
- всі core user flows закінчені end-to-end.

### Data

- backend є джерелом правди;
- taxonomy централізована;
- listings/business profiles структуровані.

### Release trust

- verification workflow працює;
- report/moderation працює;
- anti-spam baseline працює.

### User

- auth/account/profile/business flows робочі;
- saved/search history/alerts доступні;
- ownership і permissions коректні.
- account center відповідає [docs/account-cabinet-spec.md](docs/account-cabinet-spec.md).

### Release monetization

- платежі не ламають state;
- entitlement engine працює;
- pricing page відповідає фактичній логіці.

### Ops

- admin/backoffice є;
- support/moderation процес є;
- є логування, monitoring, release rollback plan.

---

## 17. Definition of Done по ключових системах

### Listing system Done, коли

- creation, edit, moderation, publish, expire, renew працюють;
- ownership перевіряється сервером;
- ranking не залежить від клієнта;
- category validation module-aware.

### Business system Done, коли

- бізнес-профіль можна створити, редагувати, верифікувати;
- subscription впливає на можливості;
- directory показує verified/business states коректно.

### Messaging Done, коли

- можна безпечно комунікувати по listing/business context;
- unread/report/block працюють;
- spam не ламає систему.

### Billing Done, коли

- entitlement state серверний;
- webhook confirmed state only;
- refunds/cancellations/admin override видимі в admin.

---

## 18. KPI та сигнали готовності

Перед релізом треба мати мінімальний набір метрик:

### Liquidity

- listings per module;
- active listings by city;
- message starts per 100 listings.

### Trust

- report rate;
- moderation rejection rate;
- verified business conversion.

### Monetization

- paid listing conversion;
- business subscription conversion;
- ARPPU;
- boost attach rate.

### Product health

- search-to-click rate;
- detail-to-message rate;
- save rate;
- account completion rate.

---

## 19. Управлінські рішення, які треба прийняти негайно

### Decision 1

Підтвердити canonical stack і не планувати launch як `Next.js product`, доки код реально не мігрує.

### Decision 2

Обрати один frontend direction і завершити split architecture.

### Decision 3

Затвердити monetization philosophy:

- free social/help layers;
- paid commercial intent;
- paid visibility;
- business subscriptions.

### Decision 4

Затвердити trust-first launch:

- verification;
- moderation;
- anti-spam;
- report flows — до monetization scaling.

---

## 20. Фінальний висновок

Платформа має потенціал стати сильним нішевим classifieds/community продуктом для українців в Іспанії, але в поточному стані вона є **архітектурно та операційно незавершеним MVP**.

Щоб довести її до релізного рівня, команда має рухатися не через косметичні покращення, а через:

- консолідацію архітектури;
- централізацію даних і правил;
- побудову trust/safety/operations шару;
- серверно-контрольовану monetization модель;
- узгоджену продуктову UX-систему.

**Головна директива:**
спочатку — фундамент і довіра,
потім — core systems,
потім — монетизація,
потім — масштабування.

Без цього реліз можливий тільки як демонстрація, але не як надійний продукт.
