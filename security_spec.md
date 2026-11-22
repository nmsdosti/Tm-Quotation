# Security Specification — TM Quotation Manager

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `companySettings`, `customers`, `services`, and `quotations` belongs to a verified authenticated user (`ownerId == request.auth.uid`). No cross-user reads or writes are permitted.
2. **PII Protection**: Customer contact information (`email`, `phone`, `address`, `gstin`) and company contact records are strictly limited to the document owner (`existing().ownerId == request.auth.uid`) or verified admin (`isAdmin()`). Blanket `isSignedIn()` reads are prohibited.
3. **Temporal & Identity Immutability**: `createdAt` must equal `request.time` on creation and never change on update. `updatedAt` must equal `request.time` on create and update. `ownerId` is immutable after creation.
4. **Volumetric & Type Bounds**: Every string has an explicit `.size()` ceiling matching `firebase-blueprint.json`. Bounded arrays (`scopePoints <= 30`, `services <= 30`, `pricingItems <= 50`, `terms <= 40`) prevent payload exhaustion.
5. **Terminal Status Protection**: Quotations in terminal states (`Accepted` or `Rejected`) cannot be modified by standard users; only a verified admin (`isAdmin()`) can correct or override terminal quotation states.
6. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
7. **Admin Registry Protection**: `/admins/{userId}` is read-only for the matching user and non-writable from client SDKs to prevent privilege escalation.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Reading `/quotations` or creating a customer without `request.auth`. -> `PERMISSION_DENIED`
2. **Unverified Email Spoof**: Creating a quotation with `email == 'tmindustrialsolution@gmail.com'` when `email_verified == false`. -> `PERMISSION_DENIED`
3. **Cross-Owner PII Read**: Authenticated User B attempting `get` on User A's customer document `/customers/cust_a`. -> `PERMISSION_DENIED`
4. **Cross-Owner List Scraping**: Authenticated User B issuing an unfiltered `list` query on `/quotations` without `where('ownerId', '==', uid)`. -> `PERMISSION_DENIED`
5. **Identity Spoofing on Create**: User A creating a quotation with `ownerId: "user_b_uid"`. -> `PERMISSION_DENIED`
6. **Owner Hijack on Update**: User A updating their own customer to change `ownerId` to `"user_b_uid"`. -> `PERMISSION_DENIED`
7. **Shadow / Ghost Field Injection**: Creating or updating a quotation with an unlisted field `{ "isApprovedByAdmin": true }`. -> `PERMISSION_DENIED`
8. **Backdated Timestamp Tampering**: Creating a quotation with `createdAt` set to a client-chosen past timestamp instead of `request.time`. -> `PERMISSION_DENIED`
9. **ID Poisoning**: Creating `/customers/invalid$id!with*badchars` or a 200-character document ID. -> `PERMISSION_DENIED`
10. **Value Poisoning / Size Overflow**: Setting `subject` to a 500-character string or `pricingItems` to 100 items or `grandTotal` to a negative number. -> `PERMISSION_DENIED`
11. **Terminal State Violation**: Standard user updating a quotation whose existing `status` is `'Accepted'` or `'Rejected'`. -> `PERMISSION_DENIED`
12. **Self-Assigned Admin Escalation**: Authenticated user attempting to write `/admins/{theirUid}`. -> `PERMISSION_DENIED`
