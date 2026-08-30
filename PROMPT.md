master propmt
# SUPPORTFLOW — HACKATHON IMPLEMENTATION

We already have a working authentication system in this project. DO NOT rebuild or replace the existing authentication unless necessary.

Continue building the existing project into the hackathon project:

**SupportFlow — AI-Assisted Customer Support Desk**

## IMPORTANT

This is NOT an e-commerce website.

Do not add products, shopping cart, checkout, orders, or e-commerce features.

The main goal is a functional customer-support ticket system.

Prioritize functionality over unnecessary animations or complexity.

---

# 1. EXISTING AUTHENTICATION

First inspect the existing project and understand:

* Authentication implementation
* User model
* Login/register flow
* JWT/session handling
* Existing protected routes
* Existing frontend auth state
* Existing backend structure
* Existing environment variables

Do not break the working authentication.

Extend the existing user system to support roles:

* customer
* agent
* admin

If the existing user model already has a role field, reuse it.

If not, add a role field with a safe default of `customer`.

Implement proper role-based authorization on the backend.

---

# 2. APPLICATION FLOW

Build this flow:

Landing Page
↓
Login / Register
↓
Role-based Dashboard

Customer → Customer Dashboard

Agent → Agent Dashboard

Admin → Admin Dashboard

Protected routes must prevent unauthorized users from accessing another role's dashboard.

---

# 3. LANDING PAGE

Create a clean, modern, professional landing page for SupportFlow.

Do NOT make it an e-commerce page.

Hero:

SupportFlow

AI-Powered Customer Support Desk

"Submit. Triage. Resolve."

Buttons:

* Get Started
* Login

Feature sections:

* AI Ticket Triage
* Smart Ticket Management
* Real-Time Communication
* Support Analytics

Keep the landing page polished but simple.

Do not spend excessive time on animations.

Responsive on:

* desktop
* tablet
* mobile

---

# 4. CUSTOMER DASHBOARD

Create a customer dashboard.

Customer can:

1. Create a new support ticket
2. View only their own tickets
3. Open a ticket
4. View ticket status
5. View complete conversation history
6. Send messages to assigned agent

Ticket creation form:

* Subject
* Description
* Optional Category

After submission:

Generate a unique ticket number.

Example:

SF-2026-0001

Ticket status workflow:

New
→ Assigned
→ In Progress
→ Resolved

Show:

* Ticket number
* Subject
* Category
* Priority
* Status
* Created date
* Latest message

---

# 5. AI TICKET TRIAGE

This is a MANDATORY feature.

When a customer creates a ticket, send the ticket description to the backend AI service.

AI must suggest:

* Category
* Priority
* Short Summary

Example:

Customer says:

"I was charged twice for the same order and need one payment refunded."

AI suggestion:

Category: Billing
Priority: High
Summary: Possible duplicate payment reported by customer.

IMPORTANT:

AI result must NOT automatically become final without human review.

The Agent must be able to:

* Review AI category
* Edit category
* Review AI priority
* Edit priority
* Review AI summary
* Edit summary
* Approve/save the final values

If AI fails or times out:

The ticket must still be created and manually handled.

Implement proper error handling and fallback.

AI API key MUST remain on the backend/server environment.

Never expose AI keys in frontend code.

---

# 6. TICKET MODEL

Create a proper Ticket model.

Suggested fields:

* ticketNumber
* customer
* assignedAgent
* subject
* description
* category
* priority
* aiCategory
* aiPriority
* aiSummary
* aiReviewed
* status
* resolutionNote
* messages
* createdAt
* updatedAt

Use MongoDB with Mongoose if that matches the existing project.

Priority values:

* Low
* Medium
* High

Status values:

* New
* Assigned
* In Progress
* Resolved

Validate these values on the backend.

---

# 7. AGENT DASHBOARD

Create an Agent Dashboard.

Show:

* Total assigned tickets
* New tickets
* In Progress tickets
* High priority tickets
* Resolved tickets

Ticket table/list should show:

* Ticket number
* Customer
* Subject
* Category
* Priority
* Status
* Created date

Agent can open a ticket.

Inside ticket details show:

Customer issue

AI suggestions:

Category
Priority
Summary

Provide editable fields.

Agent can approve/edit the AI result.

---

# 8. AGENT REPLY

Agent must be able to reply to the customer.

Conversation should persist in MongoDB.

Each message should contain:

* sender
* message
* timestamp

Display the conversation similar to a support chat.

Customer and agent should be able to see previous messages.

---

# 9. STATUS MANAGEMENT

Agent can change:

New
→ Assigned
→ In Progress
→ Resolved

A resolved ticket cannot normally be changed unless it is reopened.

A ticket MUST NOT be marked Resolved unless a resolution/reply note is provided.

Add backend validation for this rule.

---

# 10. REAL-TIME FUNCTIONALITY

Implement at least one meaningful real-time feature using Socket.IO.

Preferred:

When Agent sends a message:

Customer receives it without refreshing.

Also implement real-time ticket status updates if practical.

Example:

Agent changes:

In Progress → Resolved

Customer dashboard should update automatically without manual refresh.

Do not fake realtime behavior.

Use Socket.IO properly with backend and frontend.

---

# 11. ADMIN DASHBOARD

Admin is optional for the core MVP but implement a simple dashboard if the core workflow is already stable.

Admin can see:

* Total tickets
* New tickets
* In Progress tickets
* Resolved tickets
* High priority tickets
* All tickets

Admin should NOT interfere with the main Customer → Agent workflow.

Keep this dashboard simple.

---

# 12. DASHBOARD STATISTICS

Statistics must come from actual database ticket data.

Do NOT hardcode numbers.

Show cards such as:

Total Tickets
Open Tickets
In Progress
Resolved
High Priority

Use real API data.

---

# 13. BACKEND API

Create clean REST APIs.

Suggested routes:

POST /api/tickets
GET /api/tickets
GET /api/tickets/:id
PATCH /api/tickets/:id
POST /api/tickets/:id/messages
POST /api/tickets/:id/triage

Create appropriate protected middleware.

Customer:

* Can create tickets
* Can view ONLY own tickets
* Can message own tickets

Agent:

* Can view assigned tickets
* Can update assigned tickets
* Can reply to assigned tickets

Admin:

* Can view all tickets

Never rely only on frontend role checks.

Authorization must be enforced on backend.

---

# 14. SECURITY

Make sure:

* JWT/session remains secure
* Protected APIs require authentication
* Role authorization is enforced
* Customers cannot access another customer's tickets
* Agents cannot update tickets assigned to another agent
* AI API key is backend-only
* Request validation exists
* Invalid ticket IDs are handled
* API errors return proper status codes
* Loading/error/success states exist

---

# 15. UI/UX

Use a professional SaaS support-dashboard design.

Suggested style:

* clean cards
* sidebar dashboard
* ticket status badges
* priority badges
* responsive tables
* modern forms
* chat/message interface
* empty states
* loading states
* error states
* success notifications

Keep the UI impressive but DO NOT sacrifice functionality for design.

---

# 16. DEMO FLOW

The final application MUST support this exact demonstration:

1. Customer logs in.
2. Customer creates a ticket.
3. AI analyzes the ticket.
4. AI suggests category, priority and summary.
5. Agent opens the ticket.
6. Agent reviews/edits the AI suggestions.
7. Ticket becomes visible to the agent.
8. Agent replies to customer.
9. Customer sees the message in real time.
10. Agent changes status.
11. Customer sees the status change in real time.
12. Agent adds resolution note.
13. Agent resolves the ticket.
14. Dashboard statistics update using actual ticket data.

---

# 17. IMPLEMENTATION RULE

Before changing anything:

1. Inspect the existing codebase.
2. Identify current authentication architecture.
3. Reuse existing components and utilities where possible.
4. Do not unnecessarily rewrite working code.
5. Identify missing backend/frontend pieces.
6. Implement the MVP incrementally.

After implementation:

* Fix TypeScript/JavaScript errors.
* Fix lint/build errors.
* Verify frontend starts.
* Verify backend starts.
* Verify API routes.
* Verify authentication.
* Verify role authorization.
* Verify ticket creation.
* Verify AI triage.
* Verify agent workflow.
* Verify messaging.
* Verify Socket.IO realtime behavior.

Do NOT stop at creating UI mockups.

The application must be functional end-to-end.

Focus on the mandatory hackathon requirements first.
Bonus features should only be added after the core workflow is working.

