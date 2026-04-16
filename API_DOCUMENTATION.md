# API Documentation

This document describes the active backend API mounted by `backend/src/server.js`.

Base URL in local development:

- `http://localhost:5000`

API prefix:

- Most endpoints are under `/api`
- A few routers are mounted under scoped prefixes like `/api/adoptions`, `/api/notifications`, `/api/volunteers`, `/api/verifications`, and `/api/vets`

## Conventions

### Authentication

Authenticated endpoints require:

```http
Authorization: Bearer <jwt>
```

Common auth/role behavior:

- `401` for missing or invalid token
- `403` for valid token without the required role

### Content type

Most write endpoints use:

```http
Content-Type: application/json
```

### Error shape

Most handled backend errors return:

```json
{
  "error": "HttpError",
  "message": "Human readable message",
  "details": null
}
```

Validation errors return:

```json
{
  "error": "ValidationError",
  "message": "Invalid request",
  "details": {}
}
```

## Root / Health

### `GET /`

Basic root endpoint.

Response:

```json
{
  "ok": true,
  "service": "rescue-roots-nepal-backend"
}
```

### `GET /api/health`

Health check endpoint.

Auth:

- Public

Response:

```json
{
  "ok": true
}
```

## Auth

### `POST /api/auth/register`

Register a new account.

Auth:

- Public

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "adopter",
  "phone": "9800000000",
  "organization": "Optional org",
  "verificationDocument": "data:image/png;base64,..."
}
```

Notes:

- `role` is optional and defaults to `public`
- `adopter` and `volunteer` use email OTP verification
- `ngo_admin` and `veterinarian` use document verification
- `verificationDocument` is only required for `ngo_admin` and `veterinarian`

Possible responses:

For `adopter` / `volunteer`:

```json
{
  "requiresOtp": true,
  "email": "user@example.com",
  "message": "We sent a 6-digit OTP to your email. Enter it to complete registration."
}
```

For roles without OTP or admin verification:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "public",
    "createdAt": "2026-04-16T00:00:00.000Z"
  }
}
```

For `ngo_admin` / `veterinarian`:

```json
{
  "user": {
    "id": "uuid",
    "email": "ngo@example.com",
    "name": "NGO Name",
    "role": "ngo_admin",
    "verificationStatus": "pending",
    "createdAt": "2026-04-16T00:00:00.000Z"
  },
  "message": "Registration successful. Your account is pending verification. You will be notified via email once approved.",
  "requiresVerification": true
}
```

### `POST /api/auth/verify-registration-otp`

Complete registration for `adopter` / `volunteer`.

Auth:

- Public

Request body:

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Response:

```json
{
  "message": "Registration completed successfully. Please login to continue."
}
```

### `POST /api/auth/resend-registration-otp`

Resend signup OTP for a pending `adopter` / `volunteer` registration.

Auth:

- Public

Request body:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "message": "OTP sent again"
}
```

### `POST /api/auth/login`

Login endpoint.

Auth:

- Public

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "adopter",
    "avatar": "https://...",
    "phone": "9800000000",
    "organization": "Optional org",
    "createdAt": "2026-04-16T00:00:00.000Z"
  }
}
```

Notes:

- `ngo_admin` and `veterinarian` are blocked until verification is approved

### `POST /api/auth/forgot-password`

Send password reset OTP.

Auth:

- Public

Request body:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "message": "If an account with that email exists, a password reset OTP has been sent."
}
```

### `POST /api/auth/reset-password`

Verify password reset OTP and set a new password.

Auth:

- Public

Request body:

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

Response:

```json
{
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

## Profile / Users

### `GET /api/profile`

Get current logged-in user profile.

Auth:

- Any logged-in user

Response:

```json
{
  "user": {}
}
```

### `PUT /api/profile`

Update current user profile.

Auth:

- Any logged-in user

Request body:

```json
{
  "name": "Updated Name",
  "phone": "9800000000",
  "organization": "Optional org",
  "avatar": "data:image/png;base64,...",
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

Response:

```json
{
  "user": {},
  "message": "Profile updated successfully"
}
```

### `GET /api/users/:id`

Get details of another user.

Auth:

- `ngo_admin`
- `superadmin`

Response:

```json
{
  "user": {}
}
```

## Reports

### `GET /api/reports/test`

Debug/test endpoint.

Auth:

- Public

### `POST /api/reports`

Submit a rescue report.

Auth:

- Public

Request body:

```json
{
  "description": "Dog is injured near the market area...",
  "urgency": "high",
  "reportedBy": "Reporter Name",
  "contactPhone": "9800000000",
  "location": {
    "lat": 28.2096,
    "lng": 83.9856,
    "address": "Pokhara, Kaski, Nepal",
    "district": "Kaski"
  },
  "photos": ["data:image/png;base64,..."]
}
```

Response:

```json
{
  "item": {
    "id": "uuid",
    "description": "Dog is injured near the market area...",
    "photos": ["https://..."],
    "location": {
      "lat": 28.2096,
      "lng": 83.9856,
      "address": "Pokhara, Kaski, Nepal",
      "district": "Kaski"
    },
    "status": "pending",
    "reportedBy": "Reporter Name",
    "reportedAt": "2026-04-16T00:00:00.000Z",
    "urgency": "high",
    "contactPhone": "9800000000",
    "assignedNgoId": "uuid",
    "assignedNgoName": "NGO Admin Name",
    "assignedNgoOrganization": "Organization Name"
  }
}
```

### `GET /api/reports`

Public list of recent reports.

Auth:

- Public

Response:

```json
{
  "items": []
}
```

### `GET /api/reports/my-tasks`

Reports assigned to the current volunteer.

Auth:

- `volunteer`

### `GET /api/reports/my-reports`

Reports created by the current user.

Auth:

- Logged-in users

### `GET /api/reports/all`

Admin/NGO report list.

Auth:

- `ngo_admin`
- `superadmin`

### `PATCH /api/reports/:id/status`

Update a report status.

Auth:

- `ngo_admin`
- `superadmin`

Request body:

```json
{
  "status": "assigned"
}
```

Allowed values:

- `pending`
- `assigned`
- `in_progress`
- `completed`
- `cancelled`

Response:

```json
{
  "item": {}
}
```

Notes:

- NGO admins may implicitly claim a report when moving it into handled states
- Completed linked reports may update the linked dog to `adoptable`
- If already handled by another NGO, the backend can reject the change

### `DELETE /api/reports/:id`

Delete a report.

Auth:

- `ngo_admin`
- `superadmin`

Response:

```json
{
  "ok": true
}
```

### `POST /api/reports/:id/create-dog`

Create a dog record from a report.

Auth:

- `ngo_admin`
- `superadmin`

Response:

```json
{
  "item": {},
  "message": "Dog created successfully from report"
}
```

## Dogs

### `GET /api/dogs`

Public list of dogs.

Auth:

- Public

Query params:

- `status`
- `district`

### `GET /api/dogs/:id`

Get one dog by ID.

Auth:

- Public

Response:

```json
{
  "item": {}
}
```

### `GET /api/dogs/vet-stats`

Vet dashboard stats.

Auth:

- `veterinarian`
- `superadmin`

### `GET /api/dogs/for-vet`

Dogs assigned to the current vet.

Auth:

- `veterinarian`
- `superadmin`

### `POST /api/dogs`

Create a rescue dog / case.

Auth:

- `ngo_admin`
- `superadmin`

Request body:

```json
{
  "name": "Bruno",
  "breed": "Mixed",
  "estimatedAge": "2 years",
  "gender": "male",
  "size": "medium",
  "status": "reported",
  "description": "Recovered from rescue report",
  "rescueStory": "Found near bus park",
  "location": {
    "lat": 28.2096,
    "lng": 83.9856,
    "address": "Pokhara, Kaski, Nepal",
    "district": "Kaski"
  },
  "vaccinated": false,
  "sterilized": false,
  "medicalNotes": "Needs treatment",
  "photos": ["data:image/png;base64,..."]
}
```

Response:

```json
{
  "item": {}
}
```

### `PUT /api/dogs/:id`

Update a dog / rescue case.

Auth:

- `ngo_admin`
- `superadmin`

Body:

- Partial version of the create payload
- Also supports optional `vetId` and `treatmentStatus`

### `PATCH /api/dogs/:id/assign-vet`

Assign or unassign a veterinarian.

Auth:

- `ngo_admin`
- `superadmin`

Request body:

```json
{
  "vetId": "uuid-or-null"
}
```

Response:

```json
{
  "item": {}
}
```

### `PATCH /api/dogs/:id/treatment`

Update treatment status.

Auth:

- `veterinarian`
- `superadmin`

Request body:

```json
{
  "treatmentStatus": "in_progress"
}
```

Allowed values:

- `pending`
- `in_progress`
- `completed`

### `DELETE /api/dogs/:id`

Delete a dog.

Auth:

- `ngo_admin`
- `superadmin`

Response:

- `204 No Content`

## Adoptions

All endpoints below are mounted under `/api/adoptions`.

### `POST /api/adoptions/apply`

Submit an adoption application.

Auth:

- Logged-in users

Request body:

```json
{
  "dogId": "uuid",
  "applicantPhone": "9800000000",
  "homeType": "Apartment",
  "hasYard": false,
  "otherPets": "None",
  "experience": "Had dogs before",
  "reason": "I can provide a safe home"
}
```

Response:

```json
{
  "item": {},
  "message": "Application submitted successfully"
}
```

### `GET /api/adoptions/my`

Get current user’s adoption applications.

Auth:

- Logged-in users

### `GET /api/adoptions/ngo`

Get adoption applications relevant to the NGO.

Auth:

- `ngo_admin`
- `superadmin`

### `PATCH /api/adoptions/:id/status`

Update adoption application status.

Auth:

- `ngo_admin`
- `superadmin`

Request body:

```json
{
  "status": "approved",
  "notes": "Looks good"
}
```

Allowed values:

- `under_review`
- `approved`
- `rejected`

Response:

```json
{
  "ok": true
}
```

## Notifications

All endpoints below are mounted under `/api/notifications`.

### `GET /api/notifications`

Get current user notifications.

Auth:

- Logged-in users

### `PATCH /api/notifications/read-all`

Mark all notifications as read.

Auth:

- Logged-in users

Response:

```json
{
  "ok": true
}
```

### `DELETE /api/notifications`

Delete all notifications for the current user.

Auth:

- Logged-in users

### `PATCH /api/notifications/:id/read`

Mark one notification as read.

Auth:

- Logged-in users

## Volunteers

All endpoints below are mounted under `/api/volunteers`.

### `GET /api/volunteers`

List volunteers.

Auth:

- `superadmin`

### `GET /api/volunteers/:id`

Get one volunteer.

Auth:

- `superadmin`

### `POST /api/volunteers`

Create a volunteer account.

Auth:

- `superadmin`

### `PUT /api/volunteers/:id`

Update a volunteer account.

Auth:

- `superadmin`

### `DELETE /api/volunteers/:id`

Delete a volunteer account.

Auth:

- `superadmin`

Response:

- `204 No Content`

## Verifications

All endpoints below are mounted under `/api/verifications`.

### `GET /api/verifications/pending`

Get pending NGO/veterinarian verification requests.

Auth:

- `superadmin`

### `POST /api/verifications/:id/approve`

Approve NGO/veterinarian registration.

Auth:

- `superadmin`

Response:

```json
{
  "message": "User approved successfully"
}
```

### `POST /api/verifications/:id/reject`

Reject NGO/veterinarian registration.

Auth:

- `superadmin`

Request body:

```json
{
  "rejectionReason": "Missing or invalid document"
}
```

## Vets

All endpoints below are mounted under `/api/vets`.

### `GET /api/vets`

List approved veterinarians (plus some legacy unverified vet rows).

Auth:

- Public

Response:

```json
{
  "items": []
}
```

## Medical Records

### `GET /api/medical-records`

Get medical records for the current veterinarian.

Auth:

- `veterinarian`
- `superadmin`

Query params:

- `dogId` optional

### `GET /api/medical-records/dog/:dogId`

Get all records for one dog.

Auth:

- `veterinarian`
- `ngo_admin`
- `superadmin`

### `POST /api/medical-records`

Create a medical record.

Auth:

- `veterinarian`
- `superadmin`

Request body:

```json
{
  "dogId": "uuid",
  "recordType": "vaccination",
  "description": "Rabies vaccine administered",
  "medications": "Rabies Vaccine",
  "nextFollowUp": "2026-05-01"
}
```

Allowed `recordType` values:

- `vaccination`
- `sterilization`
- `treatment`
- `checkup`

Response:

```json
{
  "item": {}
}
```

Notes:

- Creating a record may also update dog fields like `vaccinated` or `sterilized`

## Donations

### `POST /api/donations/create-checkout`

Create a Stripe checkout session.

Auth:

- Public

Request body:

```json
{
  "amount": 25,
  "currency": "usd",
  "donorName": "Supporter",
  "donorEmail": "supporter@example.com",
  "message": "Keep up the good work"
}
```

Response:

```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### `GET /api/donations/success`

Verify a Stripe session and finalize donation success.

Auth:

- Public

Query params:

- `session_id`

Paid response:

```json
{
  "success": true,
  "message": "Donation completed successfully",
  "amount": 25,
  "currency": "usd"
}
```

Pending/unpaid response:

```json
{
  "success": false,
  "message": "Payment not completed"
}
```

### `GET /api/donations/stats`

Public donation summary.

Auth:

- Public

Response:

```json
{
  "stats": {
    "totalDonations": 12,
    "totalAmount": 450,
    "currency": "usd"
  }
}
```

## Main Object Shapes

### Dog

Typical dog objects include:

```json
{
  "id": "uuid",
  "name": "Bruno",
  "breed": "Mixed",
  "estimatedAge": "2 years",
  "gender": "male",
  "size": "medium",
  "status": "adoptable",
  "description": "Friendly rescue dog",
  "rescueStory": "Recovered from report",
  "photos": ["https://..."],
  "location": {
    "lat": 28.2096,
    "lng": 83.9856,
    "address": "Pokhara, Kaski, Nepal",
    "district": "Kaski"
  },
  "vaccinated": true,
  "sterilized": true,
  "medicalNotes": "Recovered well",
  "reportedAt": "2026-04-16T00:00:00.000Z",
  "rescuedAt": "2026-04-17T00:00:00.000Z",
  "adoptedAt": null,
  "adopterId": null,
  "vetId": "uuid",
  "treatmentStatus": "completed",
  "fromReport": {
    "reportId": "uuid",
    "reportedBy": "Volunteer Name",
    "reportedAt": "2026-04-16T00:00:00.000Z",
    "urgency": "high"
  }
}
```

### RescueReport

```json
{
  "id": "uuid",
  "description": "Dog is injured",
  "photos": ["https://..."],
  "location": {
    "lat": 28.2096,
    "lng": 83.9856,
    "address": "Pokhara, Kaski, Nepal",
    "district": "Kaski"
  },
  "status": "assigned",
  "reportedBy": "Volunteer Name",
  "reportedAt": "2026-04-16T00:00:00.000Z",
  "assignedTo": "uuid",
  "dogId": "uuid",
  "urgency": "high",
  "notes": "Optional notes",
  "contactPhone": "9800000000",
  "assignedNgoId": "uuid",
  "assignedNgoName": "NGO Admin Name",
  "assignedNgoOrganization": "Organization Name"
}
```

### AdoptionApplication

```json
{
  "id": "uuid",
  "dogId": "uuid",
  "applicantId": "uuid",
  "applicantName": "User Name",
  "applicantEmail": "user@example.com",
  "applicantPhone": "9800000000",
  "status": "pending",
  "homeType": "Apartment",
  "hasYard": false,
  "otherPets": "None",
  "experience": "Had dogs before",
  "reason": "I can provide a good home",
  "notes": null,
  "submittedAt": "2026-04-16T00:00:00.000Z"
}
```

### MedicalRecord

```json
{
  "id": "uuid",
  "dogId": "uuid",
  "dogName": "Bruno",
  "vetId": "uuid",
  "vetName": "Vet Name",
  "type": "vaccination",
  "description": "Rabies vaccine administered",
  "medications": ["Rabies Vaccine"],
  "nextFollowUp": "2026-05-01T00:00:00.000Z",
  "date": "2026-04-16T00:00:00.000Z"
}
```

### Notification

```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "New Adoption Application",
  "message": "User applied to adopt a dog.",
  "type": "info",
  "link": "/dashboard/adoptions",
  "read": false,
  "createdAt": "2026-04-16T00:00:00.000Z"
}
```

## Implementation Notes

- Active reports behavior comes from `backend/src/routes/reports.js`, not `reports_new.js`
- `reports_new.js` is present in the repo but is not mounted in `backend/src/server.js`
- `GET /api/reports` is public
- `GET /api/vets` may include legacy veterinarian rows without modern verification data
- Donation stats expose `totalDonations`, but current backend derives that from completed donations
- Some endpoints include best-effort side effects like notification emails or Cloudinary uploads

## Suggested Future Improvements

- Add OpenAPI / Swagger generation
- Standardize success response envelopes
- Add request/response examples for every endpoint with full field coverage
- Add explicit versioning, e.g. `/api/v1`
- Document role matrix in a separate auth/permissions page

