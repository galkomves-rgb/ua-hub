# UAHUB — Spec нового особистого кабінету

## 1. Призначення

Цей документ описує точну специфікацію нового кабінету користувача для UAHUB.

Мета:

- замінити поточний спрощений `AccountPage` на повноцінний account center;
- взяти за основу зрозумілий shell-патерн Sharvarok;
- адаптувати його під UAHUB як classifieds + community + business platform;
- зробити кабінет сумісним з майбутніми monetization, verification, moderation та business flows.

Документ є product + UX + implementation spec.

---

## 2. Що беремо з Sharvarok

Із наданих екранів видно сильний базовий патерн:

- стабільне ліве меню кабінету;
- окремі розділи `Мій профіль`, `Бізнес-профіль`, `Мої оголошення`, `Збережене`, `Вийти`;
- праворуч — контент активного розділу;
- на сторінці профілю є блок швидкої активності;
- на сторінці бізнес-профілю є empty state з чіткою дією;
- на сторінці оголошень є статусний фільтр.

Це правильний skeleton, але для UAHUB його треба розширити під:

- messaging;
- saved searches;
- billing;
- verification;
- moderation-visible states;
- business subscription logic.

---

## 3. Цільова інформаційна архітектура кабінету

### 3.1 Глобальний shell

Кабінет складається з 2 зон:

#### 3.1.1 Ліва колонка

Постійна sidebar-навігація.

#### 3.1.2 Права колонка

Контент активного розділу.

### 3.2 Обов’язкові розділи меню

Порядок меню:

1. Dashboard
2. Мій профіль
3. Бізнес-профіль
4. Мої оголошення
5. Збережене
6. Повідомлення
7. Billing
8. Налаштування
9. Вийти

### 3.3 Що додаємо поверх Sharvarok

Обов’язково додаємо:

- `Dashboard` як окремий перший розділ;
- `Повідомлення` як окремий розділ кабінету;
- `Billing`;
- `Verification status` у профіль/бізнес-профіль;
- `saved searches / alerts` у збереженому;
- статуси модерації для оголошень.

---

## 4. Детальна структура сторінок кабінету

### 4.1 Dashboard

#### 4.1.1 Призначення

Показати користувачу стан його активності за 5 секунд.

#### 4.1.2 Header summary

- avatar
- public name
- email
- city
- profile completion

#### 4.1.3 Activity cards

- мої активні оголошення
- чернетки
- збережені оголошення
- непрочитані повідомлення
- активні бізнес-профілі

#### 4.1.4 Alerts block

- оголошення, що скоро завершуються
- listings rejected / need fixes
- verification pending
- payment issue / subscription expiring

#### 4.1.5 Quick actions

- створити оголошення
- відкрити мої оголошення
- відкрити бізнес-профіль
- відкрити збережене

#### 4.1.6 Empty state

- короткий welcome;
- CTA `Створити перше оголошення`;
- CTA `Заповнити профіль`.

### 4.2 Мій профіль

#### 4.2.1 Призначення

Редагування персонального account profile.

#### 4.2.2 Поля профілю

- публічне ім’я
- email (read-only)
- телефон (optional, якщо буде в моделі)
- місто
- короткий bio
- avatar
- preferred language

#### 4.2.3 Privacy / visibility

- зробити мій профіль публічним
- дозволити показувати мене як автора публічно
- маркетингові листи

#### 4.2.4 Security block

- змінити пароль / security action
- active sessions (пізніше)
- logout from all devices (пізніше)

#### 4.2.5 Trust block

- статус акаунта
- дата реєстрації
- верифікований / не верифікований

#### 4.2.6 CTA

- зберегти зміни
- скасувати

### 4.3 Бізнес-профіль

#### 4.3.1 Призначення

Керування бізнес-присутністю користувача на платформі.

#### 4.3.2 State A — Немає бізнес-профілю

- пояснення, навіщо потрібен бізнес-профіль;
- якщо потрібні активні оголошення як prerequisite — чітко це написати;
- CTA `Створити бізнес-профіль` або `Створити перше оголошення` залежно від бізнес-логіки.

#### 4.3.3 State B — Профіль створюється

- business name
- slug
- category
- city
- logo
- cover
- description
- contacts
- website
- social links
- service areas / tags

#### 4.3.4 State C — Профіль активний

- статус профілю
- verification status
- subscription plan
- active listings count
- profile completeness
- public preview link

#### 4.3.5 Business controls

- редагувати профіль
- подати на верифікацію
- оновити subscription
- переглянути analytics

#### 4.3.6 Trust indicators

- verified pending / verified / rejected
- premium / plan status
- completeness score

### 4.4 Мої оголошення

#### 4.4.1 Призначення

Єдиний центр керування всіма listings користувача.

#### 4.4.2 Верхня панель

- CTA `Створити оголошення`
- filter by status
- filter by module
- sort
- search within my listings

#### 4.4.3 Статуси фільтра

Мають бути canonical:

- всі
- чернетки
- на модерації
- активні
- відхилені
- термін дії минув
- архів

#### 4.4.4 Listing row data

- title
- module
- category
- статус
- created at
- expires at
- views
- messages count
- saved count (optional)
- monetization badges: featured / promoted / urgent

#### 4.4.5 Row actions

- переглянути
- редагувати
- продублювати
- продовжити / renew
- підняти / boost
- архівувати
- видалити

#### 4.4.6 Empty states

- немає жодного оголошення
- немає активних
- немає чернеток
- немає expired

#### 4.4.7 Rejected listing state

- reason code
- comment moderation
- CTA `Виправити і відправити знову`

### 4.5 Збережене

#### 4.5.1 Призначення

Дати користувачу реальний persistence-layer для інтересів.

#### 4.5.2 Підрозділи

- збережені оголошення
- збережені бізнеси
- saved searches / alerts

#### 4.5.3 Saved listings card

- title
- city
- price
- module
- saved at
- CTA `Переглянути`
- CTA `Прибрати`

#### 4.5.4 Saved businesses card

- business name
- category
- city
- verified state
- CTA `Переглянути`
- CTA `Прибрати`

#### 4.5.5 Saved searches

- query
- module / city context
- email alerts on/off
- delete

### 4.6 Повідомлення

#### 4.6.1 Призначення

Вбудований communication center кабінету.

#### 4.6.2 Макет

- ліва колонка: список розмов
- права колонка: thread

#### 4.6.3 Conversation summary

- avatar / title
- business or user name
- listing context
- last message preview
- unread badge
- timestamp

#### 4.6.4 Thread actions

- reply
- block user
- report user
- open linked listing

#### 4.6.5 Empty states

- немає повідомлень
- оберіть розмову

### 4.7 Billing

#### 4.7.1 Призначення

Показати весь monetization state користувача.

#### 4.7.2 Блоки

- current plan
- active boosts
- payment history
- invoices / receipts
- subscription renewal date
- usage / quota

#### 4.7.3 Для приватного користувача

- покупки featured/promoted listings
- історія платежів

#### 4.7.4 Для бізнесу

- subscription plan
- active quota
- payment status
- upgrade / downgrade CTA

### 4.8 Налаштування

#### 4.8.1 Призначення

System settings page, а не дубль профілю.

#### 4.8.2 Блоки

- interface language
- email preferences
- push/in-app preferences (пізніше)
- privacy defaults for new listings
- default city/module behavior

---

## 5. Sidebar spec

### 5.1 Структура

Sidebar повинна містити:

- avatar
- greeting / user name
- role badge if needed
- nav items
- logout action внизу

### 5.2 Візуальна поведінка

- active item clearly highlighted
- hover state visible
- desktop sticky
- mobile transformed into drawer / top switcher

### 5.3 Responsive behavior

#### 5.3.1 Desktop

Фіксована ліва колонка.

#### 5.3.2 Tablet / mobile

- drawer або collapsible menu
- активний пункт видно зверху
- контент іде нижче

---

## 6. Exact data requirements

### 6.1 User dashboard DTO

Потрібен агрегований endpoint або query layer, що повертає:

- active_listings_count
- draft_listings_count
- saved_listings_count
- unread_messages_count
- business_profiles_count
- expiring_soon_count
- moderation_issues_count

### 6.2 Profile DTO

- name
- email
- avatar_url
- city
- bio
- preferred_language
- is_public_profile
- allow_marketing_emails
- is_verified

### 6.3 Business profile DTO

- slug
- business_name
- category
- city
- description
- contacts
- website
- social_links
- logo
- cover
- is_verified
- verification_status
- is_premium
- subscription_plan
- listing_quota
- active_listings_count

### 6.4 Listings management DTO

Кожен item у `my listings` має включати:

- id
- title
- module
- category
- status
- created_at
- expires_at
- views_count
- unread_messages_count
- is_featured
- is_promoted
- moderation_reason

### 6.5 Saved entities DTO

- saved listings
- saved businesses
- saved searches

---

## 7. Backend requirements

### 7.1 Existing backend gaps to close

Потрібно добудувати:

- saved listings table + endpoints
- saved businesses table + endpoints
- dashboard aggregate endpoint
- canonical listing statuses
- moderation reason model
- billing history endpoints
- business verification status endpoints
- search alerts endpoints

### 7.2 Required endpoints

#### Account dashboard

- `GET /api/v1/account/dashboard`

#### User profile

- `GET /api/v1/profiles/user`
- `PUT /api/v1/profiles/user`

#### Business profile

- `GET /api/v1/profiles/business/user/my`
- `POST /api/v1/profiles/business`
- `PUT /api/v1/profiles/business/{slug}`
- `POST /api/v1/profiles/business/{slug}/verify-request`

#### My listings

- `GET /api/v1/listings/search/my`
- `GET /api/v1/listings/{id}`
- `PUT /api/v1/listings/{id}`
- `POST /api/v1/listings/{id}/renew`
- `POST /api/v1/listings/{id}/boost`
- `DELETE /api/v1/listings/{id}`

#### Saved

- `GET /api/v1/saved/listings`
- `POST /api/v1/saved/listings/{listing_id}`
- `DELETE /api/v1/saved/listings/{listing_id}`
- `GET /api/v1/saved/businesses`
- `POST /api/v1/saved/businesses/{business_id}`
- `DELETE /api/v1/saved/businesses/{business_id}`

#### Messaging

- existing inbox/conversation endpoints can be reused after enrichment

#### Billing

- `GET /api/v1/billing/overview`
- `GET /api/v1/billing/history`

---

## 8. Frontend implementation spec

### 8.1 New top-level structure

Поточний `AccountPage` має бути замінений на account shell architecture:

- `AccountPage` як route wrapper
- `AccountSidebar`
- `AccountDashboardTab`
- `AccountProfileTab`
- `AccountBusinessTab`
- `AccountListingsTab`
- `AccountSavedTab`
- `AccountMessagesTab`
- `AccountBillingTab`
- `AccountSettingsTab`

### 8.2 State model

Активний розділ має зберігатися:

- через query param або nested route;
- не через локальний tab-масив без URL-state.

Рекомендовано:

- `/account?tab=dashboard`
- `/account?tab=profile`
- `/account?tab=business`
- `/account?tab=listings`
- `/account?tab=saved`
- `/account?tab=messages`
- `/account?tab=billing`
- `/account?tab=settings`

### 8.3 Component rules

- sidebar — dumb navigation component;
- each tab — isolated container;
- API calls — centralized via `api/` layer;
- labels — тільки через i18n;
- empty states — окремі reusable компоненти.

---

## 9. UX rules

### 9.1 Cabinet UX principles

- user always understands where they are;
- each section has one main action;
- empty states teach what to do next;
- important status is visible without scrolling;
- destructive actions require confirmation.

### 9.2 Priority of attention

Порядок важливості в кабінеті:

1. unresolved issues
2. active content
3. monetization opportunities
4. settings

### 9.3 What not to copy blindly from Sharvarok

Не копіювати 1-в-1, якщо:

- section is too passive;
- dashboard has too little operational context;
- business profile depends on unclear hidden prerequisites.

У UAHUB логіка має бути яснішою:

- чому бізнес-профіль недоступний;
- що треба зробити для активації;
- які вигоди дає бізнес-профіль.

---

## 10. Rollout order

### Stage 1

- new account shell
- sidebar
- dashboard
- profile tab

### Stage 2

- my listings with real statuses
- saved listings/businesses
- improved empty states

### Stage 3

- business profile management
- verification state
- messages integration

### Stage 4

- billing tab
- saved searches / alerts
- quota/plan widgets

---

## 11. Acceptance criteria

Новий кабінет вважається готовим, якщо:

- має sidebar shell як окрему account architecture;
- `Dashboard`, `Профіль`, `Бізнес-профіль`, `Мої оголошення`, `Збережене`, `Повідомлення`, `Billing`, `Налаштування` відкриваються окремо;
- dashboard має real counters;
- `Мої оголошення` має canonical statuses;
- `Збережене` перестає бути placeholder;
- `Бізнес-профіль` має meaningful empty state і activation path;
- всі тексти локалізовані;
- mobile layout придатний до використання.

---

## 12. Implementation directive

Для UAHUB новий кабінет не повинен бути просто копією Sharvarok.

Він має бути:

- таким же зрозумілим по shell-структурі;
- сильнішим по operational value;
- готовим до monetization;
- готовим до trust and moderation systems;
- готовим до growth beyond MVP.
