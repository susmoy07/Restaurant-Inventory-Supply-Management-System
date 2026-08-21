# Restaurant Inventory & Supply Management System (RISMS)

This is the MVP of the RISMS platform, designed to track restaurant inventory, manage suppliers, process stock transactions, and create purchase orders.

## Architecture & Stack
- **Frontend**: React (Vite) + React Router + Axios (Modern UI with Glassmorphism)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (via `pg` node module)
- **Auth**: JWT with bcrypt hashing

The codebase is organized into domain-driven modules: `auth`, `inventory`, `suppliers`, and `orders`.

## Prerequisites
- Node.js (v18+)
- PostgreSQL server running locally

## Local Setup

### 1. Database Setup
1. Open your PostgreSQL terminal/pgAdmin and create a database named `risms`:
   ```sql
   CREATE DATABASE risms;
   ```
2. Navigate to the backend directory and configure the database connection. By default, it connects to `localhost:5432` with user `postgres` and password `postgres`.
   You can override these by creating a `.env` file in the `backend/` directory:
   ```env
   DB_USER=your_user
   DB_HOST=localhost
   DB_NAME=risms
   DB_PASSWORD=your_password
   DB_PORT=5432
   JWT_SECRET=your_super_secret_key
   ```
3. Run the database initialization and seed script:
   ```bash
   cd backend
   node init-db.js
   ```

### 2. Starting the Backend
From the `backend` directory:
```bash
npm start
```
*(You may want to add `"start": "node src/index.js"` to `package.json` scripts if not already present, or simply run `node src/index.js`)*

### 3. Starting the Frontend
From the `frontend` directory:
```bash
npm run dev
```
This will start the Vite dev server, typically at `http://localhost:5173`.

## Test Accounts
The database is seeded with two test accounts:
- **Manager**: `manager@risms.com` / `manager123`
- **Staff**: `staff@risms.com` / `staff123`

*(Note: Certain actions like changing Order status require Manager permissions)*
