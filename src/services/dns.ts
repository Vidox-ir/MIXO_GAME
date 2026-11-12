import type { DNSRecord, DNSResult } from "../types";

const DNS_JSON_ACCEPT = "application/dns-json";

async function queryDoH(endpoint: string, domain: string, type: string, timeoutMs = 7000) {
  const url = new URL(endpoint);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", type);
  const started = performance.now();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: DNS_JSON_ACCEPT },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { ms: performance.now() - started, status: Number(data.Status ?? 0), answers: data.Answer ?? [] };
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
    return { id: server.slug, name: server.name, ip, ok: false, ms: null, status: "نیازمند نسخه ویندوز", detail: "این سرویس DoH عمومی ثبت‌شده ندارد؛ تست IP مستقیم در برنامه ویندوز انجام می‌شود.", transport: "DoH" };
  }
  try {
    const answer = await queryDoH(server.doh_url, domain, "A");
    const values = answer.answers.map((a: {data?:string}) => a.data).filter(Boolean);
    const ok = answer.status === 0 && values.length > 0;
    return { id: server.slug, name: server.name, ip: server.doh_url, ok, ms: answer.ms, status: ok ? "پاسخ‌گو" : `کد DNS ${answer.status}`, detail: values.join(", ") || "رکورد A برنگشت", transport: "DoH" };
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
    const r = await queryDoH(server.doh_url,domain,"A");
    const records = r.answers.map((a:{data?:string})=>a.data).filter(Boolean);
    const ok = r.status===0 && records.length>0;
    return { id:server.id,name:server.name,ip:server.doh_url,ok,ms:r.ms,status:ok?"پاسخ‌گو":`کد DNS ${r.status}`,detail:records.join(", ")||"رکوردی برنگشت",transport:"DoH" };
  } catch(e) {
    return {id:server.id,name:server.name,ip:server.doh_url,ok:false,ms:null,status:"خطا",detail:e instanceof Error?e.message:"خطای ناشناخته",transport:"DoH"};
  }
}

export function isValidIp(value: string) {
  const v = value.trim();
  const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
  const ipv6 = /^[0-9a-f:]+$/i.test(v) && v.includes(":") && v.length <= 45;
  return ipv4.test(v) || ipv6;
}