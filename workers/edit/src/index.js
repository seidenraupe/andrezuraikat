import { DurableObject } from "cloudflare:workers";
import { handleRequest } from "./api.js";

export class EditStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.tail = Promise.resolve();
  }

  fetch(request) {
    const run = this.tail.then(() => handleRequest(request, this.ctx.storage, this.env));
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

export default {
  async fetch(request, env) {
    if (!env.EDIT) {
      return new Response(JSON.stringify({ ok: false, error: "Speicher ist nicht verbunden." }), {
        status: 503,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    const stub = env.EDIT.get(env.EDIT.idFromName("redaktion"));
    return stub.fetch(request);
  },
};
