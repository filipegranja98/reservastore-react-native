import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApiClient,
  ApiError,
  normalizeBase,
  type TokenVault,
} from "../src/api";
import type { Tokens } from "../src/types";
const original = { access: "access-old", refresh: "refresh-old" };
const rotated = { access: "access-new", refresh: "refresh-new" };
function vault(initial: Tokens | null = original) {
  let stored = initial;
  return {
    read: async () => stored,
    write: async (value: Tokens | null) => {
      stored = value;
    },
    get: () => stored,
  };
}
function json(data: unknown, status = 200) {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    status,
  });
}
function transport(
  handler: (path: string, init: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (url, init) =>
    handler(
      String(url).replace("http://localhost:8000/api/", ""),
      init!,
    )) as typeof fetch;
}
const base = "http://localhost:8000/api/";
test("normalizes API base and rejects credentials, missing URL and non-HTTP schemes", () => {
  assert.equal(normalizeBase(base.slice(0, -1)), base);
  for (const input of [
    "",
    "file:///a",
    "https://user:secret@example.test/api/",
    "https://example.test/api/?q=1",
  ])
    assert.throws(() => normalizeBase(input));
});
test("public catalog never receives bearer credentials and keeps pagination", async () => {
  const client = new ApiClient(
    base,
    vault(),
    transport((path, init) => {
      assert.equal(path, "catalogo/lojas/?page=1&page_size=20");
      assert.equal(
        (init.headers as Record<string, string>).Authorization,
        undefined,
      );
      return json({ count: 0, next: null, previous: null, results: [] });
    }),
  );
  await client.restore();
  assert.deepEqual(
    await client.publicRequest("catalogo/lojas/?page=1&page_size=20"),
    { count: 0, next: null, previous: null, results: [] },
  );
  await assert.rejects(client.request("https://other.test/"), /inválido/);
});
test("concurrent expired requests rotate only once and persist both tokens", async () => {
  let refreshes = 0;
  const store = vault();
  const client = new ApiClient(
    base,
    store,
    transport(async (path, init) => {
      if (path === "token/refresh/") {
        refreshes++;
        assert.deepEqual(JSON.parse(init.body as string), {
          refresh: original.refresh,
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        return json(rotated);
      }
      return (init.headers as Record<string, string>).Authorization ===
        "Bearer access-new"
        ? json({ id: 1 })
        : json({ detail: "expired" }, 401);
    }),
  );
  await client.restore();
  const values = await Promise.all([
    client.request("conta/"),
    client.request("conta/"),
    client.request("conta/"),
  ]);
  assert.equal(values.length, 3);
  assert.equal(refreshes, 1);
  assert.deepEqual(store.get(), rotated);
});
test("rejected refresh clears local session and notifies UI", async () => {
  const store = vault();
  let expired = 0;
  const client = new ApiClient(
    base,
    store,
    transport(() => json({ detail: "expired" }, 401)),
  );
  client.onExpired = () => expired++;
  await client.restore();
  await assert.rejects(
    client.request("conta/"),
    (e: ApiError) => e.status === 401,
  );
  assert.equal(store.get(), null);
  assert.equal(expired, 1);
});
test("offline refresh preserves tokens so user can retry", async () => {
  const store = vault();
  const client = new ApiClient(
    base,
    store,
    transport((path) => {
      if (path === "token/refresh/") throw new TypeError("network");
      return json({}, 401);
    }),
  );
  await client.restore();
  await assert.rejects(client.request("conta/"), /Sem conexão/);
  assert.deepEqual(store.get(), original);
});
test("logout after expired access revokes the rotated refresh, then clears storage", async () => {
  const store = vault();
  let revoked = false;
  const client = new ApiClient(
    base,
    store,
    transport((path, init) => {
      if (path === "token/refresh/") return json(rotated);
      if (path === "token/logout/") {
        assert.deepEqual(JSON.parse(init.body as string), {
          refresh_token: rotated.refresh,
        });
        assert.equal(
          (init.headers as Record<string, string>).Authorization,
          "Bearer access-new",
        );
        revoked = true;
        return json(undefined, 205);
      }
      return (init.headers as Record<string, string>).Authorization ===
        "Bearer access-new"
        ? json({ id: 1 })
        : json({}, 401);
    }),
  );
  await client.restore();
  assert.equal(await client.logout(), true);
  assert.equal(revoked, true);
  assert.equal(store.get(), null);
});
test("offline logout deletes native credentials and reports unconfirmed revocation", async () => {
  const store = vault();
  const client = new ApiClient(
    base,
    store,
    transport(() => {
      throw new TypeError("network");
    }),
  );
  await client.restore();
  assert.equal(await client.logout(), false);
  assert.equal(store.get(), null);
  await assert.rejects(
    client.request("conta/"),
    (e: ApiError) => e.status === 401,
  );
});
test("clear during refresh cannot resurrect tokens", async () => {
  const store = vault();
  let release: () => void = () => {};
  let started: () => void = () => {};
  const ready = new Promise<void>((resolve) => (started = resolve));
  const client = new ApiClient(
    base,
    store,
    transport(async (path) => {
      if (path === "token/refresh/") {
        started();
        await new Promise<void>((resolve) => (release = resolve));
        return json(rotated);
      }
      return json({}, 401);
    }),
  );
  await client.restore();
  const request = client.request("conta/");
  await ready;
  await client.clear();
  release();
  await assert.rejects(request);
  assert.equal(store.get(), null);
});
test("registration forcibly selects cliente even with unexpected runtime properties", async () => {
  const client = new ApiClient(
    base,
    vault(null),
    transport((path, init) => {
      assert.equal(path, "auth/cadastro/");
      assert.equal(JSON.parse(init.body as string).papel, "cliente");
      return json({ id: 1 }, 201);
    }),
  );
  await client.register({
    username: "synthetic",
    password: "test-only",
    first_name: "Synthetic",
    email: "test@example.test",
    telefone: "000",
    ...{ papel: "administrador" },
  });
});
test("validation and throttling are surfaced without printing response secrets", async () => {
  const client = new ApiClient(
    base,
    vault(null),
    transport(() => json({ password: ["Senha curta."] }, 400)),
  );
  await assert.rejects(client.login("test", "x"), /Senha: Senha curta/);
  const rate = new ApiClient(
    base,
    vault(null),
    transport(() => json({}, 429)),
  );
  await assert.rejects(rate.login("test", "x"), /Muitas tentativas/);
});
test("storage write failure blocks successful login", async () => {
  const broken: TokenVault = {
    read: async () => null,
    write: async () => {
      throw Error("disk");
    },
  };
  const client = new ApiClient(
    base,
    broken,
    transport(() => json(original)),
  );
  await assert.rejects(client.login("test", "x"), /guardar a sessão/);
  await assert.rejects(
    client.request("conta/"),
    (e: ApiError) => e.status === 401,
  );
});

test('release configuration refuses HTTP before sending credentials', async () => {
  let sent = false;
  const client = new ApiClient(base, vault(null), transport(() => { sent = true; return json(original); }), true);
  await assert.rejects(client.login('test', 'test-only'), /HTTPS/);
  assert.equal(sent, false);
});

test("authenticated multipart preserves binary body and lets fetch set the boundary",async()=>{
 const form=new FormData();form.append("nome","Produto");form.append("imagem",new Blob(["image"],{type:"image/png"}),"produto.png");
 const client=new ApiClient(base,vault(),transport((path,init)=>{
   assert.equal(path,"produtos/");assert.equal(init.body,form);
   assert.equal((init.headers as Record<string,string>)["Content-Type"],undefined);
   assert.equal((init.headers as Record<string,string>).Authorization,"Bearer access-old");
   return json({id:1});
 }));
 await client.restore();await client.request("produtos/","POST",form);
});
