-- ============================================
-- StockNest Database Schema
-- Run this file once to set up all tables
-- ============================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('Admin', 'Manager', 'Staff');
CREATE TYPE room_status AS ENUM ('Available', 'Booked', 'Under Maintenance', 'Closed');
CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'cancelled', 'no-show');
CREATE TYPE asset_status AS ENUM ('Active', 'In-Maintenance', 'Damaged', 'Retired', 'Lost');
CREATE TYPE maintenance_status AS ENUM ('Pending', 'In Progress', 'Resolved', 'Closed');
CREATE TYPE inventory_status AS ENUM ('In Stock', 'Low Stock', 'Out of Stock', 'Discontinued');

-- ORGANIZATION
CREATE TABLE organization (
  org_id          SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- USER
CREATE TABLE users (
  user_id         SERIAL PRIMARY KEY,
  org_id          INT NOT NULL REFERENCES organization(org_id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  role            user_role NOT NULL DEFAULT 'Staff',
  permissions     JSONB DEFAULT '[]',
  last_login      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ROOM
CREATE TABLE room (
  room_id         SERIAL PRIMARY KEY,
  org_id          INT NOT NULL REFERENCES organization(org_id) ON DELETE CASCADE,
  room_name       VARCHAR(255) NOT NULL,
  capacity        INT NOT NULL,
  amenities       JSONB DEFAULT '[]',
  utilization_pct DECIMAL(5,2) DEFAULT 0,
  status          room_status DEFAULT 'Available'
);

-- BOOKING
CREATE TABLE booking (
  booking_id      SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(user_id),
  room_id         INT NOT NULL REFERENCES room(room_id),
  booking_date    DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  attendees       INT,
  status          booking_status DEFAULT 'pending'
);

-- ASSET
CREATE TABLE asset (
  asset_id        SERIAL PRIMARY KEY,
  org_id          INT NOT NULL REFERENCES organization(org_id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  condition_level INT DEFAULT 100 CHECK (condition_level BETWEEN 0 AND 100),
  current_value   DECIMAL(10,2),
  service_history JSONB DEFAULT '[]',
  last_service_date DATE,
  status          asset_status DEFAULT 'Active'
);

-- INVENTORY
CREATE TABLE inventory (
  inventory_id        SERIAL PRIMARY KEY,
  org_id              INT NOT NULL REFERENCES organization(org_id) ON DELETE CASCADE,
  sku                 VARCHAR(100) UNIQUE,
  item_name           VARCHAR(255) NOT NULL,
  category            VARCHAR(100) DEFAULT 'General',
  unit                VARCHAR(50)  DEFAULT 'Units',
  current_stock       DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_point       DECIMAL(10,2) NOT NULL DEFAULT 0,
  monthly_consumption DECIMAL(10,2) DEFAULT 0,
  consumption_history JSONB DEFAULT '[]',
  status              inventory_status DEFAULT 'In Stock',
  supplier_email      VARCHAR(255),
  created_at          TIMESTAMP DEFAULT NOW()
);

-- MAINTENANCE
CREATE TABLE maintenance (
  request_id      SERIAL PRIMARY KEY,
  asset_id        INT REFERENCES asset(asset_id),
  room_id         INT REFERENCES room(room_id),
  assigned_to     INT REFERENCES users(user_id),
  status          maintenance_status DEFAULT 'Pending',
  priority        VARCHAR(20) DEFAULT 'Medium',
  cost            DECIMAL(10,2),
  deadline        DATE,
  created_at      TIMESTAMP DEFAULT NOW()
);
-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff',
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX idx_users_email ON users(email);