# Security Policy

## 🔒 Reporting a Vulnerability

If you discover a security vulnerability in Denta CRM, please help us maintain the security of our users by reporting it responsibly.

### How to Report

**Please DO NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report security issues via email to: **[your-email@example.com]**

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Best effort

---

## 🛡️ Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | ✅ Yes             |
| 1.x     | ❌ No longer supported |

---

## 🔐 Security Measures

This project implements multiple layers of security:

- **Authentication**: Cryptographically signed tokens (HMAC-SHA256)
- **Database Security**: Row Level Security (RLS) in PostgreSQL
- **Password Hashing**: PBKDF2 with salt
- **Secure Cookies**: HttpOnly, Secure (in production), SameSite
- **Environment Variables**: All secrets stored securely

---

## ⚠️ Security Best Practices for Deployment

### Required Environment Variables

Ensure these are set in your production environment (Vercel/etc):

```bash
# Required
ADMIN_PASSWORD=<strong-password>
AUTH_SECRET=<random-32-byte-string>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Security Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] `ADMIN_PASSWORD` is strong (16+ characters)
- [ ] `AUTH_SECRET` is randomly generated
- [ ] Row Level Security (RLS) is enabled in Supabase
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in Git history

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

---

## 🙏 Acknowledgments

We appreciate the security research community and will acknowledge researchers who responsibly disclose vulnerabilities (with their permission).

---

**Last Updated**: 2026-01-30
