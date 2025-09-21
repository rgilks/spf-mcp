# Security Guide

## 🔒 Authentication Required

The Savage Pathfinder MCP Server requires authentication for all game operations.

## 🛡️ Security Features

### JWT-Based Authentication

- **Required**: All MCP tool endpoints require valid JWT tokens
- **Roles**: `gm` (Game Master), `player`, `observer`
- **Expiration**: Tokens expire after 24 hours
- **Validation**: Cryptographic signature verification

### Role-Based Access Control (RBAC)

- **Game Master (GM)**: Full access to all operations
- **Player**: Limited to dice rolling and character actions
- **Observer**: Read-only access to game state

### Rate Limiting

- **Session Operations**: 10 requests per minute
- **Dice Rolling**: 50 requests per minute
- **Combat Actions**: 30 requests per minute
- **General API**: 100 requests per minute

### Input Validation & Sanitization

- **Zod Schemas**: All inputs validated against strict schemas
- **XSS Protection**: HTML/JavaScript injection prevention
- **SQL Injection**: Parameterized queries only
- **UUID Validation**: Strict format checking

### CORS Protection

- **Allowed Origins**: Cursor, localhost (dev only), specific domains
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Authorization, Content-Type, X-Session-ID, X-API-Key
- **Credentials**: Secure cookie handling

### Security Headers

- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Strict-Transport-Security**: HSTS for HTTPS
- **Content-Security-Policy**: Restrictive CSP
- **Referrer-Policy**: strict-origin-when-cross-origin

## 🔑 Getting Access

### Step 1: Generate API Key

Contact the server administrator to obtain your API key.

### Step 2: Generate JWT Token

```bash
curl -X POST https://spf-mcp.rob-gilks.workers.dev/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "role": "gm",
    "sessionId": "your-session-id",
    "apiKey": "your-api-key"
  }'
```

### Step 3: Use Token in Requests

```bash
curl -X POST https://spf-mcp.rob-gilks.workers.dev/mcp/tool/session.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"name": "My Game", "grid": {...}}'
```

## 🎮 Role Permissions

### Game Master (GM)

- ✅ Create/update/end sessions
- ✅ Start/manage combat
- ✅ Create/update all actors
- ✅ Roll dice for any purpose
- ✅ Access all game data

### Player

- ✅ Roll dice for their character
- ✅ Update their character stats
- ✅ Move their character
- ❌ Cannot create sessions
- ❌ Cannot manage combat
- ❌ Cannot access other players' data

### Observer

- ✅ View game state
- ✅ Read session information
- ❌ Cannot perform any actions
- ❌ Cannot modify data

## 🔐 Environment Variables

### Required for Production

```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production
API_KEY=your-api-key-for-mcp-clients
```

### Security Best Practices

1. **Change Default Secrets**: Never use default JWT secret or API key
2. **Rotate Keys**: Regularly rotate JWT secrets and API keys
3. **Monitor Usage**: Watch for unusual access patterns
4. **Rate Limiting**: Respect rate limits to avoid blocking
5. **Token Expiration**: Refresh tokens before they expire

## 🚨 Security Incidents

### If You Suspect a Breach

1. **Immediately rotate** JWT_SECRET and API_KEY
2. **Check logs** for unauthorized access
3. **Revoke** all existing tokens
4. **Contact** the server administrator

### Rate Limit Exceeded

- **Error**: `429 Too Many Requests`
- **Solution**: Wait for the rate limit window to reset
- **Prevention**: Implement client-side rate limiting

### Invalid Token

- **Error**: `401 Unauthorized`
- **Solution**: Generate a new token
- **Prevention**: Check token expiration before use

## 📊 Monitoring & Logging

### What's Logged

- Authentication attempts (success/failure)
- Rate limit violations
- Invalid input attempts
- Security policy violations

### What's NOT Logged

- JWT token contents
- API key values
- Sensitive game data
- Player personal information

## 🔧 Development vs Production

### Development

- CORS allows localhost
- Rate limits are relaxed
- Detailed error messages
- Debug logging enabled

### Production

- Strict CORS policies
- Enforced rate limits
- Generic error messages
- Minimal logging

## 📞 Support

For security questions or to report vulnerabilities:

- **Email**: security@example.com
- **GitHub**: Create a private security issue
- **Discord**: #security channel

---

**Remember: Security is everyone's responsibility. Keep your tokens safe and report suspicious activity immediately!** 🛡️
