export class CombatDO {
  state: DurableObjectState;
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }
  async fetch(_: Request) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  }
}
