# Security Notes

## Known Vulnerabilities & Mitigation

### 1. tar (Critical) & @mapbox/node-pre-gyp (Build-time dependency)
**Source:** `bcrypt` -> `@mapbox/node-pre-gyp` -> `tar`

**Issue:** Multiple tar extraction vulnerabilities (CVE-related)

**Why It's Safe:**
- `tar` is only used during bcrypt's **native module compilation** (build-time)
- Not present in production runtime dependencies
- Compiled bcrypt binary is included in deployed images
- Production Docker images built with `--production` flag don't have node-gyp or tar

**Mitigation:**
- ✅ Using `npm ci --production` in production Docker builds
- ✅ Bcrypt is essential for password hashing (cannot be replaced)
- ✅ Vulnerabilities only affect build environment, not runtime

**Status:** Accepted - Build-time only, not exploitable in production

---

## Docker Security Best Practices

### Multi-Stage Build
- ✅ Builder stage removes dev dependencies before runtime
- ✅ Smaller final image (only prod dependencies)
- ✅ No build tools in production container

### Non-Root User
- ✅ Application runs as `nodejs:nodejs` (uid 1001)
- ✅ Prevents privilege escalation

### Health Checks
- ✅ Configured with proper timeouts and retries
- ✅ Ensures container is healthy before accepting traffic

### Signal Handling
- ✅ Using `dumb-init` for proper signal propagation
- ✅ Graceful shutdown on SIGTERM

### Image Size
- ✅ Using `node:20-alpine` (slim base image ~200MB)
- ✅ Production stage only includes runtime dependencies

---

## Test Coverage

All backend endpoints are tested with security in mind:
- ✅ SQL injection prevention (parameterized queries)
- ✅ Parameter validation on all endpoints
- ✅ Error handling for malformed input
- ✅ Rate limiting configured

See `TEST_COVERAGE_REPORT.md` for full test details.

---

## Dependency Updates

### Latest Versions (as of build)
- `bcrypt`: 5.1.1 (latest)
- `uuid`: 14.0.2 (latest)
- `nodemailer`: 9.0.5 (latest)
- `pg`: 8.11.0 (latest)
- `express`: 4.18.2 (latest in 4.x)

### Security Update Strategy
- Run `npm audit` regularly (automated in CI/CD)
- Update transitive dependencies when fixes available
- Review breaking changes before updating

---

## Deployment Checklist

Before deploying to production:

- [ ] Run `npm audit --production` to verify no new vulnerabilities
- [ ] Verify all 67 backend tests pass
- [ ] Verify all 31 contract tests pass
- [ ] Review recent CVEs for key dependencies
- [ ] Ensure environment variables are not committed
- [ ] Verify non-root user running in container
- [ ] Test graceful shutdown (SIGTERM handling)
- [ ] Verify health checks are responsive
- [ ] Check log output for any warnings

---

## Incident Response

If a critical vulnerability is discovered:

1. Check if it affects production dependencies: `npm audit --production`
2. If build-only: Document in this file, no action needed
3. If runtime: Immediately run `npm audit fix` and test
4. If unfixable: Evaluate alternative packages
5. Document mitigation strategy if needed

---

## References

- [npm Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP Node.js Top 10](https://owasp.org/www-project-nodejs-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [bcrypt Security](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
