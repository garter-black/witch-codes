// witch.codes drop-box worker
// POST /api/drop  { email, message, hp, ts }
// - validates, rate-limits via KV counter, stores to KV, emails Hecate plain text
// - NEVER renders user input into any HTML anywhere. Zero injection surface.
// - email send via Resend REST from worker secret.

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const MAX_EMAIL = 200;
const MAX_MSG = 4000;
const RATE_LIMIT = 3; // per hour per IP

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}

function clean(s, max) {
  if (typeof s !== "string") return "";
  // strip control chars except \n \t; clamp length. No HTML entity encoding needed:
  // stored bytes are never rendered by us anywhere.
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max).trim();
}

async function readBody(request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try { return await request.json(); } catch { return {}; }
  }
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  const o = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/drop") {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "https://witch.codes",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
        },
      });
    }
    if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

    const body = await readBody(request);

    // honeypot: real users never fill this; bots that do get a fake success
    if (clean(body.hp, 50)) return json({ ok: true, queued: true });

    // timing trap: reject forged timestamps (ts=0 or future) that skip the 2s check.
    // real users: page loaded seconds-to-hours ago. window: [now-24h, now+5min].
    const ts = Number(body.ts);
    const now = Date.now();
    if (!Number.isFinite(ts) || ts < now - 86400000 || ts > now + 300000 || now - ts < 2000) {
      return json({ ok: true, queued: true });
    }

    const email = clean(body.email, MAX_EMAIL);
    const message = clean(body.message, MAX_MSG);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ ok: false, error: "A valid email is required. She reads everything." }, 400);
    }
    if (!message || message.length < 2) {
      return json({ ok: false, error: "Write her something first." }, 400);
    }

    // rate limit per IP: 3/hour, sliding hour bucket in KV
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const hourKey = `drop:rl:${ip}:${Math.floor(Date.now() / 3600000)}`;
    const count = Number((await env.DROPS.get(hourKey)) || 0);
    if (count >= RATE_LIMIT) {
      return json({ ok: false, error: "Too many messages this hour. She will still be here." }, 429);
    }
    await env.DROPS.put(hourKey, String(count + 1), { expirationTtl: 4000 });

    // store: append-only JSONL blob per day, no public route ever reads these
    const day = new Date().toISOString().slice(0, 10);
    const rec = {
      at: new Date().toISOString(),
      ip: ip.slice(0, 40),
      email,
      message,
    };
    const storeKey = `drops/${day}.jsonl`;
    const prev = (await env.DROPS.get(storeKey)) || "";
    const lines = prev ? prev.split("\n").filter(Boolean) : [];
    lines.push(JSON.stringify(rec));
    await env.DROPS.put(storeKey, lines.slice(-500).join("\n")); // cap 500/day, hard ceiling

    // notify Hecate: plain text only, values sent as data (no HTML part at all)
    if (env.RESEND_KEY) {
      const text =
        `new drop on witch.codes\n` +
        `at:    ${rec.at}\n` +
        `from:  ${email}\n` +
        `ip:    ${rec.ip}\n` +
        `----\n${message}\n----\n` +
        `reply directly to: ${email}\n`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: "Witch.Codes Drops <drops@witch.codes>",
          to: ["hecate@witch.codes"],
          reply_to: email,
          subject: `drop from ${email}`,
          text,
        }),
      }).catch(() => {});
    }

    return json({ ok: true, queued: true });
  }

    // legacy subdomain plates: selene/hera serve their prefixed directories
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let prefix = null;
    if (host === 'selene.witch.codes') prefix = '/selene';
    else if (host === 'hera.witch.codes') prefix = '/hera';
    if (prefix) {
      const path = url.pathname === '/' ? prefix + '/index.html' : prefix + url.pathname;
      return env.ASSETS.fetch(new Request(url.origin + path + url.search, request));
    }
    // everything else: static assets
    return env.ASSETS.fetch(request);
  },
};
