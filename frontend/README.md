# Multi-Tenant React Frontend

React + Vite tenant application for the existing Node.js multi-tenant API.

## Main features
- Tenant hostname detection
- Login and JWT session handling
- Dashboard layout matching the provided design
- Users CRUD
- Provider and Patient role-specific user forms
- Full user edit loading through GET /api/users/:id
- Appointments CRUD with provider/patient options
- Appointment pagination
- Socket.IO appointment refresh
- Employees CRUD
- Roles listing
- Profile page
- Permission-aware navigation
- SweetAlert2 confirmation dialogs and toast notifications
- Field-level validation inside modals
- API validation/conflict errors displayed inside the active modal
- No browser `window.confirm()` dialogs

## Install

```bash
npm install
npm run dev
```

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Tenant local host

Add this to Windows hosts:

```text
127.0.0.1 pratik
```

Then open:

```text
http://pratik:5173/login
```

The central host should use `/tenant/create`; tenant hosts use `/login` and `/dashboard`.

## User module

Create/Edit automatically switches the form according to the selected role:
- provider -> specialization, experience and provider phone
- patient -> date of birth, gender, patient phone and address

Edit first calls `GET /api/users/:id` to obtain the complete provider/patient relation before filling the modal.

## Appointment module

Create/Edit loads:
- `GET /api/appointments/options`

Then sends:
- `POST /api/appointments`
- `PUT /api/appointments/:id`

Required fields are validated in the modal before the request is sent.

## Production

Set:

```env
VITE_API_BASE_URL=https://multi-tenant-backend-z8g5.onrender.com/api
VITE_SOCKET_URL=https://multi-tenant-backend-z8g5.onrender.com
```

Then run:

```bash
npm run build
```

Deploy the generated `dist` folder as an SPA so direct tenant URLs rewrite to `index.html`.


### Role-specific appointment forms
The appointment form auto-selects and disables the signed-in provider's Provider field or the signed-in patient's Patient field. Provider and patient users see only their own matching appointments in the UI; patients do not see Delete. Admin/manager can select both fields. Role changes in the user modal reset all provider/patient-specific inputs. See `DEBUG_FLOW.txt` for the required matching backend ownership rules.


## Role-aware behavior in this update
- User role changes clear both Provider and Patient form sections so values from a previous role are never submitted accidentally.
- Appointment forms lock the provider selector for Provider accounts and lock the patient selector for Patient accounts.
- Provider and Patient appointment lists are filtered to their own profile IDs in the UI; enforce the same ownership rules in backend services/repositories.
- Patient accounts do not see the appointment Delete action.
- Roles page expands each role and displays its permission names using `GET /api/roles/:id`.

## v7 fixes (role forms, appointment IDs, Socket.IO)

- Switching between Provider and Patient clears both nested profile objects and legacy flat profile fields. Role-specific inputs are remounted to prevent stale values from reappearing.
- Appointment options are normalized because this backend returns `provider_id` and `patient_id` rather than always returning `id`. This fixes empty IDs being submitted from the dropdowns.
- Appointment page joins tenant/provider Socket.IO rooms and listens for create/update/delete events. To broadcast update/delete changes, apply the backend controller patch documented in `APPOINTMENT_SOCKET_PATCH.txt`.
- The `backend-patch/controllers/Appointment/appointmentController.js` patch preserves the existing appointment service methods and emits events to both old and new provider rooms if an appointment is reassigned.


## Role-based behavior in this version
- Admin: may create/edit/delete all user types, but cannot delete their own account or change their own role.
- Manager: the role selector offers Manager, Provider, and Patient. Managers can create those types and manage existing Provider/Patient users; they can edit their own profile but cannot delete themselves.
- Provider: appointment list is scoped to their appointments; provider selector is locked to their own provider profile.
- Patient: appointment list is scoped to their appointments; patient selector is locked to their own patient profile; delete action is hidden.
- Changing the selected user role clears both Provider and Patient form state so values cannot leak between role types.
- Role page loads each role's permissions from GET /api/roles/:id.
- Appointment Socket.IO events refresh the appointment list for clients subscribed to the affected provider room.

For server-side authorization, read BACKEND_PATCH_INSTALL.txt and apply the optional files under backend-patch to the matching backend paths after backing up your current files.

### Appointment access for provider and patient

The sidebar and route use role-aware appointment permissions so provider and patient
users can open the Appointments module. See `ROLE_APPOINTMENT_ACCESS_FIX.txt` and
`docs/sql/grant-appointment-permissions.sql` for the required per-tenant database
permission assignments if the backend returns 403.
