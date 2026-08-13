# Security Specification and Threat Model (TDD)

## 1. Data Invariants
- Each user is only allowed to access and modify documents inside `/users/{userId}`, where `{userId}` strictly equals `request.auth.uid`.
- Non-authenticated requests are blocked across the entire database by default.
- Users are strictly forbidden from creating, updating, reading, or deleting another authenticated user's metadata or sub-profiles.
- Creation of a user document or profile document must specify all required keys, with no unlisted properties allowed.
- Sub-profiles in `/users/{userId}/profiles/{profileId}` derive their authorization from the parent `userId` matching `request.auth.uid`.

---

## 2. The "Dirty Dozen" Threat Payloads

### Payload 1: Unauthenticated Read User Profile
- **Path**: `/users/user123`
- **Action**: GET
- **Auth**: None
- **Objective**: Unauthorized access to user metadata.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Unauthenticated Create User Profile
- **Path**: `/users/user123`
- **Action**: CREATE
- **Auth**: None
- **Payload**: `{"name": "Scammer", "email": "scam@evil.com", "activeProfileId": "default", "reminders": [], "createdAt": "2026-05-28"}`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Email Spoofing / Identity Hijacking
- **Path**: `/users/victim_uid`
- **Action**: CREATE / GET
- **Auth**: `request.auth.uid = "attacker_uid"`, `request.auth.token.email = "victim@gmail.com"`
- **Objective**: Accessing victim's data by claiming their email or path ID.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Arbitrary User Modification (Cross-Tenant Write)
- **Path**: `/users/victim_uid`
- **Action**: UPDATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: `{"name": "Hacked", "activeProfileId": "hacked"}`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Spoofed Owner Identity on Subcollection Creation
- **Path**: `/users/victim_uid/profiles/profile999`
- **Action**: CREATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: `{"id": "profile999", "name": "Fake Plan", "disciplines": []}`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Rogue Subcollection Read (Data Siphon)
- **Path**: `/users/victim_uid/profiles/pf_default`
- **Action**: GET / LIST
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Objective**: Fetching the complete study progress of another student.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Denial-of-Wallet (Large Payload Attack)
- **Path**: `/users/attacker_uid`
- **Action**: CREATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: User name representing a 200KB junk string.
- **Expected Outcome**: `PERMISSION_DENIED` (failed string size bounds)

### Payload 8: Update-Gap Omission (Schema Breaking)
- **Path**: `/users/attacker_uid`
- **Action**: CREATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: `{"name": "Valid Name"}` (Omitting `email`, `activeProfileId`, `reminders`, `createdAt`)
- **Expected Outcome**: `PERMISSION_DENIED` (Size mismatch, missing mandatory keys)

### Payload 9: Unassigned/Orphaned Profile Creation
- **Path**: `/users/attacker_uid/profiles/my_profile`
- **Action**: CREATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: `{"id": "different_id_than_path", "name": "Mismatch Plan"}`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: State Integrity Violation
- **Path**: `/users/victim_uid/profiles/profile1`
- **Action**: DELETE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Hostile Ghost-Field Injection
- **Path**: `/users/attacker_uid`
- **Action**: UPDATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: `{"name": "Updated", "isAdmin": true, "extraGhost": "unauthorized"}`
- **Expected Outcome**: `PERMISSION_DENIED` (affectedKeys contains forbidden elements)

### Payload 12: Invalid ID Path Characters (ID Poisoning)
- **Path**: `/users/attacker_uid/profiles/profile$$$evil`
- **Action**: CREATE
- **Auth**: `request.auth.uid = "attacker_uid"`
- **Payload**: `{"id": "profile$$$evil", "name": "Poison ID", "disciplines": [], ...}`
- **Expected Outcome**: `PERMISSION_DENIED`

---

## 3. Test Runner Definition (Logical Verification)
A unit test file `firestore.rules.test.ts` will verify that executing any of these payloads returns a rejection. Let's build the secure fortress rules in `firestore.rules` and test their validity.
