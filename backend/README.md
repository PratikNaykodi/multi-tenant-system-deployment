# Multi-Tenant Backend - MVC + Service + Repository

Built for the existing frontend API contract.

## Architecture
Route -> Middleware -> Controller -> Service -> Repository -> Prisma -> PostgreSQL

## Modules
- Auth
- Tenant
- User
- Appointment
- Role
- Employee compatibility module

## Appointment example
controllers/Appointment/appointmentController.js
services/Appointment/appointmentService.js
repositories/Appointment/appointmentRepository.js

## Prisma
Prisma 7.10.0

Two generated clients are used:
- central: Tenant model
- tenant: users/roles/permissions/role_permissions/providers/patients/appointments

## Existing API base
Local: http://localhost:5000/api
Production: https://multi-tenant-backend-z8g5.onrender.com/api

Header:
x-tenant-id: bb

Auth:
Authorization: Bearer <token>

See docs/DEBUG_FLOW.txt and docs/SETUP_STEPS.txt.
