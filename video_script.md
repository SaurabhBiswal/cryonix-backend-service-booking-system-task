# Video Presentation Script: Cryonix Service Booking Backend

## Structure Overview (5 Minutes)
- **0:00 - 0:30:** Introduction & Architecture Overview
- **0:30 - 1:30:** Database Schema & Relationships (Prisma)
- **1:30 - 2:30:** Concurrency Handling: Double-Booking Prevention
- **2:30 - 3:30:** Payment Simulation Handling
- **3:30 - 4:30:** Security & RBAC Implementation
- **4:30 - 5:00:** Summary & Next Steps

---

## Script Breakdown

### 1. Introduction & Architecture (30s)
> "Hi Cryonix Team, I'm Saurabh. Today I'll walk you through my backend implementation for the Service Booking platform. The architecture is a RESTful API built with **Node.js, Express, and TypeScript**, using **Prisma ORM** over a **PostgreSQL** database. The system follows a layered architecture—routing, middleware for validation and auth, and controllers for business logic, ensuring code is scalable and maintainable."

### 2. Database Schema (1 min)
*Show your `schema.prisma` file.*
> "My database consists of three core models: `User`, `Slot`, and `Booking`. 
> - The `User` model handles authentication and stores the user's role: ADMIN, PROVIDER, or CUSTOMER.
> - The `Slot` model belongs to a PROVIDER and stores a `startTime`, `endTime`, and its `AVAILABLE` or `BOOKED` status.
> - The `Booking` model links a CUSTOMER to a specific `Slot` and tracks the `paymentStatus` (PENDING, COMPLETED, or FAILED).
> Note the `slotId` on the `Booking` table is `@unique`, providing a database-level constraint that a slot can only have one booking."

### 3. Concurrency & Double Booking (1 min)
*Show `createBooking` in `booking.controller.ts`.*
> "To handle concurrency and prevent double-booking, relying solely on application-level checks isn't enough due to race conditions. I implemented **database-level row locking**. When a customer attempts to book, I initiate a Prisma interactive transaction. Inside, I run a raw SQL query `SELECT FOR UPDATE` on the slot. This acquires an exclusive row-level lock. If two requests hit the endpoint at the exact same millisecond, the database engine forces one to wait. The second request will only resume after the first transaction completes, at which point the slot status will be 'BOOKED', and the second request will safely be rejected."

### 4. Payment Simulation Logic (1 min)
*Show `confirmPayment` in `booking.controller.ts`.*
> "The payment process has a two-part ledger approach. First, creating a booking leaves it in a `PENDING` state. To check resilience, the `/confirm-payment` endpoint simulates a third-party gateway call. If the external payment succeeds, but the subsequent database update fails—a classic distributed systems problem—I don't silently swallow the error. Instead, the system returns a 500 error with an action flag `RECONCILIATION_REQUIRED` and the Gateway Transaction ID. In a production environment, this would hit an SQS queue and alert a monitoring system like Sentry so the team can manually or automatically reconcile the successful charge with the failed booking state."

### 5. Security Implementation (1 min)
*Show `auth.ts` middleware and `auth.validator.ts`.*
> "For security, passwords are encrypted using `bcryptjs` with 12 salt rounds before hitting the database. Authentication is handled statelessly via **JSON Web Tokens (JWT)**.
> Every protected route uses an `authenticate` middleware, followed by an `authorize` middleware implementing **Role-Based Access Control (RBAC)**. For example, creating a slot requires the `PROVIDER` role, while booking requires `CUSTOMER`. Finally, all incoming requests are strictly validated using **Zod schemas** before reaching the controller logic, preventing NoSQL injection or malformed data attacks."

### 6. Closing (30s)
> "To summarize, the API is fully typed, handles concurrent transactions gracefully at the database level, and maintains strict security boundaries. The setup instructions and API docs are detailed in the README. Thank you for your time, and I look forward to discussing this in the technical round."
