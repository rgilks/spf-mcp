import { McpError, McpErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class SpfMcpError extends McpError {
  constructor(code: McpErrorCode, message: string, data?: any) {
    super(code, message, data);
  }
}

export function handleMcpError(error: unknown): SpfMcpError {
  if (error instanceof SpfMcpError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('validation')) {
      return new SpfMcpError(McpErrorCode.InvalidParams, 'Validation failed', {
        originalError: error.message,
      });
    }

    if (error.message.includes('not found')) {
      return new SpfMcpError(McpErrorCode.InvalidParams, 'Resource not found', {
        originalError: error.message,
      });
    }

    if (error.message.includes('unauthorized')) {
      return new SpfMcpError(
        McpErrorCode.InvalidRequest,
        'Unauthorized access',
        { originalError: error.message },
      );
    }

    if (error.message.includes('rate limit')) {
      return new SpfMcpError(
        McpErrorCode.InvalidRequest,
        'Rate limit exceeded',
        { originalError: error.message },
      );
    }

    // Generic error
    return new SpfMcpError(
      McpErrorCode.InternalError,
      'Internal server error',
      { originalError: error.message },
    );
  }

  // Unknown error type
  return new SpfMcpError(McpErrorCode.InternalError, 'Unknown error occurred', {
    originalError: String(error),
  });
}

export function createMcpResponse(data: any, isError = false) {
  return {
    success: !isError,
    data: isError ? undefined : data,
    error: isError ? data : undefined,
    serverTs: new Date().toISOString(),
  };
}
