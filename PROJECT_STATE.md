# Project State - Baptizo Taufmanager

## Tech Stack
-   **Frontend:** Vue 3 (Composition API)
-   **Build Tool:** Vite (with legacy support for older browsers)
-   **Styling:** Vanilla CSS (Custom tokens in `index.html`)
-   **Charts:** Chart.js with `vue-chartjs`
-   **Integration:** `@churchtools/churchtools-client`, `@churchtools/extension-points`

## Current Status
-   **Phase:** Feature Completion & Handoff (v1.1.0)
-   **Deployment:** `deploy:legacy` für Produktion verifiziert.
-   **Key:** `baptizotaufmanager` (konsistent).
-   **Nächster Task:** Monitoring & Multi-Site support (Vorbereitung).

## Recent Changes
-  - **Feb 2026**: Admin Navigation Fix: Umstellung auf internen Vue-State (`showAdminView`). Double-Header entfernt. Integration von App-Settings in KV-Store. Legacy-Build (`build:legacy`) synchronisiert und aktualisiert.
-   Fixed critical typo in field names (`taufmanager_onboaring` -> `taufmanager_onboarding`) in `personService.ts` and migration scripts.
-   Consolidated environment variables: `.env` instead of `.env.development`.
-   Implemented credential-based login for local development.
-   Renamed extension key to `baptizotaufmanager`.
-   Established basic Dashboard with 4-list design and interactive charts.
-   Admin panel implemented for CT ID configuration.

## Known Issues
-   Onboarding date migration requires careful verification of field names in ChurchTools.
