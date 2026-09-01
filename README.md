# StockNest 📦

StockNest is a comprehensive, modern Asset and Inventory Management System designed for modern workspaces. It helps organizations effortlessly track consumable inventory, manage room-by-room asset allocations, maintain equipment maintenance logs, and manage room bookings.

## 🌟 Core Modules

1. **Asset Registry & Transfer (`allocation.html`)**
   - View assets allocated to specific rooms across the organization.
   - Seamlessly transfer equipment from one room to another (e.g., from *Storage* to *Conference Room A*).
   - Track transfer history with practical reasons (*New Employee Allocation*, *Equipment Upgrade*, etc.).
2. **Consumables Inventory (`inventory.html`)**
   - Track stock levels of everyday items (stationery, IT peripherals, pantry supplies).
   - Log restocking and consumption events.
3. **Room Bookings (`bookings.html` & `room-booking.html`)**
   - Manage and schedule meeting rooms and workspaces.
4. **Maintenance Logging (`maintainance.html`)**
   - Log and track equipment repairs and maintenance tasks.
5. **Organization & Dashboard (`organisation.html` & `dashboard.html`)**
   - High-level overview of total assets, low stock alerts, and organization settings.
6. **Authentication (`login.html` & `signup.html`)**
   - Secure JWT-based authentication for users and admins.

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (No heavy frameworks, highly optimized). Features a premium glassmorphism design, smooth interactions, and a clean layout.
- **Backend**: Node.js, Express.js for building the REST API.
- **Database**: PostgreSQL (for robust, relational data integrity).

## 📁 Project Structure

```
StockNest/
├── frontend/                 # Client-side code
│   ├── components/           # Reusable UI components (Sidebar, Topbar)
│   ├── *.html                # Module entry points (allocation.html, inventory.html, etc.)
│   ├── *.css                 # Dedicated stylesheets for each module
│   └── *.js                  # Dedicated logic for each module
├── backend/                  # Server-side API
│   ├── src/                  
│   │   ├── controllers/      # Route handlers (assetController, authController, etc.)
│   │   ├── routes/           # Express router definitions
│   │   ├── config/           # Database config (db.js)
│   │   └── server.js         # Main Express app entry point
│   ├── sql/                  # SQL Schema definitions
│   ├── seed-data.js          # Database seed scripts for rooms/consumables
│   ├── seed-assets.js        # Database seed scripts for fixed assets
│   └── seed-user.js          # Database seed scripts for authentication
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

### 1. Database Setup

Create a PostgreSQL database and configure the credentials in the backend environment variables.
Use the provided seed scripts to populate your database with initial rooms, assets, and users.

```bash
cd backend
npm install

# Drop existing data and recreate tables (WARNING: Clears data)
node clear-db.js

# Seed the database
node seed-user.js
node seed-data.js
node seed-assets.js
```

### 2. Backend Setup

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=stocknest
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=your_super_secret_key
PORT=5000
```

Start the development server:

```bash
cd backend
npm run dev
```
The backend server will start on `http://localhost:5000`.

### 3. Frontend Setup

Navigate to the `frontend` directory and serve the static files using any local server (e.g., `serve`).

```bash
# If you don't have serve installed globally:
npx serve frontend
```
The application will be accessible at `http://localhost:3000`.

## 🎨 Design Philosophy

StockNest is built with a focus on aesthetics and usability. It discards the traditional clunky, spreadsheet-like interfaces typical of inventory tools, favoring:
- Spacious layouts with logical grouping.
- Contextual actions (e.g., side-by-side asset selection and transfer forms).
- Practical, conversational terminology (e.g., "Employee Offboarding" instead of opaque ID codes).

## 📄 License

This project is licensed under the MIT License.
