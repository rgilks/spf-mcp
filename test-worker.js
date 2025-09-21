export default {
  async fetch() {
    return new globalThis.Response(
      JSON.stringify({
        status: 'ok',
        message: 'Test worker is running',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  },
};
