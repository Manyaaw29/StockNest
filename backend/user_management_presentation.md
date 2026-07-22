# StockNest — User Authentication & Management System
> **Presentation Guide & API Documentation**
> Designed for team review, live demo, and API evaluation.

---

## 📋 Overview of My Role & Contributions
In this project, my primary responsibility was the design, implementation, and security of the core **User Authentication & Management System**. This layer handles user onboarding, secure sessions, role-based access control (RBAC), and user profile updates.

### Core Responsibilities
1. **API Endpoints**: 
   - `POST /api/auth/register` (Register new user accounts)
   - `POST /api/auth/login` (Authenticate users & start session)
   - `GET /api/auth/me` (Fetch logged-in user profile details)
   - `GET /api/users` (Admin/Manager resource to view all users in the organization)
   - `PUT /api/users/:id` (Update user profiles & edit roles)
2. **Middlewares**:
   - `authMiddleware` (Custom JWT verification)
   - `checkRole` (Dynamically checks permissions for role-based routes)

---

## 📂 Codebase Reference Directory
Use these direct file links during your presentation to quickly show the source code:

*   **Database Schema**: [`backend/sql/schema.sql`](file:///C:/Users/tanma/Desktop/StockNest/backend/sql/schema.sql#L23-L33) (Defines the `users` and `organization` tables).
*   **Controller Logic**: [`backend/src/controllers/authController.js`](file:///C:/Users/tanma/Desktop/StockNest/backend/src/controllers/authController.js) (Handles hash comparisons, token creation, updates, and fetches).
*   **Authentication Routes**: [`backend/src/routes/authRoutes.js`](file:///C:/Users/tanma/Desktop/StockNest/backend/src/routes/authRoutes.js) (Maps endpoints like `/login` and `/me`).
*   **User Management Routes**: [`backend/src/routes/userRoutes.js`](file:///C:/Users/tanma/Desktop/StockNest/backend/src/routes/userRoutes.js) (Handles `/users` and `/users/:id` with specific checks).
*   **Custom Middlewares**: [`backend/src/middleware/authMiddleware.js`](file:///C:/Users/tanma/Desktop/StockNest/backend/src/middleware/authMiddleware.js) (Handles token verification and role routing filters).
*   **Server Core**: [`backend/src/server.js`](file:///C:/Users/tanma/Desktop/StockNest/backend/src/server.js#L18-L20) (Registers routes at `/api/auth` and `/api/users`).

---

## 🔒 Security Architecture Details

### 1. Password Protection (`bcryptjs`)
Plaintext passwords are never stored in the database. When creating or registering users:
- We apply `bcrypt.hash(password, 10)` which salts and hashes passwords.
- During login, we use `bcrypt.compare()` to check input credentials against the DB hash.

### 2. JWT Session Token (`jsonwebtoken`)
Upon successful registration or login, the backend signs and generates a stateless JSON Web Token containing the user's metadata:
```json
{
  "user_id": 1,
  "email": "admin@stocknest.com",
  "role": "Admin",
  "org_id": 1
}
```
This is signed with a secret key `JWT_SECRET` and set to expire in `7d`.

---

## 🛡️ Middlewares Deep-Dive (Shared Infrastructure)

### A. JWT Authentication Middleware (`authMiddleware`)
This interceptor intercepts all incoming requests to protected routes. It verifies the client identity before allowing the request to proceed.

```javascript
const authMiddleware = (req, res, next) => {
    // 1. Retrieve the authorization header: Authorization: Bearer <token>
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // 2. Decode & verify token
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // 3. Attach credentials to standard request object for downstream controllers
    req.userId = decoded.user_id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.orgId = decoded.org_id;

    next(); // Pass control to the next handler
};
```

### B. Access Control Middleware (`checkRole`)
A dynamic role filter that restricts routes to specific roles (e.g., only Admin or Manager can view the user list).

```javascript
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.userRole was attached by authMiddleware
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions'
            });
        }
        next();
    };
};
```

---

## 🌐 API Reference & Postman Testing Suite

Use these specifications to demo and test your APIs inside **Postman**. 

### Postman Environment Variable Setup
Before starting, create a Postman Environment containing:
*   `base_url`: `http://localhost:5000`
*   `jwt_token`: *(Leave blank; dynamically populated by login request)*

> 💡 **Presentation Tip**: In your login request in Postman, paste the following script into the **Tests** tab to automatically capture and save the token:
> ```javascript
> const response = pm.response.json();
> if (response.token) {
>     pm.environment.set("jwt_token", response.token);
> }
> ```

---

### 1. User Registration
Creates a new user profile inside an organization.
*   **Method**: `POST`
*   **URL**: `{{base_url}}/api/auth/register`
*   **Headers**: None (Public)
*   **Request Body** (JSON):
    ```json
    {
      "name": "Jane Doe",
      "email": "jane.doe@stocknest.io",
      "password": "securepassword123",
      "role": "Admin",
      "org_id": 1
    }
    ```
*   **Expected Response** (`201 Created`):
    ```json
    {
      "message": "User registered successfully.",
      "token": "eyJhbGciOi...",
      "user": {
        "user_id": 13,
        "name": "Jane Doe",
        "email": "jane.doe@stocknest.io",
        "role": "Admin",
        "org_id": 1,
        "created_at": "2026-07-16T17:10:00Z"
      }
    }
    ```

---

### 2. User Login
Authenticates credentials and returns a session token.
*   **Method**: `POST`
*   **URL**: `{{base_url}}/api/auth/login`
*   **Headers**: None (Public)
*   **Request Body** (JSON):
    ```json
    {
      "email": "admin@stocknest.com",
      "password": "admin123"
    }
    ```
*   **Expected Response** (`200 OK`):
    ```json
    {
      "message": "Login successful.",
      "token": "eyJhbGciOi...",
      "user": {
        "user_id": 1,
        "name": "Admin User",
        "email": "admin@stocknest.com",
        "role": "Admin",
        "org_id": 1,
        "last_login": "2026-07-16T17:11:00Z"
      }
    }
    ```

---

### 3. Get Current User Profile (`/me`)
Retrieves the logged-in user profile details derived from the active session token.
*   **Method**: `GET`
*   **URL**: `{{base_url}}/api/auth/me`
*   **Headers**:
    *   `Authorization`: `Bearer {{jwt_token}}`
*   **Request Body**: None
*   **Expected Response** (`200 OK`):
    ```json
    {
      "user": {
        "user_id": 1,
        "name": "Admin User",
        "email": "admin@stocknest.com",
        "role": "Admin",
        "org_id": 1,
        "last_login": "2026-07-16T17:11:00Z",
        "created_at": "2026-07-16T16:47:00Z"
      }
    }
    ```

---

### 4. Get All Users (Organization List)
Fetches a list of all user records within the current user's organization. Restricted to roles with permission flags (`Admin` and `Manager`).
*   **Method**: `GET`
*   **URL**: `{{base_url}}/api/users`
*   **Headers**:
    *   `Authorization`: `Bearer {{jwt_token}}`
*   **Request Body**: None
*   **Expected Response** (`200 OK`):
    ```json
    {
      "success": true,
      "users": [
        {
          "user_id": 1,
          "org_id": 1,
          "email": "admin@stocknest.com",
          "name": "Admin User",
          "role": "Admin",
          "last_login": "2026-07-16T17:11:00Z",
          "created_at": "2026-07-16T16:47:00Z"
        },
        {
          "user_id": 2,
          "org_id": 1,
          "email": "anshikasehgal00@gmail.com",
          "name": "Anshika",
          "role": "Admin",
          "last_login": null,
          "created_at": "2026-07-16T16:49:00Z"
        }
      ]
    }
    ```
*   **Negative Test Response** (e.g. if logging in as `Staff` user and calling this API) (`403 Forbidden`):
    ```json
    {
      "success": false,
      "message": "Access denied. Insufficient permissions"
    }
    ```

---

### 5. Update User details (`/users/:id`)
Modifies the specified user record. 
*   *Security rules enforced*: Admins can modify any user profile and change roles; Non-admins can only modify their own name and email, and are barred from elevating their role.
*   **Method**: `PUT`
*   **URL**: `{{base_url}}/api/users/2` (Updates user with ID 2)
*   **Headers**:
    *   `Authorization`: `Bearer {{jwt_token}}`
*   **Request Body** (JSON):
    ```json
    {
      "name": "Anshika Sehgal",
      "email": "anshika@stocknest.com",
      "role": "Manager"
    }
    ```
*   **Expected Response** (`200 OK`):
    ```json
    {
      "success": true,
      "message": "User updated successfully.",
      "user": {
        "user_id": 2,
        "org_id": 1,
        "email": "anshika@stocknest.com",
        "name": "Anshika Sehgal",
        "role": "Manager",
        "last_login": null,
        "created_at": "2026-07-16T16:49:00Z"
      }
    }
    ```
