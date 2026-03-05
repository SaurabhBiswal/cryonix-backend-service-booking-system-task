# Cryonix Service Booking Backend

A production-ready RESTful backend for a service booking platform, built with **Node.js**, **TypeScript**, **Express**, **Prisma ORM**, and **PostgreSQL**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| Password Hashing | bcryptjs |

---

## Setup Instructions

### 1. Prerequisites
- Node.js v18+
- PostgreSQL running locally (or a hosted instance like Neon.tech / Supabase)

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd cryonix-service-booking-backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database URL and JWT secret:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

### 5. Seed the Database (Optional)

```bash
npm run seed
```

This creates test users:
| Role | Email | Password |
|---|---|---|
| Admin | admin@cryonix.com | Admin@1234 |
| Provider | provider@cryonix.com | Provider@1234 |
| Customer | customer@cryonix.com | Customer@1234 |

### 6. Start the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build && npm start
```

Server runs at: `http://localhost:3000`

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login and get JWT token |
| GET | `/auth/profile` | Any authenticated | Get own profile |

**Register Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secret@123",
  "role": "CUSTOMER"
}
```

**Login Body:**
```json
{
  "email": "john@example.com",
  "password": "Secret@123"
}
```

**Headers for protected routes:**
```
Authorization: Bearer <jwt_token>
```

---

### Slot Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/slots` | PROVIDER, ADMIN | Create a new available slot |
| GET | `/slots` | Authenticated | List all slots (filter by `?status=AVAILABLE`) |
| GET | `/slots/my` | PROVIDER, ADMIN | Get own slots |
| DELETE | `/slots/:id` | PROVIDER, ADMIN | Delete an available slot |

**Create Slot Body:**
```json
{
  "startTime": "2026-03-10T10:00:00.000Z",
  "endTime": "2026-03-10T11:00:00.000Z"
}
```

---

### Booking

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/bookings` | CUSTOMER, ADMIN | Book an available slot |
| POST | `/bookings/confirm-payment` | Authenticated | Confirm payment for a booking |
| GET | `/bookings/my` | CUSTOMER, ADMIN | Get own bookings |
| GET | `/bookings` | ADMIN | Get all bookings |

**Create Booking Body:**
```json
{
  "slotId": "uuid-of-the-slot"
}
```

**Confirm Payment Body:**
```json
{
  "bookingId": "uuid-of-the-booking",
  "simulateDbFailure": false
}
```

> Set `simulateDbFailure: true` to test the payment-success-but-DB-failure scenario.

---

### Admin

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/users` | ADMIN | List all users |
| DELETE | `/admin/users/:id` | ADMIN | Delete a user |
| GET | `/admin/stats` | ADMIN | Platform statistics |

---

## Design Decisions

### 1. Role-Based Access Control (RBAC)

Three roles are supported: `ADMIN`, `PROVIDER`, `CUSTOMER`. JWT tokens carry the role, and the `authorize()` middleware checks it on every protected route.

### 2. Double Booking Prevention

Double booking is prevented using **database-level row locking** via PostgreSQL's `SELECT FOR UPDATE`:

```sql
SELECT id, status FROM slots WHERE id = $slotId FOR UPDATE;
```

This runs inside a **Prisma interactive transaction**. The row lock ensures that even if two requests arrive simultaneously for the same slot, only one can proceed — the second will wait and then see the slot as `BOOKED`.

This approach is more reliable than application-level checks (which can have TOCTOU race conditions) because the lock is enforced at the database engine level.

### 3. Payment Confirmation Logic

Booking follows a two-step process:
1. **`POST /bookings`** — Creates the booking with `paymentStatus: PENDING`. Slot is locked but not yet finalized.
2. **`POST /bookings/confirm-payment`** — Simulates payment; on success, sets `paymentStatus: COMPLETED`.

**Handling payment success + DB failure:**

When `simulateDbFailure: true` is passed, we simulate a scenario where the payment gateway returns success but the subsequent DB update crashes. The system:
- Logs a `[RECONCILIATION NEEDED]` error with the transaction ID
- Returns HTTP `500` with the `paymentTransactionId` and `RECONCILIATION_REQUIRED` action
- In production, this event would trigger a monitoring alert and a background reconciliation job (e.g., an SQS queue consumer) that would retry the DB update using the payment gateway's idempotency key

### 4. Error Handling

Global error handling middleware (`errorHandler.ts`) catches all errors and returns structured JSON responses with appropriate HTTP status codes. Zod validation errors return `400 Bad Request` with human-readable messages.

---

## Database Schema

```
users
  id (uuid, PK)
  name, email (UNIQUE), password, role (ADMIN|PROVIDER|CUSTOMER)
  createdAt, updatedAt

slots
  id (uuid, PK)
  providerId (FK → users.id)
  startTime, endTime (DATETIME)
  status (AVAILABLE|BOOKED)
  createdAt, updatedAt

bookings
  id (uuid, PK)
  customerId (FK → users.id)
  slotId (FK → slots.id, UNIQUE — one booking per slot)
  paymentStatus (PENDING|COMPLETED|FAILED)
  createdAt, updatedAt
```

The `slotId` on `bookings` is `UNIQUE`, which provides an additional database-level constraint against double booking.

---

## Security Highlights

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWTs signed with **HS256**, expire in 7 days
- Role-checked on every sensitive route
- Input validated with **Zod** schemas before hitting the database
- Sensitive fields (password) never returned in API responses
