# AI Travel Planner

A multi-user, AI-powered travel itinerary planner built for the Trao Technologies Full-Stack Engineering Assessment. Users register, describe a trip (destination, days, budget, interests), and an LLM agent (Google Gemini) generates a complete day-by-day itinerary, a budget breakdown in Indian Rupees, hotel suggestions, and a destination-aware packing checklist — all editable and saved per user.

**Live Demo:** `https://ai-travel-planner-livid-ten.vercel.app/`
**Backend API:** `https://ai-travel-planner-backend-lxs2.onrender.com/`
**Video Walkthrough:** `https://www.loom.com/share/69f5c73c4b254ffcacc407cc2c981d30`

---

## 1. Project Overview

The app solves a simple problem: planning a trip well takes time — researching activities, estimating costs, figuring out what to pack. This app automates that research using an LLM agent while keeping the user in control: every generated itinerary can be edited, specific days can be regenerated with feedback, and packing items can be checked off as you go — all stored per user with strict data isolation.

**Core features:**
- Secure registration/login (JWT + hashed passwords)
- AI-generated day-by-day itinerary based on destination, duration, budget tier, and interests
- AI-estimated budget breakdown (Transport, Accommodation, Food, Activities) in ₹ INR
- Editable itinerary — add/remove activities, regenerate a specific day with custom feedback
- AI-suggested hotels by budget tier
- **Creative feature:** AI Weather-Aware Packing Assistant — an interactive, persisted packing checklist generated from the destination's climate and the planned activities

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React.js (Vite) + react-router-dom + Tailwind CSS | Strongest existing skill set — faster, more reliable delivery than learning Next.js under a tight deadline |
| Backend | Node.js + Express.js | Matches the assessment's preferred backend stack |
| Database | MongoDB Atlas + Mongoose | Matches the assessment's preferred database; flexible schema fits the nested itinerary/packing-list structure well |
| Auth | JWT (jsonwebtoken) + bcryptjs | Stateless auth, industry-standard password hashing |
| AI Agent | Google Gemini API (`gemini-2.5-flash`) | Fast, supports structured JSON output mode, generous free tier |
| Language | JavaScript | Existing skill set; project scope didn't require TypeScript's extra safety for the deadline available |

**Deviation from the assessment's preferred stack:** the brief lists Next.js as the preferred frontend framework. I used plain React (Vite) + `react-router-dom` instead, since that's my strongest framework and the assessment explicitly allows an "equivalent if stack is changed." All other functional requirements (routing, protected pages, responsive UI) are met the same way Next.js would provide them.

## 3. High-Level Architecture

```
React (Vite) Client  --REST + JWT-->  Express API  --Mongoose-->  MongoDB Atlas
                                            |
                                            v
                                  Google Gemini API (LLM)
```

- The React frontend never talks to Gemini directly — all AI calls happen server-side, so the API key is never exposed to the browser.
- Every protected backend route runs through a JWT middleware that decodes the token and attaches `req.user.id`, which every Trip query/update filters by — this is what enforces per-user data isolation.
- The Gemini response is parsed, then run through a **sanitization layer** before being saved (see Design Decisions below) to guarantee it matches the Mongoose schema even if the model's JSON drifts slightly from the prompt's instructions.

**Backend structure:**
```
backend/
├── config/db.js            # MongoDB connection
├── middleware/auth.js      # JWT verification
├── models/User.js
├── models/Trip.js
├── controllers/authController.js
├── controllers/tripController.js   # Gemini integration + CRUD
├── routes/authRoutes.js
├── routes/tripRoutes.js
└── server.js
```

**Frontend structure:**
```
frontend/src/
├── components/
│   ├── ProtectedRoute/
│   ├── CreateTripForm/
│   ├── ItineraryDay/
│   ├── BudgetSummary/
│   ├── HotelSuggestions/
│   └── PackingList/
├── pages/
│   ├── Login/
│   ├── Register/
│   └── Dashboard/
└── utils/api.js            # Axios instance, auto-attaches JWT
```

## 4. Authentication & Authorization

- **Registration:** password is hashed with `bcryptjs` (10 salt rounds) before being stored; a JWT signed with `JWT_SECRET` (7-day expiry) is returned.
- **Login:** plaintext password is compared against the stored hash with `bcrypt.compare`; on success, a fresh JWT is returned.
- **Authorization:** every trip-related route is wrapped in an `auth` middleware that reads `Authorization: Bearer <token>`, verifies it, and attaches the decoded `userId` to `req.user`. Missing/invalid tokens return `401`/`400` before the request reaches any controller.
- **Data isolation:** every Trip document stores a `userId` reference, and every single query (`getTrips`, `getTripById`, `updateTrip`, `regenerateDay`, `deleteTrip`) filters by `{ userId: req.user.id }` — a user can never read or modify another user's trip, even by guessing a trip ID, since the query itself excludes it.
- **Client-side:** the JWT is stored via `js-cookie` and auto-attached to every API request through an Axios interceptor.

## 5. AI Agent Design & Purpose

The agent is a single-purpose function (`callGemini`) that:
1. Builds a tightly-worded prompt describing the exact JSON shape expected (itinerary, hotels, budget, packing list), with explicit enum constraints for fields like `timeOfDay` and `category`
2. Calls Gemini with `generationConfig: { responseMimeType: "application/json" }` to force structured output
3. Wraps the call in an **exponential backoff retry** (1s → 2s → 4s → 8s → 16s, up to 5 attempts) to handle transient rate-limit errors gracefully instead of failing the whole request
4. The same agent function is reused for the initial trip generation and for the "regenerate a specific day" feature, with a different prompt that injects the existing trip context plus the user's free-text feedback

**Purpose:** the agent does the research-heavy work (realistic local costs, relevant activities, climate-appropriate packing) so the user only needs to provide a few preferences, while still being fully editable afterward.

## 6. Creative Feature: AI Weather-Aware Packing Assistant

**The problem it solves:** travelers often forget destination-specific items — rain gear for monsoon season, sunscreen for a beach trip, hiking boots if the itinerary includes a trek — because generic packing lists don't account for what's actually planned.

**How it works:** the same Gemini call that generates the itinerary also produces a `packingList`, where each item is categorized as Documents, Clothing, Gear, or Other based on the destination's climate and the specific activities in the itinerary (not a generic template). The frontend renders this as a grouped, interactive checklist — checking an item updates state immediately and persists to MongoDB via a `PUT` request, so progress isn't lost on refresh.

**Engineering judgment applied:** rather than trusting the LLM's category labels directly (which occasionally returned invented categories like "Footwear" or "Toiletries & Health"), a normalization function maps any returned category to one of four fixed enum values before saving — this is explained further below.

## 7. Key Design Decisions & Trade-offs

| Decision | Reasoning / Trade-off |
|---|---|
| React (Vite) instead of Next.js | Faster, more reliable delivery on my strongest stack vs. learning Next.js under a tight deadline. Trade-off: lose Next.js's built-in SSR/file routing, but the app doesn't need SSR for this use case. |
| LLM output is sanitized server-side, not trusted directly | Gemini occasionally returned values outside the prompt's stated enums (e.g. invented `packingList` categories, "Late Morning" instead of "Morning"). Rather than relying solely on prompt wording, a normalization layer maps any AI output to valid schema values before saving — this prevents save failures and is a more robust pattern than assuming any external system (including an AI) will always follow instructions exactly. |
| JWT stored via `js-cookie` (client-readable) rather than an `httpOnly` cookie | Simpler to implement given the time available; the trade-off is that the token is technically readable by JavaScript on the client, which is a known XSS exposure risk. A production version should issue the JWT as a server-set `httpOnly` cookie instead. |
| No global state library (Redux/Zustand) | At this app's scale, `useState` per component plus props is sufficient and easier to reason about; a global store would add complexity without a clear benefit here. |
| Currency shown in ₹ INR, not $ USD | The app is built for Indian travelers, so estimates are prompted and displayed in INR for the figures to be meaningfully useful rather than just illustrative. |
| AI calls happen only on the backend | Keeps the Gemini API key out of the browser entirely — the frontend never sees it. |

## 8. Known Limitations

- **Render free-tier cold start:** the backend sleeps after ~15 minutes of inactivity; the first request after sleeping can take 30–60 seconds to respond. This is a hosting-tier limitation, not an application bug.
- **LLM cost estimates are approximations:** Gemini's budget/cost figures are reasonable estimates based on its training knowledge, not live pricing data — they should be treated as a starting point, not a guarantee.
- **No automated test suite:** given the assessment's time constraints, all testing was done manually (Postman for backend routes, manual UI flows for frontend) rather than with Jest/RTL.
- **Single-day regeneration only:** the "regenerate" feature targets one day at a time; there's no bulk "regenerate entire trip" option.
- **JWT stored client-side via cookie**, not `httpOnly` — see trade-off note above.

## 9. Setup Instructions

### Local Setup

**Backend:**
```bash
cd backend
npm install
```
Create `backend/.env`:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_random_secret_string
GEMINI_API_KEY=your_gemini_api_key
```
```bash
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
```
Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```
```bash
npm run dev
```

### Deployed Setup
- **Backend** is deployed on **Render** (Root Directory: `backend`, Build: `npm install`, Start: `npm start`), with `MONGO_URI`, `JWT_SECRET`, and `GEMINI_API_KEY` set as environment variables on Render.
- **Frontend** is deployed on **Vercel** (Root Directory: `frontend`), with `VITE_API_URL` set to the live Render backend URL.
- MongoDB Atlas Network Access is configured to allow access from anywhere (`0.0.0.0/0`) so both local development and the deployed backend can connect.