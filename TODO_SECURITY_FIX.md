# Security Fixes TODO List

## Priority 1: Critical Fixes
- [ ] 1. Remove hardcoded credentials from properties.json
- [ ] 2. Fix login API to use hashed passwords (bcrypt)
- [ ] 3. Add authentication middleware to protect API routes
- [ ] 4. Remove demo credentials from login page

## Priority 2: Session Management
- [ ] 5. Replace localStorage with secure HTTP-only cookies
- [ ] 6. Add session expiration

## Implementation Steps:
1. Install bcryptjs package
2. Create auth middleware utility
3. Update login API with password hashing
4. Protect all API routes
5. Update frontend to use cookies
6. Remove sensitive data from properties.json
