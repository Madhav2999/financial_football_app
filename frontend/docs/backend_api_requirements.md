# Backend API requirements and transport recommendations

This document maps the current frontend code to the backend contracts it expects and outlines the REST and WebSocket endpoints needed for a real-time tournament quiz experience.

## Why WebSockets are recommended
The app coordinates coin tosses, timers, answer submissions, and bracket progression in real time. While REST can create/update resources, keeping team dashboards, moderators, and public spectators in sync benefits from push delivery:
- Timer drift prevention by broadcasting remaining time/ deadlines instead of relying on local countdowns.
- Instant coin-toss results and turn changes for both teams and spectators.
- Live score and bracket updates without polling.

Server-Sent Events (SSE) could work, but full duplex (teams sending answers, moderators issuing pauses) makes WebSockets the most ergonomic choice.

## Core data models
These shapes mirror the frontend state used in `App.jsx` and the tournament engine.

### Team
- `id`, `name`, `loginId`, `password` (hashed in production)
- runtime stats: `wins`, `losses`, `totalScore`, `eliminated`, `initialBye` flag, `points` for bracket ordering【F:src/App.jsx†L325-L556】【F:src/tournament/engine.js†L611-L665】

### Moderator
- `id`, `name`, `loginId`, `password`

### Question
- `id`, `prompt`, `answer`, `category`; options are built client-side from the bank【F:src/App.jsx†L18-L111】【F:src/App.jsx†L283-L315】

### Tournament
State wrapper containing: `id`, `status`, timestamps, `matches`, `stages`, `records`, `rounds`, `bracketQueues`, `champions`, `finals`, `initialByeTeamId`, and moderator rotation data【F:src/tournament/engine.js†L611-L665】.

### Stage / Round metadata
- Stage: `id`, `label` (e.g., "Winners Round 1"), `bracket`, ordering key, `matchIds`, and `meta` (bye info)【F:src/tournament/engine.js†L54-L124】.
- Round summary: entrants, byes, scheduled matchIds, completion flags, and win/loss buckets【F:src/tournament/engine.js†L171-L200】.

### Bracket Match
- `id`, `stageId`, `bracket`, `label`, `teams` `[teamAId, teamBId]`, `status` (`pending|scheduled|active|completed`), `winnerId`, `loserId`, `moderatorId`, `matchRefId` (live room link), `history`, `meta` (e.g., `byeAwarded`)【F:src/tournament/engine.js†L81-L169】【F:src/tournament/engine.js†L687-L722】.

### Team record
Per-team entry in `records`: `wins`, `losses`, `points`, `eliminated`, `initialBye`【F:src/tournament/engine.js†L7-L22】【F:src/tournament/engine.js†L611-L665】.

### Live Match (quiz room)
Client-side representation of an in-progress quiz: `id`, `teams`, `scores`, `questionQueue`, `assignedTeamOrder`, `questionIndex`, `activeTeamId`, `awaitingSteal`, `status` (`coin-toss|in-progress|completed`), `timer`, `coinToss` payload, `tournamentMatchId`, `moderatorId`【F:src/App.jsx†L283-L315】【F:src/App.jsx†L426-L469】.

### Timer
`type` (`primary|steal`), `status` (`running|paused`), `durationMs`, `remainingMs`, `startedAt`, `deadline`【F:src/App.jsx†L38-L76】.

### Match history item
For completed bracket matches: `winnerId`, `loserId`, `scores`, `timestamp`【F:src/tournament/engine.js†L126-L169】.

## REST API surface
These endpoints mirror the mutations and queries the frontend currently performs in-memory.

### Authentication
- `POST /auth/team` → `{ token, teamId }`
- `POST /auth/moderator` → `{ token, moderatorId }`
- `POST /auth/admin` → `{ token }`
- `POST /auth/logout`

### Reference data
- `GET /teams` → roster for selection and display.
- `GET /moderators`
- `GET /questions`

### Tournament management
- `POST /tournament` – create bracket from selected teamIds; apply initial bye if odd count, seed Winners Round 1.
- `POST /tournament/launch` – mark tournament active so live rooms can be created.
- `GET /tournament` – full snapshot (stages, matches, records, rounds, queues, champions, finals flags).
- `GET /tournament/stages` / `GET /tournament/stages/:id/matches` – list stages and matches for dashboards.
- `POST /tournament/match/:id/bye` – admin grants bye; marks winner/loser, sets `byeAwarded`, clears `matchRefId`【F:src/tournament/engine.js†L687-L722】.
- `POST /tournament/match/:id/result` – finalize a scheduled match; payload includes `winnerId`, `loserId`, `scores`; updates bracket and records【F:src/tournament/engine.js†L671-L684】.

### Live match lifecycle
- `POST /live-matches` – create quiz room for a bracket match (teams, moderatorId, tournamentMatchId) following `createLiveMatch` shape【F:src/App.jsx†L283-L315】.
- `PATCH /live-matches/:id/coin-toss` – run coin toss and persist result.
- `PATCH /live-matches/:id/first-team` – toss winner chooses who starts; sets `assignedTeamOrder`, moves to `in-progress`, starts primary timer.
- `PATCH /live-matches/:id/pause` / `resume` / `reset` – moderator/admin controls; reset returns to coin-toss and zeroes scores【F:src/App.jsx†L426-L469】.
- `PATCH /live-matches/:id/answer` – acting team submits answer; backend checks correctness, applies scoring/steal logic, advances question index, and updates timers.
- `POST /live-matches/:id/finalize` – mark quiz complete, post result to bracket via `/tournament/match/:id/result`, append history, clear `matchRefId`【F:src/App.jsx†L476-L620】.

### Public viewing
- `GET /tournament/public` – tournament snapshot without private auth data for the public bracket page.
- `GET /live-matches/:id/public` – read-only live match view (coin toss state, scores, timers, question index) for spectators.

## WebSocket API
Single channel (e.g., `/ws`) with authenticated subscriptions. Suggested event types:
- `match.created` – live room opened for a bracket match.
- `match.updated` – score, question index, activeTeamId, awaitingSteal, timer payload updates.
- `match.coinToss` – toss result and first-team decision.
- `match.paused` / `match.resumed` / `match.reset` – state control broadcasts.
- `match.completed` – final scores; includes bracket matchId for tournament update.
- `tournament.updated` – bracket state delta after results or byes.
- `timer.tick` – optional periodic remainingMs/deadline broadcasts if server owns timers.

Clients (team, moderator, public) should filter events by tournamentId/matchId. Moderators emit control actions over WebSocket or REST; teams submit answers via REST or WebSocket depending on server preference.

## Mapping frontend expectations to backend responses
- Team dashboards and moderator views assume a live match document with timers and coin-toss state; keep payloads aligned with `createLiveMatch` and timer shapes so components render without change【F:src/App.jsx†L283-L315】.
- Admin dashboards need stage/match lists ordered by `stage.order` with bye metadata for display and manual bye controls【F:src/tournament/engine.js†L54-L124】【F:src/tournament/engine.js†L687-L722】.
- Bracket progression requires server-side enforcement of double elimination and the initial-bye rule; ensure finals scheduling mirrors `recordMatchResult` and related helpers【F:src/tournament/engine.js†L671-L684】.
