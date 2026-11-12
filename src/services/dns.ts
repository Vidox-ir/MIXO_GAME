import type { DNSRecord, DNSResult } from "../types";

const DNS_TYPES: Record<string, number> = { A: 1, AAAA: 28, MX: 15 };
type DNSAnswer = { type: string; value: string };

function buildQuery(domain: string, type: string) {
  const labels = domain.replace(/\.$/, "").split(".");
  if (!labels.length || labels.some(label => !label || label.length > 63)) throw new Error("دامنه معتبر نیست.");
  const encoded = labels.map(label => {
    const bytes = new TextEncoder().encode(label);
    return [bytes.length, ...bytes];
  }).flat();
  const id = new Uint8Array(2);
  crypto.getRandomValues(id);
  const qtype = DNS_TYPES[type];
  if (!qtype) throw new Error("نوع رکورد پشتیبانی نمی‌شود.");
  const packet = new Uint8Array(12 + encoded.length + 2 + 4);
  const view = new DataView(packet.buffer);
  view.setUint16(0, (id[0] << 8) | id[1]);
  view.setUint16(2, 0x0100); // Recursion Desired
  view.setUint16(4, 1);      // QDCOUNT
  let offset = 12;
  packet.set(encoded, offset);
  offset += encoded.length;
  packet[offset++] = 0;
  view.setUint16(offset, qtype); offset += 2;
  view.setUint16(offset, 1); // IN
  return { packet, id: (id[0] << 8) | id[1] };
}

function readName(message: Uint8Array, start: number) {
  const labels: string[] = [];
  let offset = start;
  let nextOffset = -1;
  let hops = 0;
  while (offset < message.length && hops++ < 128) {
    const length = message[offset];
    if (length === 0) {
      offset++;
      if (nextOffset < 0) nextOffset = offset;
      break;
    }
    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= message.length) throw new Error("پاسخ DNS ناقص است.");
      const pointer = ((length & 0x3f) << 8) | message[offset + 1];
      if (nextOffset < 0) nextOffset = offset + 2;
      offset = pointer;
      continue;
    }
    if ((length & 0xc0) !== 0 || offset + 1 + length > message.length) {
      throw new Error("قالب پاسخ DNS معتبر نیست.");
    }
    labels.push(new TextDecoder().decode(message.slice(offset + 1, offset + 1 + length)));
    offset += length + 1;
  }
  if (hops >= 128) throw new Error("اشاره‌گر نام DNS بیش از حد پیچیده است.");
  return { name: labels.join("."), nextOffset: nextOffset < 0 ? offset : nextOffset };
}

function decodeResponse(message: Uint8Array, expectedId: number) {
  if (message.length < 12) throw new Error("پاسخ DNS کوتاه یا ناقص است.");
  const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
  const id = view.getUint16(0);
  if (id !== expectedId) throw new Error("شناسه پاسخ DNS با درخواست یکسان نیست.");
  const flags = view.getUint16(2);
  const questionCount = view.getUint16(4);
  const answerCount = view.getUint16(6);
  const rcode = flags & 0x000f;
  let offset = 12;
  for (let i = 0; i < questionCount; i++) {
    offset = readName(message, offset).nextOffset + 4;
    if (offset > message.length) throw new Error("بخش پرسش DNS ناقص است.");
  }
  const answers: DNSAnswer[] = [];
  for (let i = 0; i < answerCount; i++) {
    const owner = readName(message, offset);
    offset = owner.nextOffset;
    if (offset + 10 > message.length) throw new Error("رکورد DNS ناقص است.");
    const type = view.getUint16(offset);
    const dataLength = view.getUint16(offset + 8);
    const dataOffset = offset + 10;
    const end = dataOffset + dataLength;
    if (end > message.length) throw new Error("داده رکورد DNS ناقص است.");
    let value = "";
    if (type === 1 && dataLength === 4) {
      value = [...message.slice(dataOffset, end)].join(".");
    } else if (type === 28 && dataLength === 16) {
      const parts: string[] = [];
      for (let j = 0; j < 16; j += 2) parts.push(view.getUint16(dataOffset + j).toString(16));
      value = parts.join(":");
    } else if (type === 15 && dataLength >= 3) {
      const priority = view.getUint16(dataOffset);
      value = `${priority} ${readName(message, dataOffset + 2).name}`;
    } else if (type === 5) {
      value = readName(message, dataOffset).name;
    }
    if (value) answers.push({ type: type === 1 ? "A" : type === 28 ? "AAAA" : type === 15 ? "MX" : "CNAME", value });
    offset = end;
  }
  return { rcode, answers };
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function queryDoH(endpoint: string, domain: string, type: string, timeoutMs = 7000) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("نشانی DNS-over-HTTPS باید HTTPS باشد.");
  const { packet, id } = buildQuery(domain, type);
  url.searchParams.set("dns", toBase64Url(packet));
  const started = performance.now();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/dns-message" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/dns-message")) {
    throw new Error("سرور پاسخ DNS استاندارد برنگرداند؛ احتمالاً نشانی DoH با RFC 8484 سازگار نیست.");
  }
  const decoded = decodeResponse(new Uint8Array(await response.arrayBuffer()), id);
  return { ms: performance.now() - started, status: decoded.rcode, answers: decoded.answers };
}

async function testDoH(endpoint: string, domain: string) {
  const start = performance.now();
  const results = await Promise.all(["A", "AAAA", "MX"].map(async type => {
    try {
      const response = await queryDoH(endpoint, domain, type);
      return { type, response };
    } catch (error) {
      return { type, error: error instanceof Error ? error.message : "خطای ناشناخته" };
    }
  }));
  const successful = results.filter(item => "response" in item && item.response?.status === 0);
  const values = results.flatMap(item => ("response" in item && item.response ? item.response.answers.map(answer => `${answer.type}: ${answer.value}`) : []));
  const errors = results.filter(item => "error" in item).map(item => `${item.type}: ${item.error}`);
  const ok = successful.length > 0 && values.length > 0;
  const detail = values.length ? values.join(" · ") : errors.join(" | ") || "هیچ رکوردی دریافت نشد.";
  return { ok, ms: performance.now() - start, detail, status: ok ? "پاسخ‌گو" : "بدون پاسخ" };
}

export async function testResolver(server: DNSRecord, domain = "example.com"): Promise<DNSResult> {
  const ip = server.primary_ipv4 || server.primary_ipv6 || "";
  const desktop = window.desktopAPI;
  if (desktop && ip) {
    const result = await desktop.testDns(ip, domain);
    return {
      id: server.slug, name: server.name, ip, ok: result.ok,
      ms: result.ms, status: result.ok ? "پاسخ‌گو" : "بدون پاسخ",
      detail: result.ok ? Object.entries(result.answers).map(([k,v]) => `${k}: ${v.join(", ")}`).join(" · ") : (result.error || "پاسخی دریافت نشد"),
      transport: "native"
    };
  }
  if (!server.doh_url) {
    return { id: server.slug, name: server.name, ip, ok: false, ms: null, status: "نیازمند نسخه ویندوز", detail: "این سرویس نشانی DoH ثبت‌شده ندارد؛ تست IP مستقیم در برنامه ویندوز انجام می‌شود.", transport: "DoH" };
  }
  try {
    const result = await testDoH(server.doh_url, domain);
    return { id: server.slug, name: server.name, ip: server.doh_url, ok: result.ok, ms: result.ms, status: result.status, detail: result.detail, transport: "DoH" };
  } catch (error) {
    return { id: server.slug, name: server.name, ip: server.doh_url, ok: false, ms: null, status: "خطا", detail: error instanceof Error ? error.message : "خطای ناشناخته", transport: "DoH" };
  }
}

export async function testCustomResolver(server: {id:string;name:string;ipv4:string|null;ipv6:string|null;doh_url:string|null}, domain = "example.com"): Promise<DNSResult> {
  const ip = server.ipv4 || server.ipv6 || "";
  if (window.desktopAPI && ip) {
    const r = await window.desktopAPI.testDns(ip, domain);
    return { id: server.id, name: server.name, ip, ok: r.ok, ms: r.ms, status: r.ok ? "پاسخ‌گو" : "بدون پاسخ", detail: r.ok ? JSON.stringify(r.answers) : (r.error || "بدون پاسخ"), transport: "native" };
  }
  if (!server.doh_url) return { id:server.id,name:server.name,ip,ok:false,ms:null,status:"نیازمند برنامه ویندوز",detail:"تست IP مستقیم به دسترسی native نیاز دارد.",transport:"DoH" };
  try {
    const result = await testDoH(server.doh_url,domain);
    return { id:server.id,name:server.name,ip:server.doh_url,ok:result.ok,ms:result.ms,status:result.status,detail:result.detail,transport:"DoH" };
  } catch(error) {
    return {id:server.id,name:server.name,ip:server.doh_url,ok:false,ms:null,status:"خطا",detail:error instanceof Error?error.message:"خطای ناشناخته",transport:"DoH"};
  }
}

export function isValidIp(value: string) {
  const v = value.trim();
  const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
  if (ipv4.test(v)) return true;
  if (!v.includes(":") || !/^[0-9a-f:]+$/i.test(v) || v.includes(":::")) return false;
  const sides = v.split("::");
  if (sides.length > 2) return false;
  const groups = sides.flatMap(side => side ? side.split(":") : []);
  if (groups.some(group => !group || group.length > 4 || !/^[0-9a-f]+$/i.test(group))) return false;
  return sides.length === 2 ? groups.length < 8 : groups.length === 8;
}