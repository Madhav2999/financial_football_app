# Backend Service

The backend powers the Financial Football experience with a REST API, MongoDB persistence, and Socket.IO driven realtime events.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the server with `nodemon` for automatic reloads. |
| `npm start` | Runs the production build with plain Node.js. |
| `npm run lint` | Lints all source files with the shared ESLint configuration. |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Port used for both HTTP and WebSocket traffic (defaults to `4000`). |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secrets used for signing access and refresh tokens. |
| `CORS_ORIGIN` | Comma separated list of origins allowed to call the API and WebSocket server. |
| `MODERATOR_PASSWORD` / `ADMIN_PASSWORD` | Seed credentials for initial privileged accounts. |
| `ADMIN_LOGIN_ID` | Optional login for the bootstrap admin (defaults to `admin-root`). |

The `src/config` directory centralizes all configuration: database settings, JWT metadata, moderator/admin seeds, and match constants that are shared by routes and socket handlers.

## Bootstrapping an admin account

The server automatically ensures there is at least one admin account when it starts. Provide `ADMIN_PASSWORD` (and optionally `ADMIN_LOGIN_ID`) in your environment, then launch the backend; if no admin exists, it will create one with the configured credentials. You can then sign in via `POST /auth/admin` and manage other data (including deletions) through the admin routes.

## Backend task list

See [`docs/BACKEND_TASKS.md`](docs/BACKEND_TASKS.md) for the full backlog that was previously outlined for completing the backend feature set (platform hardening, tournament APIs, live match orchestration, etc.). Update the document whenever scope changes so future contributors can quickly pick up work.
