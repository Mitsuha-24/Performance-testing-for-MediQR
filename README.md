# Performance Testing for MediQR

Performance/load testing suite for [MediQR](https://github.com/Mitsuha-24/MediQr), a MERN-stack patient health record management system, built using **Apache JMeter**.

## Overview

This project simulates a realistic **patient user journey** to validate the application's behavior under concurrent load — covering authentication, dashboard access, profile management, and emergency contact management.

### Tested User Journey

1. **Patient Login** — `POST /user/patientlogin` (JWT cookie-based authentication)
2. **View Dashboard** — `GET /user/patientdashboard`
3. **Get Profile** — `GET /user/profile`
4. **Update Profile** — `POST /user/profile/update`
5. **Add Emergency Contact** — `POST /user/emergency-contact/add`
6. **Logout** — `GET /user/logout`

## Test Design

- **Test Data**: 20 pre-verified patient accounts seeded directly into MongoDB (bypassing OTP email verification), driven via CSV Data Set Config
- **Authentication**: HTTP Cookie Manager automatically captures and reuses the JWT cookie set on login across all subsequent requests in a session
- **Realism**: Uniform Random Timer (1-3s) simulates human think-time between actions
- **Validation**: Response Assertions on every request (HTTP status codes + `"success":true` checks) to catch silent failures
- **Reporting**: Transaction Controllers group each step for per-transaction response time analysis via Summary Report / Aggregate Report

## Files

| File | Description |
|---|---|
| `MediQr_LoadTest.jmx` | JMeter test plan — full patient journey scenario |
| `seed-loadtest-users.js` | Node.js script to seed pre-verified test users into MongoDB |
| `users.csv` | Generated test user credentials (email/password), consumed by JMeter |
| `package.json` | Dependencies for the seed script (`bcrypt`, `mongodb`) |

## Setup & Usage

### 1. Seed test users

```bash
npm install bcrypt mongodb
node seed-loadtest-users.js
```

This creates 20 verified patient accounts (`loadtest1@mediqr.com` ... `loadtest20@mediqr.com`) directly in MongoDB and generates `users.csv` for JMeter.

> **Note**: Edit the `CONFIG` section in `seed-loadtest-users.js` to match your MongoDB connection string and database name before running.

### 2. Run the test

Ensure the MediQr server is running on `localhost:3000`, then:

```bash
jmeter -n -t MediQr_LoadTest.jmx -l results.jtl -e -o report/
```

Open `report/index.html` for the full HTML dashboard with graphs.

## Results (40 concurrent users, 5 iterations, 960 total requests)

| Transaction | Avg (ms) | Min (ms) | Max (ms) | Error % |
|---|---|---|---|---|
| POST /user/patientlogin | 137 | 104 | 214 | 0.00% |
| GET /user/patientdashboard | 7 | 3 | 26 | 0.00% |
| GET /user/profile | 9 | 4 | 30 | 0.00% |
| POST /user/profile/update | 18 | 8 | 46 | 0.00% |
| POST /user/emergency-contact/add | 17 | 9 | 50 | 0.00% |
| GET /user/logout | 6 | 3 | 29 | 0.00% |

- **Total Throughput**: ~12.7 requests/sec
- **Error Rate**: 0.00% across all 960 requests
- **Environment**: Local development server (Node.js + Express + MongoDB)

> Note: Transaction Controller times (~2000ms avg) include the configured 1-3s think-time timer and reflect simulated user pacing, not server response time. Sampler-level times above represent actual server performance.

## Key Learnings

- Configuring CSV-driven test data for realistic multi-user simulation
- Managing JWT-based session authentication via cookies in JMeter
- Structuring test plans with Transaction Controllers for meaningful reporting
- Using Response Assertions to catch functional failures during load testing
- Bypassing OTP-based registration flows for test data setup (direct DB seeding)

## Future Improvements

- [ ] Stress testing to identify breaking points
- [ ] Spike testing for sudden traffic bursts
- [ ] Soak/endurance testing for memory leak detection
- [ ] Distributed testing across multiple load generator machines
- [ ] Server-side resource monitoring (CPU/memory) correlation via PerfMon plugin
