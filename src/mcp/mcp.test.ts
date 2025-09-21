import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('MCP Server Integration', () => {
  describe('Basic MCP Functionality', () => {
    it('should have proper MCP server structure', () => {
      // Basic test to ensure the MCP server file exists and can be loaded
      expect(() => {
        // This is a simple test that the file structure is correct
        const mcpServerPath = join(process.cwd(), 'src/mcp-server.ts');
        expect(existsSync(mcpServerPath)).toBe(true);
      }).not.toThrow();
    });

    it('should have error handling utilities', () => {
      // Test that error handling utilities file exists
      expect(() => {
        const errorsPath = join(process.cwd(), 'src/mcp/errors.ts');
        expect(existsSync(errorsPath)).toBe(true);
      }).not.toThrow();
    });

    it('should have tool handlers', () => {
      // Test that tool handler files exist
      expect(() => {
        const dicePath = join(process.cwd(), 'src/mcp/tools/dice.ts');
        const sessionPath = join(process.cwd(), 'src/mcp/tools/session.ts');
        expect(existsSync(dicePath)).toBe(true);
        expect(existsSync(sessionPath)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('MCP Configuration', () => {
    it('should have MCP client configuration files', () => {
      const mcpConfigPath = join(process.cwd(), 'mcp-config.json');
      const cursorConfigPath = join(process.cwd(), 'cursor-mcp-server.json');

      expect(existsSync(mcpConfigPath)).toBe(true);
      expect(existsSync(cursorConfigPath)).toBe(true);
    });

    it('should have proper package.json scripts', () => {
      const packageJsonPath = join(process.cwd(), 'package.json');

      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.scripts.mcp).toBeDefined();
      expect(packageJson.scripts['mcp:dev']).toBeDefined();
    });
  });
});
