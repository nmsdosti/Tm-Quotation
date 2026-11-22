/**
 * Firestore Security Rules Specification & Verification Matrix
 * Maps each of the 12 adversarial payloads from security_spec.md to the
 * exact rule predicates enforced in firestore.rules.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED' | 'ALLOW';
  enforcedBy: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated Read/Write',
    targetPath: '/quotations/q_001',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isSignedIn() && isVerified()',
  },
  {
    id: 'DD-02',
    name: 'Unverified Email Admin Spoof',
    targetPath: '/quotations/q_001',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'request.auth.token.email_verified == true',
  },
  {
    id: 'DD-03',
    name: 'Cross-Owner Customer PII Read',
    targetPath: '/customers/cust_user_a',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'existing().ownerId == request.auth.uid || isAdmin()',
  },
  {
    id: 'DD-04',
    name: 'Cross-Owner Unfiltered List Scraping',
    targetPath: '/quotations',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'resource.data.ownerId == request.auth.uid',
  },
  {
    id: 'DD-05',
    name: 'Identity Spoofing on Create',
    targetPath: '/quotations/q_spoof',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'data.ownerId == request.auth.uid in isValidQuotation()',
  },
  {
    id: 'DD-06',
    name: 'Owner Hijack on Update',
    targetPath: '/customers/cust_user_a',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().ownerId == existing().ownerId',
  },
  {
    id: 'DD-07',
    name: 'Shadow / Ghost Field Injection',
    targetPath: '/quotations/q_001',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'data.keys().hasOnly([...]) && affectedKeys().hasOnly([...])',
  },
  {
    id: 'DD-08',
    name: 'Backdated Timestamp Tampering',
    targetPath: '/quotations/q_backdate',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
  {
    id: 'DD-09',
    name: 'Document ID Poisoning',
    targetPath: '/customers/bad$id*chars',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId(customerId)',
  },
  {
    id: 'DD-10',
    name: 'Value Poisoning & Size Overflow',
    targetPath: '/quotations/q_overflow',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isNonEmptyStringWithMax & bounded list sizes & isNonNegativeNumber',
  },
  {
    id: 'DD-11',
    name: 'Terminal State Modification by Non-Admin',
    targetPath: '/quotations/q_accepted',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    enforcedBy: "!(existing().status in ['Accepted', 'Rejected']) || isAdmin()",
  },
  {
    id: 'DD-12',
    name: 'Self-Assigned Admin Escalation',
    targetPath: '/admins/attacker_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'match /admins/{userId} { allow create, update, delete: if false; }',
  },
];
