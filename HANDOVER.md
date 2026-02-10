# Status Handover: Installation Automation & Test Data
**Date**: 2026-02-10
**Feature**: Admin Setup / Installation Mode

## Current State
We are building an "Installation Mode" in the Admin Panel to automatically set up the Taufmanager environment (Groups, Calendar, Fields) and provision test data.

### ✅ What Works
- **Group Creation**: The `POST /groups` call now works correctly.
  - Fix Details: Added `campusId: 0` and `force: true` to the payload.
  - Verified: User logs showed groups being created successfully.
- **UI**: The Admin Panel (`Admin.vue`) has a "Big Red Button" for installation and a status dashboard.
- **Profile Switching**: Toggling between "Development" and "End-User" profiles works (updates `kv-store`).

### ⚠️ Pending Verification (The "Stop" Point)
- **Calendar Creation**:
  - **Issue**: User reported the installer "hangs" at the calendar creation step.
  - **Potential Fix**: I identified that `sortKey` is a required field in `swagger.json` but was missing. I have updated `SetupService.ts` to include `sortKey: 0`.
  - **Status**: **UNVERIFIED**. The fix is in the code, but we haven't run it yet.
- **Test Appointments**:
  - I implemented `createTestAppointments` and `deleteTestAppointments` in `SetupService.ts`.
  - Added buttons to `Admin.vue`.
  - **Status**: Untested. Needs to be checked once Calendar creation works.

## Next Steps (How to Resume)
1. **Reload the App**: Ensure the latest code (with `sortKey` fix) is running.
2. **Click "JETZT INSTALLIEREN"**:
    - **Expected**: The spinner should finish, and "Kalender: Taufmanager_test" should get a green checkmark.
    - **If it hangs**: Check the Console for 400/500 errors on `POST /calendars`.
3. **Test Appointments**:
    - If installation succeeds, click "TERMINE ERSTELLEN" in the new maintenance card.
    - Verify in ChurchTools Web UI that "Taufseminar" and "Taufgottesdienst" appear.

## Modified Files
- `src/services/SetupService.ts`: Added `sortKey` to calendar, added appointment methods.
- `src/components/Admin.vue`: Added Test Appointment UI buttons.

## Environment Re-Entry
- Run `npm run dev`
- Log in to Taufmanager
- Go to `/admin`
- Ensure "End-User" profile is selected (if testing the automation).
