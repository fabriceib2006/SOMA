# Security Specification for SOMA

## 1. Data Invariants
- Modules belong to the user who created them (or are global for MVP).
- Topics belong to Modules.
- Users can only edit their own profile.

## 2. The "Dirty Dozen" Payloads (Examples)
1. { "name": "Hack", "email": "evil@evil.com", "role": "admin" } (Privilege Escalation)
2. { "name": "x".repeat(2000) } (Resource Poisoning)
3. { "moduleId": "bad", "name": "Topic", "masteryScore": 101 } (Value Poisoning)
4. { "name": "", "code": "CS101", "credits": 3, "importance": "high" } (Invalid Data)
...

## 3. The Test Runner (firestore.rules.test.ts)
(To be implemented in testing phase)
