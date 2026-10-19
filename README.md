# Session Booking API

A REST API for managing teachers, users, and bookable teaching sessions. Built with TypeScript, Express, and MongoDB/Mongoose, with atomic booking/completion transitions and aggregation-based session listings.

## Tech Stack

- Node.js and TypeScript (strict mode)
- Express 4
- MongoDB with Mongoose
- Zod request validation
- Helmet for HTTP security headers
- Morgan for HTTP request logging
- `express-rate-limit` for rate limiting
- `ts-node-dev` for local development

## Prerequisites

- Node.js 20 or newer
- npm
- A MongoDB database, either a local MongoDB instance or MongoDB Atlas

## Setup

1. Clone the repository and enter the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`:

   **PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and set `MONGODB_URI` to your development database connection string.
5. Start the API in development mode:

   ```bash
   npm run dev
   ```

The server listens on port `3000` by default. Confirm the database connection and server startup messages in the terminal.

## Run Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run the TypeScript server with automatic restart |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled server |
| `npm run explain` | Seed temporary data, explain the aggregation queries, save JSON plans, and clean up seeded records |
| `npm run test:concurrency` | Run concurrent booking and completion checks against a running API |

Run `npm run build` before submission to check TypeScript compilation.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, or `test` |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate-limit window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX` | No | `1000` | Maximum requests allowed per IP in the window |

Keep `.env` out of version control. Use `.env.example` as the template; never put real credentials in that file.

## API Reference

Base URL for local development: `http://localhost:3000`

All successful responses use `success: true`. Error responses use `success: false` and a `message`. Examples below show the expected response shape; IDs and timestamps are illustrative.

### 1. Health Check

`GET /health`

Checks API availability and MongoDB connectivity. This route is registered before the general rate limiter.

Example response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptimeSeconds": 42,
    "timestamp": "2026-10-19T12:00:00.000Z"
  }
}
```

If the database is not connected, the endpoint returns `503 Service Unavailable`.

### 2. Create a User

`POST /users`

Request:

```json
{
  "fullName": "Aarav Sharma",
  "email": "aarav@example.com",
  "phone": "+919876543210"
}
```

Example response (`201 Created`):

```json
{
  "success": true,
  "data": {
    "_id": "671000000000000000000001",
    "fullName": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "+919876543210"
  }
}
```

Email addresses are normalized to lowercase and must be unique.

### 3. Create a Teacher

`POST /teachers`

Request:

```json
{
  "fullName": "Priya Mehta",
  "email": "priya@example.com",
  "specialization": "Mathematics",
  "experience": 5
}
```

Example response (`201 Created`):

```json
{
  "success": true,
  "data": {
    "_id": "671000000000000000000002",
    "fullName": "Priya Mehta",
    "email": "priya@example.com",
    "specialization": "Mathematics",
    "experience": 5
  }
}
```

Teacher email addresses must be unique. `experience` must be a non-negative integer.

### 4. Create a Session

`POST /sessions`

Request:

```json
{
  "teacherId": "671000000000000000000002",
  "startTime": "2026-10-20T10:00:00.000Z",
  "endTime": "2026-10-20T11:00:00.000Z"
}
```

Example response (`201 Created`):

```json
{
  "success": true,
  "data": {
    "_id": "671000000000000000000003",
    "teacherId": "671000000000000000000002",
    "userId": null,
    "startTime": "2026-10-20T10:00:00.000Z",
    "endTime": "2026-10-20T11:00:00.000Z",
    "status": "AVAILABLE",
    "completedAt": null
  }
}
```

The referenced teacher must exist. The end time must be after the start time. New sessions start with status `AVAILABLE`.

### 5. Get Available Sessions

`GET /sessions/available?dateTimestamp=1792490400000`

`dateTimestamp` is a required positive integer in **milliseconds since the Unix epoch**. The API uses it to identify the corresponding UTC calendar day: from `00:00:00.000 UTC` inclusive to the next midnight exclusive. Only sessions with status `AVAILABLE` whose `startTime` falls within that range are returned, ordered by `startTime` ascending and then `_id` ascending.

Example response without pagination (`200 OK`):

```json
{
  "success": true,
  "data": [
    {
      "_id": "671000000000000000000003",
      "startTime": "2026-10-20T10:00:00.000Z",
      "endTime": "2026-10-20T11:00:00.000Z",
      "status": "AVAILABLE",
      "teacher": {
        "_id": "671000000000000000000002",
        "fullName": "Priya Mehta",
        "specialization": "Mathematics"
      }
    }
  ]
}
```

Pagination is opt-in. If neither `page` nor `limit` is supplied, the response does not include `meta`. If either parameter is supplied, the missing parameter defaults to `page=1` or `limit=20`. `page` must be an integer greater than or equal to 1; `limit` must be an integer from 1 through 100.

Example paginated request:

`GET /sessions/available?dateTimestamp=1792490400000&page=1&limit=10`

Example paginated response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

### 6. Book a Session

`POST /sessions/:id/book`

Request:

```json
{
  "userId": "671000000000000000000001"
}
```

Example response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "_id": "671000000000000000000003",
    "status": "BOOKED",
    "userId": "671000000000000000000001"
  }
}
```

The user must exist. Booking is atomic: the session is updated only when its current status is `AVAILABLE`. If another request has already booked it, the API returns `409 Conflict`.

### 7. Complete a Session

`PATCH /sessions/:id/complete`

No request body is required.

Example response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "_id": "671000000000000000000003",
    "status": "COMPLETED",
    "completedAt": "2026-10-20T11:00:00.000Z"
  }
}
```

Only a session currently in `BOOKED` status can be completed. The transition is atomic and records `completedAt`. Attempting to complete an already completed or available session returns `409 Conflict`.

### 8. Get a User's Sessions

`GET /users/:id/sessions`

Returns the user's booked sessions as `upcomingSessions` and completed sessions as `completedSessions`. The route validates the user ID and checks that the user exists.

Example response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "upcomingSessions": [
      {
        "_id": "671000000000000000000004",
        "startTime": "2026-10-21T10:00:00.000Z",
        "endTime": "2026-10-21T11:00:00.000Z",
        "status": "BOOKED",
        "completedAt": null,
        "teacher": {
          "_id": "671000000000000000000002",
          "fullName": "Priya Mehta",
          "specialization": "Mathematics"
        }
      }
    ],
    "completedSessions": []
  }
}
```

Upcoming sessions are sorted by `startTime` ascending. Completed sessions are sorted by `completedAt` descending.

## Postman Collection

The collection is at `postman/session-booking-api.postman_collection.json`.

1. Start MongoDB and the API.
2. In Postman, select **Import** and choose the collection JSON file.
3. Keep `baseUrl` set to `http://localhost:3000`, unless your server uses another address.
4. Run the requests in the **Main Workflow** folder in order. The collection stores created IDs as collection variables.
5. Run **Error Cases** after the main workflow where the case depends on a created user or teacher.

The collection covers user/teacher/session creation, availability, booking, repeated booking, user session history, completion, repeated completion, health, pagination, and representative validation/not-found/conflict cases.

## Design Decisions and Assumptions

- **UTC day boundaries:** availability uses the UTC date represented by `dateTimestamp`, not the server's local timezone.
- **Timestamp unit:** `dateTimestamp` is Unix epoch time in milliseconds.
- **Session states:** a new session is `AVAILABLE`; successful booking changes it to `BOOKED`; successful completion changes it to `COMPLETED`.
- **Upcoming sessions:** `upcomingSessions` means sessions whose status is `BOOKED`; it is not filtered by whether the start time is in the future.
- **Teacher data:** aggregation responses include only the teacher's `_id`, `fullName`, and `specialization`.
- **Unique emails:** user and teacher email addresses are unique.
- **Atomic state changes:** booking only updates an `AVAILABLE` session, and completion only updates a `BOOKED` session.
- **Pagination:** pagination is optional for available sessions only. When enabled, defaults are `page=1` and `limit=20`, with `limit` capped at 100.
- **No pagination metadata by default:** the unpaginated available-session response contains `success` and `data`, without `meta`.
- **Concurrency test:** the script expects exactly one successful booking for simultaneous attempts on one session, with the remaining attempts rejected as conflicts.

## Project Structure

```text
session-booking-api/
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── session.pipeline(s).ts
│   │   └── ...
│   ├── types/
│   ├── utils/
│   ├── validators/
│   ├── app.ts
│   └── server.ts
├── scripts/
│   ├── concurrency-test.ts
│   └── explain.ts
├── postman/
│   └── session-booking-api.postman_collection.json
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

The pipeline builder filename in the source tree should match the actual file in your repository (currently expected to be `src/services/session.pipelines.ts`).

## Error Responses

| HTTP status | Meaning | Typical example |
|---|---|---|
| `400 Bad Request` | Invalid input, invalid ObjectId, or schema validation failure | Invalid timestamp or session time range |
| `404 Not Found` | Resource or route not found | Unknown user, teacher, or session |
| `409 Conflict` | Requested state transition cannot be performed or email is duplicated | Already-booked session or duplicate email |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in the configured window |
| `500 Internal Server Error` | Unexpected server error | Unhandled application failure |
| `503 Service Unavailable` | Database not connected | Health check while MongoDB is unavailable |

Typical error response:

```json
{
  "success": false,
  "message": "Session is not available for booking"
}
```

Zod validation errors use `message: "Validation failed"` and include an `errors` array with `path` and `message` fields.

## Beyond the Core API: Indexes and Query Plans

The models define indexes for the query patterns used by the API:

- Users: unique email index.
- Teachers: unique email index.
- Sessions: compound index `{ status: 1, startTime: 1 }` for availability filtering.
- Sessions: compound index `{ userId: 1, status: 1 }` for user session lookups.

Run the explain script only against a development/test database. It refuses to run when `NODE_ENV=production`, inserts temporary seed data, executes the shared aggregation pipelines with `executionStats`, writes JSON output into `explain-output/`, and cleans up its seeded records.

```bash
npm run explain
```

Observed explain results from one local run:

| Query | Plan stages observed | Keys examined | Documents examined | Returned | Execution time |
|---|---|---:|---:|---:|---:|
| Available sessions | `IXSCAN`, `FETCH`, `PROJECTION_SIMPLE`, `SORT` | 667 | 667 | 667 | 37 ms |
| Paginated available sessions | `IXSCAN`, `FETCH`, `PROJECTION_SIMPLE`, `SORT` | 667 | 667 | 667 | 4 ms |
| User sessions | `IXSCAN`, `FETCH`, `PROJECTION_SIMPLE` | 267 | 266 | 266 | 15 ms |

These are measurements from a single run and are not latency guarantees. The paginated pipeline uses `$facet`; the cursor-level `nReturned` value is not the same as the number of documents in the final API `data` array. The available-session plans include `SORT`, indicating an additional sort stage. Review the full saved explain output before deciding whether an index change is warranted.

Paste fresh explain output or a short summary from your own run here if it differs:

<!-- PASTE explain OUTPUT HERE -->

## Concurrency Verification

Start the API in one terminal:

```bash
npm run dev
```

In another terminal, run:

```bash
npm run test:concurrency
```

The script uses `BASE_URL` if provided; otherwise it targets `http://localhost:3000`.

Expected result:

- 20 concurrent booking attempts against the same session: one `200`, nineteen `409`.
- Exactly one user has the booked session in `upcomingSessions`.
- 10 concurrent completion attempts: one `200`, nine `409`.
- Final output reports `PASS` if all assertions succeed.

This is a focused concurrency check, not a comprehensive automated test suite.

## Security and Operational Notes

- `.env` contains local secrets and must not be committed.
- Helmet sets common HTTP security headers.
- Request bodies are limited to 10 KB.
- Rate limiting is configured using `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
- The health route is registered before the general rate limiter.
- The server connects to MongoDB before accepting requests and handles graceful shutdown on `SIGINT` and `SIGTERM`.
- Production deployments should use managed secrets, a restricted database user, network access controls, and appropriate monitoring.

## Future Work

- **Authentication and authorization:** add identity and access controls for users and teachers.
- **Caching:** evaluate caching for read-heavy endpoints if profiling justifies it.
- **Teacher schedule overlap checks:** prevent overlapping sessions for the same teacher if required by the product rules.
