# Cryonix Service Booking Backend System

A robust, production-ready backend service booking system built for scalability and high concurrency. This project was developed as a technical assessment for the **Backend Intern** role at **Cryonix LLC**.

##  Overview

This system provides a complete backend for managing service appointments. It handles user authentication (RBAC), provider slot management, and a secure booking flow with integrated payment simulation.

### Key Highlights:
- **Zero Local Setup**: Integrated with **Neon Cloud PostgreSQL**, making it ready for immediate testing.
- **Concurrency Mastered**: Uses Database-level Row Locking (`SELECT FOR UPDATE`) to prevent 100% of double-booking edge cases.
- **Developer Friendly**: Includes an **Automated Test Script** to verify the entire flow in seconds without needing Postman.

##  Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (hosted on Neon.tech)
- **ORM**: Prisma v7 (Cloud-ready with Driver Adapters)
- **Security**: JWT (Authentication), Bcrypt (Password Hashing), Role-Based Access Control (RBAC)
- **Validation**: Zod (Schema validation for all inputs)

##  Core Features

### 1. Robust Authentication
- **Secure Sign-up/Login**: Passwords are hashed using Bcrypt (12 salt rounds).
- **RBAC**: Three distinct roles — `ADMIN`, `PROVIDER`, and `CUSTOMER`.
- **JWT Authorization**: All private routes are protected via a robust middleware layer.

### 2. Provider Slot Management
- Providers can create, view, and delete time slots.
- **Overlap Protection**: Smart validation prevents providers from creating overlapping slots.

### 3. High-Concurrency Booking Flow
- **Atomic Transactions**: Bookings are handled inside Prisma transactions.
- **Row-Level Locking**: When a booking request comes in, the specific slot is locked at the database level to ensure no two customers can book the same slot simultaneously, even if requests arrive at the exact same millisecond.

### 4. Resilient Payment Simulation
- Simulates a typical webhook flow: `Booking (PENDING)` -> `Confirm Payment` -> `Booking (CONFIRMED)`.
- **Failure Recovery Log**: Implemented a mock reconciliation log to handle cases where the database might fail *after* a successful third-party payment.

##  Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SaurabhBiswal/cryonix-backend-service-booking-system-task.git
   cd cryonix-backend-service-booking-system-task
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   The project is already pre-configured with a Neon Cloud DB for your convenience. If you wish to use your own, update the `.env` file:
   ```env
   DATABASE_URL="your_postgres_url"
   JWT_SECRET="your_secret"
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

##  Automated Testing (The "Wow" Factor)

You don't need to manually test with Postman. I've built a custom automation script that simulates a full business cycle:

1. **Start the server** in one terminal (`npm run dev`).
2. **Run the test script** in another terminal:
   ```bash
   node test-api.js
   ```
   **What it does:**
   - Logs in as a Provider.
   - Logs in as a Customer.
   - Creates a unique Slot.
   - Books the Slot.
   - Confirms Payment.
   - **Verifies Protection**: Tries to book the same slot again and confirms the server rejects it with a `409 Conflict`.

##  Project Structure

```text
src/
├── config/         # Prisma & DB adapters
├── controllers/    # API logic (Auth, Booking, Slots)
├── middlewares/    # Auth & Error Handlers
├── routes/         # Endpoint definitions
├── types/          # TypeScript definitions
└── utils/          # Handlers (JWT, Errors, Passwords)
prisma/
└── schema.prisma   # Database Models & Constraints
```

##  Documentations Included
- `walkthrough.md`: Detailed setup and technical decisions.
- `video_script.md`: A 5-minute Loom video script for the presentation.
- `test-api.js`: Automated verification script.

---
**Made with ❤️ for the Cryonix Team by SAURABH BISWAL.**
