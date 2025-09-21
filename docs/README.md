# Documentation

This directory contains detailed documentation for the Savage Pathfinder MCP Server.

## 📚 Available Documentation

### [Technical Specification](spec.md)

Complete technical specification for developers, including:

- Architecture overview and design decisions
- Database schema and domain model
- MCP protocol implementation details
- API reference and examples
- Security and deployment guidelines

### [Security Guide](security.md)

Security implementation details:

- Authentication and authorization
- Rate limiting and input validation
- Security headers and CORS configuration
- Monitoring and incident response

### [Cursor Integration](cursor-setup.md)

Step-by-step guide for integrating with Cursor IDE:

- MCP server configuration
- Authentication setup
- Example usage and troubleshooting

## 🎯 Quick Reference

### Essential Commands

```bash
# Development
npm run dev

# Testing
npm test
npm run test:coverage

# Deployment
npm run deploy
npm run db:migrate

# MCP Server
npm run mcp
npm run mcp:dev
```

### Key Configuration Files

- `wrangler.toml` - Cloudflare Workers configuration
- `mcp-client-config.json` - MCP client configuration
- `cursor-mcp-server.json` - Cursor IDE configuration

### Important URLs

- **Health Check**: `https://your-worker.workers.dev/healthz`
- **MCP Manifest**: `https://your-worker.workers.dev/mcp/manifest`
- **API Documentation**: See [Technical Specification](spec.md#api-reference)

## 🔧 Development Workflow

1. **Setup**: Follow the main [README](../README.md#quick-start)
2. **Development**: Use `npm run dev` for local development
3. **Testing**: Run `npm test` before committing
4. **Deployment**: Use `npm run deploy` to deploy to Cloudflare
5. **MCP Integration**: Configure your MCP client using the provided configs

## 📞 Support

For questions or issues:

- Check the [Technical Specification](spec.md) for detailed information
- Review the [Security Guide](security.md) for authentication issues
- See [Cursor Integration](cursor-setup.md) for setup problems
- Create an issue on GitHub for bugs or feature requests
