# STEP 1 — SUPPORTFLOW AUTHENTICATION

We are building the **SupportFlow** hackathon project.

IMPORTANT: For this step, implement ONLY the authentication and authorization foundation.

DO NOT build:

* Ticket system
* Customer dashboard
* Agent dashboard
* Admin dashboard UI
* AI integration
* Socket.IO
* Chat
* Landing page
* Statistics
* Any unnecessary features

We will build those in later steps.

## EXISTING PROJECT

This project already has authentication code that was completed previously.

FIRST inspect the entire existing codebase and understand the current authentication implementation.

Do NOT blindly rewrite existing authentication.

Reuse working code wherever possible.

If something is already correctly implemented, keep it.

---

# AUTHENTICATION REQUIREMENT

Implement role-based authentication with these roles:

* customer
* admin

Structure the authentication so that an `agent` role can easily be added later.

The existing authentication must continue working.

---

# USER MODEL

Inspect the existing User model.

If a role field does not exist, add:

role: "customer" | "admin"

Default role:

customer

Do not create multiple unnecessary user models.

Keep one User model with role-based authorization.

---

# REGISTER

Create/maintain a registration system.

Customer registration should collect the required existing fields such as:

* name
* email
* password

New users should automatically receive:

role = customer

A normal user must NOT be able to register themselves as admin.

Admin role must only be assigned securely from the backend/database.

---

# LOGIN

Implement login for both:

Customer
Admin

Login should:

1. Validate email/password.
2. Verify the user exists.
3. Verify password securely.
4. Generate the existing authentication token/session.
5. Return the authenticated user's safe information including role.
6. Never return the password.

Example response concept:

{
user: {
id,
name,
email,
role
},
token
}

Use the project's existing authentication mechanism if it is already working.

---

# BACKEND AUTHORIZATION

Authentication is NOT enough.

Implement backend middleware for:

* authenticateUser
* requireRole

Example behavior:

authenticateUser:
Only authenticated users can access protected routes.

requireRole("admin"):
Only admin users can access admin routes.

requireRole("customer"):
Only customer users can access customer routes.

Prepare the middleware so later we can use:

requireRole("agent")

without rewriting the authorization system.

---

# PROTECTED ROUTES

Create simple test/protected routes to verify authorization.

Example:

GET /api/auth/me

Returns the currently authenticated user's safe information.

Example:

GET /api/admin/test

Accessible only to authenticated admin users.

Example:

GET /api/customer/test

Accessible only to authenticated customer users.

These are temporary verification routes and can later be replaced by actual dashboard routes.

---

# FRONTEND AUTH STATE

Inspect the current frontend architecture.

Maintain authentication state properly.

The frontend should know:

* user
* role
* authentication status

Do not duplicate authentication logic unnecessarily.

Create/reuse an AuthContext or existing auth state solution if appropriate.

---

# PROTECTED FRONTEND ROUTES

Implement route protection.

Customer-only pages must require:

role === "customer"

Admin-only pages must require:

role === "admin"

Unauthenticated users should be redirected to Login.

Customers must not be able to access admin pages by manually typing the URL.

Admins must not be treated as customers.

IMPORTANT:

Frontend protection is only for UX.

Real authorization MUST remain on the backend.

---

# LOGOUT

Implement logout using the project's existing authentication strategy.

After logout:

* remove/clear authentication state
* remove/clear token if applicable
* redirect to login
* prevent access to protected pages

---

# SECURITY

Make sure:

* Passwords are hashed.
* Passwords are never returned in API responses.
* Admin role cannot be selected during normal registration.
* Protected backend routes require authentication.
* Role authorization is enforced on the backend.
* Invalid/expired tokens are handled.
* Unauthorized requests return appropriate HTTP status codes.
* Environment secrets are not hardcoded.
* Existing `.env` structure is preserved.

---

# ERROR HANDLING

Handle:

* invalid email
* invalid password
* missing credentials
* duplicate registration
* invalid token
* expired token
* unauthorized role
* non-existent user

Provide clear frontend error messages.

---

# AUTH TEST CHECKLIST

After implementation, test ALL of these:

1. Register customer.
2. Customer receives role = customer.
3. Customer can login.
4. Customer can access customer protected route.
5. Customer cannot access admin protected route.
6. Create/verify an admin user securely.
7. Admin can login.
8. Admin can access admin protected route.
9. Admin cannot access customer-only route if the route is role-restricted.
10. Logout works.
11. Invalid credentials fail.
12. Protected API without token fails.
13. Invalid/expired token fails.
14. Password is never exposed in API response.

---

# IMPORTANT IMPLEMENTATION RULE

Before modifying code:

1. Inspect the existing authentication.
2. Identify frontend and backend auth files.
3. Identify User model.
4. Identify existing login/register APIs.
5. Identify token/session mechanism.
6. Reuse existing code where possible.
7. Make the minimum required changes.

After implementation:

* Run the project.
* Fix all compile errors.
* Fix all lint errors that prevent the project from running.
* Verify backend starts.
* Verify frontend starts.
* Verify customer registration.
* Verify customer login.
* Verify admin login.
* Verify role-based protected routes.


STOP after authentication is working.

Do not proceed to tickets or dashboards yet.

At the end, give me a concise report containing:

1. Files created
2. Files modified
3. Existing authentication reused
4. Customer authentication status
5. Admin authentication status
6. Role authorization status
7. Any remaining issue
