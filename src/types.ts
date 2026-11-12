export type DNSRecord = {
  slug: string; name: string; category: string;
  primary_ipv4: string | null; secondary_ipv4: string | null;
  primary_ipv6: string | null; secondary_ipv6: string | null;
  doh_url: string | null; website: string | null;
  notes: string; source_url: string | null;
};
export type DNSResult = {
  id: string; name: string; ip: string; ok: boolean;
  ms: number | null; status: string; detail: string;
  transport: "DoH" | "UDP/TCP" | "native";
};
export type DesktopAPI = {
  isDesktop: true;
  testDns: (ip: string, domain: string) => Promise<{ok:boolean;ms:number|null;answers:Record<string,string[]>;error?:string}>;
  pingHost: (host: string) => Promise<{ok:boolean;avgMs:number|null;minMs:number|null;maxMs:number|null;loss:number;raw:string}>;
  networkInfo: () => Promise<{hostname:string;platform:string;dns:string[];interfaces:{name:string;address:string;family:string;internal:boolean}[]}>;
  pickExecutable: () => Promise<string | null>;
  launchGame: (path: string, args?: string) => Promise<{ok:boolean;error?:string}>;
};
declare global { interface Window { desktopAPI?: DesktopAPI } }