export default {
  async fetch(request, env, ctx) {
    return new Response(
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
