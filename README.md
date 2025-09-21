# spf-mcp

Cloudflare Worker MCP server for Savage Pathfinder Voice GM.

## Dev

- `npm run dev` — local dev server
- `npm run db:migrate` — apply D1 schema
- `npm run deploy` — manual deploy

## Endpoints

- `GET /healthz` → ok
- `GET /mcp/manifest` → MCP tool/resource manifest (dice.roll for now)
- `POST /mcp/tool/dice.roll` → { formula:"2d6+1", explode:true, wildDie:null }

## Next

See `docs/spec.md` (add the full spec here). GPT-5 (Codex) will implement tools/resources and DO logic per spec.
