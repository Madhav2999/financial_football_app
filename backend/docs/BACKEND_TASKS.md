# Backend Delivery Task List

The tasks below capture the full backlog that was previously outlined for completing the Financial Football backend. They are grouped by capability so contributors can quickly find the next item to tackle. Reference directories such as `backend/src/db/models` for schema details, `backend/src/routes` for HTTP endpoints, and `backend/src/sockets` for Socket.IO flows when implementing each task.

## 1. Platform Foundations
- Harden the Express server in `src/index.js` with production-grade logging, compression, security headers, and rate limiting.
- Expand `src/config` so configuration can be provided via multi-environment files plus secrets management instead of ad-hoc environment variables.
- Add migration scripts or seed runners that can bring MongoDB up to date automatically when new schemas land.

## 2. Authentication & Authorization
- Replace the placeholder `authMiddleware` with JWT-based auth endpoints (login, refresh, logout) for moderators and admins using the seeded accounts in `src/config/accounts.js`.
- Implement role-based guards so only admins can access `/api/admin` and moderators can manage live matches.
- Add session invalidation (token blacklist or rotation) to protect against compromised credentials.

## 3. Content & Data Ingestion
- Convert the temporary seeding routes in `src/routes/admin.js` into secure admin tools or background jobs that can sync with the future CMS.
- Build CRUD APIs for teams, moderators, and questions on top of the schemas in `src/db/models` so content can be maintained without database access.
- Add validation and duplicate detection (indexes already exist on `loginId`, `status`, and `matchRefId`).

## 4. Tournament Lifecycle Management
- Create `/api/tournaments`, `/api/stages`, and `/api/matches` endpoints that leverage the `Tournament`, `Stage`, `Match`, and `LiveMatch` models to manage the bracket.
- Support lifecycle actions (draft → upcoming → live → completed → archived) with audit trails and permissions.
- Implement utilities to generate brackets, seed teams, and update standings stored in `teamRecord` subdocuments.

## 5. Match Orchestration & Gameplay
- Model the full live match flow: kickoff, possessions, scoring, fouls, and timer control synchronized via `src/sockets`.
- Persist live match snapshots (`LiveMatch` model) and expose resume/replay endpoints for moderators.
- Implement budgeting/finance mechanics (question wagering, budgeting decisions, penalties) based on the match constants in `src/config/constants.js`.

## 6. Question Engine & Scoring
- Build a question service that can fetch, randomize, and track usage of question documents, including difficulty weighting and category balancing.
- Implement answer validation, scoring, and explanation broadcasting to connected clients.
- Store historical performance per team/moderator for analytics.

## 7. Notifications, Chat, and Presence
- Expand the basic chat handler in `src/sockets/index.js` into channel-specific messaging with moderation tools.
- Add presence tracking (who is connected to each match) and push match notifications (goal scored, question answered) over WebSockets.
- Provide HTTP endpoints for retrieving chat history and notification preferences.

## 8. Observability, QA, and Deployment
- Instrument API and socket handlers with metrics and tracing plus centralized error logging.
- Add integration/unit tests that cover routes, services, and socket events, and wire them into CI.
- Provide deployment scripts (Dockerfiles, CI workflows, environment bootstrap) so the backend can be promoted across staging and production.

Keep this document updated as tasks are completed or reprioritized so everyone knows the current state of the backend backlog.
