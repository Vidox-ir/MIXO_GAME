import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity, ArrowDown, ArrowLeft, ArrowUpRight, Bell, BookOpen, Check,
  ChevronDown, CircleHelp, Clock3, Cpu, Crosshair, Download, Eye, EyeOff,
  Gamepad2, Globe2, HardDrive, Layers3, LockKeyhole, LogOut, Mail, MapPin,
  Menu, Monitor, Network, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  Sparkles, Swords, TerminalSquare, Trophy, Wifi, Zap, FolderOpen, Trash2
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { testResolver, testCustomResolver, isValidIp } from "./services/dns";
import type { DNSRecord, DNSResult } from "./types";

type Page = "home"|"games"|"dns"|"ghost"|"world"|"account";
type AuthMode = "login"|"signup"|"forgot"|"verify-signup"|"verify-recovery"|"new-password";
const nav: {id:Page;label:string;icon:typeof Activity;tag?:string}[] = [
  {id:"home",label:"نمای کلی",icon:Layers3},
  {id:"games",label:"کتابخانه بازی",icon:Gamepad2},
  {id:"dns",label:"آزمایشگاه DNS",icon:Network,tag:"NET"},
  {id:"ghost",label:"پروتکل شبح",icon:TerminalSquare,tag:"XP"},
  {id:"world",label:"جهان موازی",icon:Globe2,tag:"LIVE"},
  {id:"account",label:"حساب و تنظیمات",icon:Settings2}
];
const gameSeeds = [
  {name:"Counter-Strike 2",genre:"رقابتی · تاکتیکی",color:"game-blue",code:"CS2",status:"کتابخانه آماده"},
  {name:"Ready or Not",genre:"تاکتیکی · همکاری",color:"game-amber",code:"RON",status:"افزودن مسیر اجرا"},
  {name:"Minecraft",genre:"بقا · جهان‌باز",color:"game-green",code:"MC",status:"افزودن مسیر اجرا"},
  {name:"Battlefield 6",genre:"اکشن · چندنفره",color:"game-red",code:"BF6",status:"افزودن مسیر اجرا"}
];
const fmt = (n:number|null|undefined) => n == null ? "—" : `${Math.round(n)} ms`;
const errText = (e:unknown) => e instanceof Error ? e.message : "خطای نامشخص";

function App() {
  const [page,setPage] = useState<Page>("home");
  const [session,setSession] = useState<any>(null);
  const [profile,setProfile] = useState<any>(null);
  const [authMode,setAuthMode] = useState<AuthMode>("login");
  const [authOpen,setAuthOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [authEmail,setAuthEmail] = useState("");
  const [authPassword,setAuthPassword] = useState("");
  const [displayName,setDisplayName] = useState("");
  const [username,setUsername] = useState("");
  const [otp,setOtp] = useState("");
  const [newPassword,setNewPassword] = useState("");
  const [showPass,setShowPass] = useState(false);
  const [dnsRows,setDnsRows] = useState<DNSRecord[]>([]);
  const [customDns,setCustomDns] = useState<any[]>([]);
  const [dnsResults,setDnsResults] = useState<DNSResult[]>([]);
  const [dnsBusy,setDnsBusy] = useState(false);
  const [dnsSearch,setDnsSearch] = useState("");
  const [dnsFilter,setDnsFilter] = useState("همه");
  const [dnsDomain,setDnsDomain] = useState("example.com");
  const [customName,setCustomName] = useState("");
  const [customIp,setCustomIp] = useState("");
  const [customDoh,setCustomDoh] = useState("");
  const [ping,setPing] = useState<any>(null);
  const [pingHistory,setPingHistory] = useState<any[]>([]);
  const [network,setNetwork] = useState<any>(null);
  const [games,setGames] = useState<any[]>([]);
  const [missions,setMissions] = useState<any[]>([]);
  const [ghostProgress,setGhostProgress] = useState<any[]>([]);
  const [activeMission,setActiveMission] = useState<any>(null);
  const [answer,setAnswer] = useState<number|null>(null);
  const [worldLocations,setWorldLocations] = useState<any[]>([]);
  const [worldClaims,setWorldClaims] = useState<any[]>([]);
  const [worldPlayer,setWorldPlayer] = useState<any>(null);
  const [saving,setSaving] = useState(false);
  const desktop = Boolean(window.desktopAPI?.isDesktop);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,next)=>{
      setSession(next);
      if(event==="PASSWORD_RECOVERY"){setAuthMode("new-password");setAuthOpen(true);}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("dns_servers").select("*").eq("enabled",true).order("category").then(({data})=>{if(data)setDnsRows(data as DNSRecord[])});
    supabase.from("world_locations").select("*").eq("is_open",true).then(({data})=>{if(data)setWorldLocations(data)});
  },[]);

  useEffect(() => {
    if (!session?.user || !supabase) { setProfile(null); setGames([]); setCustomDns([]); setMissions([]); setGhostProgress([]); setWorldClaims([]); setWorldPlayer(null); setPingHistory([]); return; }
    const uid = session.user.id;
    Promise.all([
      supabase.from("profiles").select("*").eq("user_id",uid).maybeSingle(),
      supabase.from("game_library_entries").select("*").eq("user_id",uid).order("created_at",{ascending:false}),
      supabase.from("custom_dns_servers").select("*").eq("user_id",uid).order("created_at",{ascending:false}),
      supabase.from("ghost_missions").select("*").eq("is_published",true).order("sort_order"),
      supabase.from("ghost_progress").select("*").eq("user_id",uid),
      supabase.from("world_players").select("*").eq("user_id",uid).maybeSingle(),
      supabase.from("world_claims").select("*")
    ]).then(([p,g,c,m,gp,wp,wc])=>{
      setProfile(p.data); setGames(g.data||[]); setCustomDns(c.data||[]);
      setMissions(m.data||[]); setGhostProgress(gp.data||[]);
      setWorldPlayer(wp.data); setWorldClaims(wc.data||[]);
    });
  },[session?.user?.id]);

  useEffect(() => {
    if (!window.desktopAPI) return;
    let cancelled = false;
    let running = false;
    window.desktopAPI.networkInfo().then(info=>{if(!cancelled)setNetwork(info)}).catch(()=>{});
    const monitor = async () => {
      if (running || !window.desktopAPI) return;
      running = true;
      try {
        const result = await window.desktopAPI.pingHost("1.1.1.1");
        if (cancelled) return;
        setPing(result);
        if (session?.user && supabase) {
          const {data,error} = await supabase.from("network_test_runs").insert({
            user_id:session.user.id,target_host:"1.1.1.1",avg_ms:result.avgMs,
            min_ms:result.minMs,max_ms:result.maxMs,packet_loss:result.loss,
            success:result.ok,raw_output:result.raw||""
          }).select().single();
          if (!error && data && !cancelled) setPingHistory(old=>[data,...old].slice(0,30));
        }
      } catch {
        if (!cancelled) setPing({ok:false,avgMs:null,minMs:null,maxMs:null,loss:100,raw:"آزمون شبکه ناموفق بود."});
      } finally {
        running = false;
      }
    };
    void monitor();
    const interval = window.setInterval(monitor,60000);
    return () => {cancelled=true;window.clearInterval(interval);};
  },[session?.user?.id]);

  useEffect(() => {
    if(!session?.user||!supabase)return;
    supabase.from("network_test_runs").select("*").eq("user_id",session.user.id)
      .order("tested_at",{ascending:false}).limit(30)
      .then(({data})=>setPingHistory(data||[]));
  },[session?.user?.id]);

  const avgLatency = useMemo(()=>{
    const valid=dnsResults.filter(r=>r.ok&&r.ms!==null);
    return valid.length ? valid.reduce((a,b)=>a+(b.ms||0),0)/valid.length : null;
  },[dnsResults]);
  const visibleDns = useMemo(()=>dnsRows.filter(row=>
    (dnsFilter==="همه"||row.category===dnsFilter) &&
    (row.name.toLowerCase().includes(dnsSearch.toLowerCase())||row.primary_ipv4?.includes(dnsSearch))
  ),[dnsRows,dnsFilter,dnsSearch]);

  const notify=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(""),4200)};
  const requireAuth=(target:Page)=>{
    if (!session) { setPage(target); setAuthMode("login"); setAuthOpen(true); return false; }
    return true;
  };
  const startAuth=(mode:AuthMode)=>{setAuthMode(mode);setAuthOpen(true);setNotice("");};
  const handleAuth=async(e:FormEvent)=>{
    e.preventDefault(); if(!supabase){notify("اتصال Supabase پیکربندی نشده؛ فایل .env را تنظیم کن.");return;}
    setBusy(true);setNotice("");
    try{
      if(authMode==="signup"){
        if(authPassword.length<8)throw new Error("رمز عبور باید دست‌کم ۸ نویسه داشته باشد.");
        const {error}=await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{display_name:displayName,username}}});
        if(error)throw error;
        setAuthMode("verify-signup");notify("حساب ساخته شد؛ کد تأیید ارسال شد. پوشه هرزنامه را هم بررسی کن.");
      }else if(authMode==="login"){
        const {error}=await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});if(error)throw error;
        setAuthOpen(false);notify("خوش برگشتی!");
      }else if(authMode==="forgot"){
        const {error}=await supabase.auth.resetPasswordForEmail(authEmail);if(error)throw error;
        setAuthMode("verify-recovery");notify("درخواست بازیابی ارسال شد؛ کد یا لینک ایمیل را بررسی کن.");
      }else if(authMode==="verify-signup"||authMode==="verify-recovery"){
        const type=authMode==="verify-signup"?"signup":"recovery";
        const {error}=await supabase.auth.verifyOtp({email:authEmail,token:otp,type});if(error)throw error;
        if(type==="recovery")setAuthMode("new-password");else{setAuthOpen(false);notify("ایمیل تأیید شد؛ حساب فعال است.");}
      }else if(authMode==="new-password"){
        const {error}=await supabase.auth.updateUser({password:newPassword});if(error)throw error;
        setAuthOpen(false);notify("رمز عبور با موفقیت تغییر کرد.");
      }
    }catch(error){notify(errText(error));}
    finally{setBusy(false);}
  };

  const resendAuthCode=async()=>{
    if(!supabase)return;
    setBusy(true);
    try{
      const result=authMode==="verify-signup"
        ? await supabase.auth.resend({type:"signup",email:authEmail})
        : await supabase.auth.resetPasswordForEmail(authEmail);
      if(result.error)throw result.error;
      notify("درخواست ارسال دوباره ثبت شد؛ ایمیل را بررسی کن.");
    }catch(error){notify(errText(error));}
    finally{setBusy(false);}
  };
  const logout=async()=>{await supabase?.auth.signOut();setAuthOpen(false);setPage("home");notify("از حساب خارج شدی.");};
  const refreshDns=async()=>{
    if(!supabase)return;
    const {data}=await supabase.from("dns_servers").select("*").eq("enabled",true).order("category");if(data)setDnsRows(data as DNSRecord[]);
  };
  const runDns=async()=>{
    if(!visibleDns.length&&!customDns.length)return;
    setDnsBusy(true);setDnsResults([]);
    const queue=[...visibleDns.map(s=>({server:s,custom:false})),...customDns.map(s=>({server:s,custom:true}))];
    const results:DNSResult[]=[];
    for(let i=0;i<queue.length;i+=4){
      const batch=queue.slice(i,i+4);
      const part=await Promise.all(batch.map(({server,custom})=>custom?testCustomResolver(server,dnsDomain):testResolver(server,dnsDomain)));
      results.push(...part);setDnsResults([...results]);
    }
    if(session?.user&&supabase){
      const inserts=results.map(r=>({user_id:session.user.id,server_slug:dnsRows.some(s=>s.slug===r.id)?r.id:null,dns_name:r.name,resolver_ip:r.ip,query_domain:dnsDomain,transport:r.transport,latency_ms:r.ms,success:r.ok,status:r.status,details:{detail:r.detail}}));
      await supabase.from("dns_test_runs").insert(inserts);
    }
    setDnsBusy(false);
    notify(`آزمایش پایان یافت؛ ${results.filter(r=>r.ok).length} پاسخ موفق از ${results.length} سرویس.`);
  };
  const addCustomDns=async(e:FormEvent)=>{
    e.preventDefault();if(!session?.user||!supabase){requireAuth("dns");return;}
    if(!customName.trim()||(!isValidIp(customIp)&&!customDoh.trim())){notify("نام و یک IP معتبر یا نشانی DoH وارد کن.");return;}
    if(customDoh.trim()){try{const u=new URL(customDoh);if(u.protocol!=="https:")throw new Error();}catch{notify("نشانی DoH باید HTTPS معتبر باشد.");return;}}
    const ip=customIp.trim();
    if(ip&&!isValidIp(ip)){notify("نشانی IP معتبر نیست.");return;}
    const ipv4=ip&&!ip.includes(":")?ip:null;
    const ipv6=ip&&ip.includes(":")?ip:null;
    const payload={user_id:session.user.id,name:customName.trim(),ipv4,ipv6,doh_url:customDoh.trim()||null};
    const {data,error}=await supabase.from("custom_dns_servers").insert(payload).select().single();
    if(error){notify(error.message);return;}setCustomDns(old=>[data,...old]);setCustomName("");setCustomIp("");setCustomDoh("");notify("DNS اختصاصی اضافه شد.");
  };
  const removeCustomDns=async(id:string)=>{
    if(!supabase||!session?.user)return;
    const {error}=await supabase.from("custom_dns_servers").delete().eq("id",id).eq("user_id",session.user.id);
    if(error){notify(error.message);return;}
    setCustomDns(old=>old.filter(item=>item.id!==id));setDnsResults(old=>old.filter(item=>item.id!==id));notify("DNS اختصاصی حذف شد.");
  };
  const pingTest=async()=>{
    if(!window.desktopAPI){notify("تست Ping دقیق به برنامه ویندوز نیاز دارد.");return;}
    setSaving(true);
    try{
      const [p,info]=await Promise.all([window.desktopAPI.pingHost("1.1.1.1"),window.desktopAPI.networkInfo()]);
      setPing(p);setNetwork(info);
      if(session?.user&&supabase){
        const {data,error}=await supabase.from("network_test_runs").insert({
          user_id:session.user.id,target_host:"1.1.1.1",avg_ms:p.avgMs,min_ms:p.minMs,
          max_ms:p.maxMs,packet_loss:p.loss,success:p.ok,raw_output:p.raw||""
        }).select().single();
        if(error)notify("Ping انجام شد؛ ذخیره تاریخچه ناموفق بود: "+error.message);
        else setPingHistory(old=>[data,...old].slice(0,30));
      }
      notify(p.ok?"آزمایش Ping با موفقیت انجام شد.":"مقصد در دسترس نبود؛ نتیجه در تاریخچه ثبت شد.");
    }catch(error){notify(errText(error));}
    finally{setSaving(false);}
  };
  const pickGame=async(seed?:any)=>{
    if(!session?.user||!supabase){requireAuth("games");return;}
    if(!window.desktopAPI){notify("افزودن مسیر اجرایی از برنامه ویندوز امکان‌پذیر است.");return;}
    const path=await window.desktopAPI.pickExecutable();if(!path)return;
    const title=seed?.name||path.split(/[\\/]/).pop()?.replace(/\.exe$/i,"")||"بازی جدید";
    const {data,error}=await supabase.from("game_library_entries").insert({user_id:session.user.id,title,install_path:path,platform:"Windows"}).select().single();
    if(error){notify(error.message);return;}setGames(old=>[data,...old]);notify("بازی به کتابخانه اضافه شد.");
  };
  const launchGame=async(game:any)=>{
    if(!window.desktopAPI){notify("اجرای بازی فقط از برنامه ویندوز ممکن است.");return;}
    if(!game.install_path){notify("برای این بازی هنوز فایل اجرایی انتخاب نشده است.");return;}
    const r=await window.desktopAPI.launchGame(game.install_path,game.launch_args||"");
    notify(r.ok?"درخواست اجرای بازی ارسال شد.":r.error||"اجرای بازی ناموفق بود.");
  };
  const removeGame=async(id:string)=>{
    if(!supabase||!session?.user)return;
    const {error}=await supabase.from("game_library_entries").delete().eq("id",id).eq("user_id",session.user.id);
    if(error){notify(error.message);return;}
    setGames(old=>old.filter(game=>game.id!==id));notify("بازی از کتابخانه حذف شد.");
  };
  const changeGamePath=async(game:any)=>{
    if(!window.desktopAPI||!supabase||!session?.user){notify("تغییر مسیر در برنامه ویندوز انجام می‌شود.");return;}
    const path=await window.desktopAPI.pickExecutable();if(!path)return;
    const {data,error}=await supabase.from("game_library_entries").update({install_path:path}).eq("id",game.id).eq("user_id",session.user.id).select().single();
    if(error){notify(error.message);return;}
    setGames(old=>old.map(item=>item.id===game.id?data:item));notify("مسیر اجرای بازی به‌روز شد.");
  };
  const answerMission=async()=>{
    if(!requireAuth("ghost")||!supabase||!activeMission||answer===null)return;
    const progress=ghostProgress.find(x=>x.mission_id===activeMission.id);
    const step=progress?.current_step??0;
    setSaving(true);
    const {data,error}=await supabase.rpc("submit_ghost_answer",{p_mission_id:activeMission.id,p_step:step,p_answer:answer});
    setSaving(false);
    if(error){notify(error.message);return;}
    notify(data.correct?data.explain+(data.complete?" مأموریت کامل شد!": " پاسخ درست است."):"پاسخ درست نیست؛ دوباره تلاش کن.");
    const {data:next}=await supabase.from("ghost_progress").select("*").eq("user_id",session.user.id);
    setGhostProgress(next||[]);setAnswer(null);
    if(data.complete)setActiveMission(null);
  };
  const claimLocation=async(id:string)=>{
    if(!requireAuth("world")||!supabase)return;
    setSaving(true);const {data,error}=await supabase.rpc("claim_world_location",{p_location_id:id});setSaving(false);
    if(error){notify(error.message);return;}
    const [p,c]=await Promise.all([
      supabase.from("world_players").select("*").eq("user_id",session.user.id).single(),
      supabase.from("world_claims").select("*")
    ]);
    setWorldPlayer(p.data);setWorldClaims(c.data||[]);notify("منطقه تصرف شد؛ پاداش به حساب جهان اضافه شد.");
  };

  return <div className="app-shell" dir="rtl">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>M</span><i /></div><div><b>MIXO<span>_</span>GAME</b><small>GAME & NETWORK COMMAND</small></div></div>
      <div className="side-status"><span className="live-dot"/><span>هسته سامانه</span><b>فعال</b></div>
      <div className="nav-label">فضای کاری</div>
      <nav>{nav.map(item=><button key={item.id} className={page===item.id?"nav-item active":"nav-item"} onClick={()=>{if(["ghost","world"].includes(item.id)&&!session)requireAuth(item.id);else setPage(item.id);}}>
        <item.icon size={18}/><span>{item.label}</span>{item.tag&&<small>{item.tag}</small>}
      </button>)}</nav>
      <div className="sidebar-bottom">
        <div className="mini-card"><div className="mini-icon"><Zap size={17}/></div><div><b>هسته NEXUS</b><small>{desktop?"اتصال دسکتاپ فعال":"حالت مرورگر"}</small></div><span className="live-dot"/></div>
        <button className="help-button" onClick={()=>notify("راهنما در نسخه بعدی تکمیل می‌شود.")}><CircleHelp size={16}/> مرکز راهنما <ArrowUpRight size={14}/></button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>میکس‌و گیم</span><b>/</b><strong>{nav.find(n=>n.id===page)?.label}</strong></div>
        <div className="top-actions"><div className="system-pill"><span className="live-dot"/>{desktop?"نسخه ویندوز متصل":"نسخه وب"}</div><button className="icon-button" onClick={()=>notify("اعلان تازه‌ای وجود ندارد.")}><Bell size={17}/></button>
          {session?<button className="user-chip" onClick={()=>setPage("account")}><span className="avatar">{(profile?.display_name||session.user.email||"M").slice(0,1).toUpperCase()}</span><span>{profile?.display_name||"حساب من"}</span><ChevronDown size={14}/></button>:<button className="btn btn-primary btn-small" onClick={()=>startAuth("login")}>ورود / ثبت‌نام <ArrowLeft size={14}/></button>}
        </div>
      </header>
      <div className="content">
        {page==="home"&&<HomePage session={session} profile={profile} desktop={desktop} ping={ping} avgLatency={avgLatency} go={setPage} requireAuth={requireAuth} games={games} dnsCount={dnsRows.length} worldPlayer={worldPlayer}/>}
        {page==="games"&&<GamesPage games={games} desktop={desktop} add={pickGame} launch={launchGame} remove={removeGame} changePath={changeGamePath} notify={notify}/>}
        {page==="dns"&&<DNSPage rows={visibleDns} allRows={dnsRows} custom={customDns} results={dnsResults} busy={dnsBusy} search={dnsSearch} setSearch={setDnsSearch} filter={dnsFilter} setFilter={setDnsFilter} domain={dnsDomain} setDomain={setDnsDomain} run={runDns} add={addCustomDns} removeCustom={removeCustomDns} customName={customName} setCustomName={setCustomName} customIp={customIp} setCustomIp={setCustomIp} customDoh={customDoh} setCustomDoh={setCustomDoh} desktop={desktop} refresh={refreshDns} ping={ping} pingHistory={pingHistory} pingTest={pingTest} pingBusy={saving}/>}
        {page==="ghost"&&<GhostPage session={session} missions={missions} progress={ghostProgress} active={activeMission} setActive={setActiveMission} answer={answer} setAnswer={setAnswer} submit={answerMission} saving={saving} requireAuth={()=>requireAuth("ghost")}/>}
        {page==="world"&&<WorldPage session={session} player={worldPlayer} locations={worldLocations} claims={worldClaims} claim={claimLocation} saving={saving} requireAuth={()=>requireAuth("world")}/>}
        {page==="account"&&<AccountPage session={session} profile={profile} network={network} desktop={desktop} logout={logout} startAuth={startAuth}/>}
      </div>
      <footer className="footer"><span>© ۲۰۲۶ MIXO GAME</span><span>ساخته‌شده برای گیمرها و کنجکاوهای شبکه <i>✦</i></span><span>نسخه ۰.۱.۰ · پیش‌نمایش توسعه</span></footer>
    </main>
    {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={displayName} setName={setDisplayName} username={username} setUsername={setUsername} otp={otp} setOtp={setOtp} newPassword={newPassword} setNewPassword={setNewPassword} showPass={showPass} setShowPass={setShowPass} busy={busy} submit={handleAuth} resend={resendAuthCode} close={()=>setAuthOpen(false)} notice={notice}/>}
    {notice&&<div className="toast"><Check size={16}/>{notice}</div>}
  </div>;
}

function PageHeading({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:ReactNode}){
  return <div className="page-heading"><div><div className="eyebrow"><span/> {eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action&&<div className="heading-action">{action}</div>}</div>;
}
function HomePage({session,profile,desktop,ping,avgLatency,go,requireAuth,games,dnsCount,worldPlayer}:any){
  return <><div className="hero-panel">
    <div className="hero-grid"><div className="hero-copy"><div className="hero-kicker"><Sparkles size={14}/> مرکز فرماندهی شخصی تو</div>
      <h1>بازی را اجرا کن.<br/><em>شبکه را کنترل کن.</em></h1>
      <p>یک فضای واحد برای کتابخانه بازی‌ها، تحلیل اتصال، آزمایش DNS و مأموریت‌های تعاملی.</p>
      <div className="hero-actions"><button className="btn btn-primary" onClick={()=>go("games")}><Gamepad2 size={17}/> ورود به لانچر <ArrowLeft size={15}/></button><button className="btn btn-ghost" onClick={()=>go("dns")}><Activity size={17}/> تست شبکه</button></div>
    </div><div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core-glow"><div className="core-symbol">M<span>×</span></div></div><div className="float-tag tag-one"><Wifi size={14}/> اتصال پایدار</div><div className="float-tag tag-two"><ShieldCheck size={14}/> محافظت و پایش</div><div className="visual-caption">NEXUS CORE <small>READY TO PLAY</small></div></div></div>
    <div className="hero-foot"><span><i className="live-dot"/> {desktop?"هسته دسکتاپ متصل است":"نسخه مرورگر آماده است"}</span><span>طراحی‌شده برای Windows 10 / 11</span><span>۰۱ / ۰۴</span></div>
  </div>
  <div className="section-head"><div><small>فضای یکپارچه</small><h2>ماژول‌های اصلی</h2></div><span>چهار مسیر، یک حساب</span></div>
  <div className="module-grid">
    <ModuleCard icon={<Gamepad2/>} index="01" title="لانچر NEXUS" desc="کتابخانه شخصی، مسیر اجرای بازی‌ها و دسترسی سریع." meta={`${games.length} بازی ذخیره‌شده`} onClick={()=>go("games")} tone="blue"/>
    <ModuleCard icon={<Network/>} index="02" title="آزمایشگاه NetScope" desc="تست DNS، تأخیر و سوابق اختلال از دستگاه خودت." meta={`${dnsCount} سرویس DNS در فهرست`} onClick={()=>go("dns")} tone="teal"/>
    <ModuleCard icon={<TerminalSquare/>} index="03" title="Ghost Protocol" desc="پرونده‌های تعاملی، پازل‌های امنیتی و امتیاز تجربه." meta="ورود برای ذخیره پیشرفت" onClick={()=>session?go("ghost"):requireAuth("ghost")} tone="purple"/>
    <ModuleCard icon={<Globe2/>} index="04" title="Parallel World" desc="جهان رقابتی؛ منطقه بگیر، منابع جمع کن و رشد کن." meta={worldPlayer?`سطح ${worldPlayer.level} · ${worldPlayer.credits} اعتبار`:"ورود برای ساخت شخصیت"} onClick={()=>session?go("world"):requireAuth("world")} tone="amber"/>
  </div>
  <div className="overview-grid"><div className="panel network-panel"><div className="panel-title"><div><small>NETSCOPE / LIVE</small><h3>وضعیت ارتباط</h3></div><button className="subtle-link" onClick={()=>go("dns")}>جزئیات <ArrowLeft size={13}/></button></div><div className="network-stats"><div><span>Ping تا 1.1.1.1</span><b>{fmt(ping?.avgMs)}</b><small className={ping?.ok?"success-text":"muted"}>{ping?.ok?"پاسخ‌گو":"نیازمند تست دسکتاپ"}</small></div><div><span>میانگین تست DNS</span><b>{fmt(avgLatency)}</b><small>آخرین اجرای این نشست</small></div><div><span>کتابخانه بازی</span><b>{games.length.toLocaleString("fa-IR")}</b><small>بازی ثبت‌شده</small></div></div><div className="network-bar"><span style={{width:ping?.ok?"78%":"18%"}}/></div><div className="network-foot"><span><span className="live-dot"/> پایش محلی</span><span>{ping?.loss!=null?`اتلاف بسته: ${ping.loss}٪`:"هنوز داده‌ای ثبت نشده"}</span></div></div>
  <div className="panel profile-panel"><div className="panel-title"><div><small>PLAYER ID / PROFILE</small><h3>کارت بازیکن</h3></div><Trophy size={20}/></div><div className="profile-main"><div className="profile-avatar">{session?(profile?.display_name||session.user.email||"M").slice(0,1).toUpperCase():"?"}</div><div><b>{session?profile?.display_name||"بازیکن تازه‌وارد":"مهمان"}</b><span>{session?profile?.username||"در حال ساخت شناسه":"برای ساخت کارت بازیکن وارد شو"}</span></div></div><div className="profile-progress"><div><span>سطح حساب</span><b>{worldPlayer?.level||1}</b></div><div className="progress-track"><i style={{width:`${Math.min(100,(worldPlayer?.xp||0)%500/5)}%`}}/></div><small>{worldPlayer?.xp||0} XP · پیشرفت جهان موازی</small></div></div></div></>;
}
function ModuleCard({icon,index,title,desc,meta,onClick,tone}:any){
  return <button className={`module-card ${tone}`} onClick={onClick}><div className="module-top"><div className="module-icon">{icon}</div><span>{index}</span></div><h3>{title}</h3><p>{desc}</p><div className="module-bottom"><small>{meta}</small><i><ArrowLeft size={15}/></i></div></button>;
}
function GamesPage({games,desktop,add,launch,remove,changePath,notify}:any){
  return <><PageHeading eyebrow="NEXUS / GAME LIBRARY" title="کتابخانه بازی" desc="بازی‌هایت را در یک‌جا مدیریت کن؛ مسیر اجرایی را انتخاب و از داخل لانچر اجرا کن." action={<button className="btn btn-primary" onClick={()=>add()}><Plus size={16}/> افزودن بازی</button>}/>
    <div className="library-banner"><div className="library-icon"><Gamepad2 size={30}/></div><div><b>کتابخانه شخصی NEXUS</b><span>مسیر فایل‌های اجرایی روی همین رایانه ذخیره می‌شود و برای اجرای بازی به برنامه ویندوز نیاز است.</span></div><div className="banner-count"><strong>{games.length.toLocaleString("fa-IR")}</strong><small>بازی ثبت‌شده</small></div></div>
    <div className="section-head"><div><small>YOUR COLLECTION</small><h2>بازی‌های من</h2></div><span>{desktop?"اجرای مستقیم در نسخه دسکتاپ":"برای اجرای مستقیم، نسخه ویندوز را باز کن"}</span></div>
    <div className="game-grid">{games.map((g:any,i:number)=><div className="game-card" key={g.id}><div className={`game-art ${gameSeeds.find(s=>g.title?.includes(s.name))?.color||["game-blue","game-purple","game-amber"][i%3]}`}><span>{g.title?.slice(0,2).toUpperCase()}</span><small>PC / WINDOWS</small></div><div className="game-info"><div><b>{g.title}</b><small>{g.platform||"Windows"} · {g.install_path?"مسیر ثبت شده":"بدون مسیر اجرا"}</small></div><div className="game-actions"><button className="path-button" onClick={()=>changePath(g)} disabled={!desktop} title="تغییر مسیر اجرا" aria-label="تغییر مسیر اجرا"><FolderOpen size={14}/></button><button className="launch-button" onClick={()=>launch(g)} disabled={!g.install_path||!desktop} title="اجرای بازی" aria-label="اجرای بازی"><Zap size={15}/></button><button className="remove-button" onClick={()=>remove(g.id)} title="حذف از کتابخانه" aria-label="حذف از کتابخانه"><Trash2 size={14}/></button></div></div></div>)}
      {gameSeeds.filter(seed=>!games.some((g:any)=>g.title===seed.name)).map(seed=><div className="game-card seed-card" key={seed.code}><div className={`game-art ${seed.color}`}><span>{seed.code}</span><small>GAME SLOT</small></div><div className="game-info"><div><b>{seed.name}</b><small>{seed.genre}</small></div><button className="add-game-button" onClick={()=>add(seed)} title="افزودن مسیر بازی"><Plus size={16}/></button></div></div>)}
    </div><div className="hint-line"><CircleHelp size={15}/> نسخه وب می‌تواند کتابخانه را مدیریت کند؛ انتخاب فایل EXE و اجرای بازی فقط در برنامه ویندوز فعال است.</div>
  </>;
}
function DNSPage({rows,allRows,custom,results,busy,search,setSearch,filter,setFilter,domain,setDomain,run,add,removeCustom,customName,setCustomName,customIp,setCustomIp,customDoh,setCustomDoh,desktop,refresh,ping,pingHistory,pingTest,pingBusy}:any){
  const [showAdd,setShowAdd]=useState(false);
  const categories: string[] = ["همه", ...Array.from(new Set<string>((allRows as DNSRecord[]).map((r:DNSRecord)=>r.category)))];
  const resultById=new Map(results.map((r:DNSResult)=>[r.id,r]));
  return <><PageHeading eyebrow="NETSCOPE / RESOLVER LAB" title="آزمایشگاه DNS" desc="سرویس‌ها را از مسیر واقعی اتصال خودت آزمایش کن؛ نتیجه به اپراتور، موقعیت و مسیر شبکه وابسته است." action={<button className="btn btn-ghost" onClick={()=>setShowAdd(v=>!v)}><Plus size={16}/> DNS اختصاصی</button>}/>
    <div className="ping-panel panel"><div className="panel-title"><div><small>NETSCOPE / PING MONITOR</small><h3>پایش زندهٔ اتصال</h3></div><span className="connection-mode"><i className={ping?.ok?"live-dot":"ping-dot-off"}/>{desktop?"آزمون از رایانه ویندوز":"برای آزمون مستقیم، نسخه ویندوز را اجرا کن"}</span></div><div className="ping-layout"><div className="ping-metrics"><div><span>میانگین تأخیر</span><b>{fmt(ping?.avgMs)}</b></div><div><span>اتلاف بسته</span><b>{ping?.loss!=null?`${ping.loss}٪`:"—"}</b></div><div><span>بازه پاسخ</span><b>{ping?.minMs!=null&&ping?.maxMs!=null?`${Math.round(ping.minMs)}–${Math.round(ping.maxMs)} ms`:"—"}</b></div></div><div className="ping-chart"><small>۳۰ آزمون اخیر</small><svg viewBox="0 0 280 58" role="img" aria-label="نمودار تاریخچه پینگ"><polyline points={pingHistory.slice(0,30).slice().reverse().map((item:any,index:number)=>`${index*9.2},${Math.max(5,52-Math.min(45,Number(item.avg_ms||0)/4))}`).join(" ")} fill="none" stroke="#5dd9bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{pingHistory.length? `${pingHistory.length} رکورد ذخیره‌شده`:"پس از ورود، تاریخچه ذخیره می‌شود"}</span></div><button className="btn btn-primary ping-run" disabled={!desktop||pingBusy} onClick={pingTest}>{pingBusy?<RefreshCw className="spin" size={15}/>:<Activity size={15}/>} {pingBusy?"در حال اندازه‌گیری":"اجرای Ping"}</button></div><div className="ping-history-list">{pingHistory.slice(0,4).map((item:any)=><span key={item.id} className={item.success&&Number(item.packet_loss)===0?"history-good":"history-bad"}><i/>{new Date(item.tested_at).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})} · {item.success?`${Math.round(Number(item.avg_ms||0))} ms`:"قطع ارتباط"} · اتلاف {Number(item.packet_loss||0)}٪</span>)}</div></div>
    <div className="dns-hero"><div className="dns-orb"><Network size={30}/></div><div className="dns-hero-copy"><small>RESOLVER BENCHMARK</small><h3>کدام DNS در شبکه تو بهتر جواب می‌دهد؟</h3><p>زمان پاسخ، قابلیت Resolve و دسترسی‌پذیری را مقایسه کن؛ این نتایج تضمین سرعت یا امنیت نیستند.</p></div><div className="dns-summary"><b>{results.length?results.filter((r:DNSResult)=>r.ok).length.toLocaleString("fa-IR"):"—"}</b><small>پاسخ موفق</small></div></div>
    {showAdd&&<form className="panel add-dns-form" onSubmit={add}><div className="panel-title"><div><small>CUSTOM RESOLVER</small><h3>افزودن DNS شخصی</h3></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)}>×</button></div><div className="form-grid"><label>نام سرویس<input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="مثلاً DNS منزل" required/></label><label>IPv4 یا IPv6<input value={customIp} onChange={e=>setCustomIp(e.target.value)} placeholder="1.1.1.1 یا 2606:4700:4700::1111"/></label><label className="wide-field">نشانی DNS-over-HTTPS (اختیاری)<input value={customDoh} onChange={e=>setCustomDoh(e.target.value)} placeholder="https://dns.example/dns-query"/></label></div><div className="form-actions"><small>آدرس‌ها فقط برای حساب خودت ذخیره می‌شوند.</small><button className="btn btn-primary" type="submit"><Check size={15}/> ذخیره DNS</button></div></form>}
    <div className="dns-control panel"><div className="control-head"><div><small>TEST CONFIGURATION</small><b>تنظیم آزمایش</b></div><span className="connection-mode"><i className="live-dot"/>{desktop?"تست مستقیم از ویندوز":"تست DoH از مرورگر"}</span></div><div className="dns-inputs"><label><span>دامنه آزمایشی</span><input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com"/></label><label><span>جستجوی سرویس</span><div className="search-wrap"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="نام یا IP سرویس"/></div></label><button className="btn btn-primary run-button" disabled={busy||!domain.trim()} onClick={run}>{busy?<RefreshCw className="spin" size={16}/>:<Activity size={16}/>} {busy?"در حال آزمایش":"شروع تست همه"}</button></div><div className="filter-row">{categories.map((c:string)=><button key={c} onClick={()=>setFilter(c)} className={filter===c?"filter-chip selected":"filter-chip"}>{c}</button>)}<button className="refresh-link" onClick={refresh}><RefreshCw size={13}/> تازه‌سازی</button></div></div>
    <div className="section-head"><div><small>PUBLIC + CUSTOM RESOLVERS</small><h2>فهرست سرویس‌ها</h2></div><span>{rows.length+custom.length} سرویس قابل نمایش</span></div>
    <div className="dns-table-wrap panel"><div className="dns-table-head"><span>سرویس / خانواده</span><span>نشانی‌ها</span><span>نوع آزمایش</span><span>وضعیت / زمان</span></div>
      {rows.map((s:DNSRecord)=>{const r=resultById.get(s.slug) as DNSResult|undefined;return <div className="dns-row" key={s.slug}><div className="dns-name"><span className="dns-logo">{s.name.slice(0,1)}</span><div><b>{s.name}</b><small>{s.category} · <a href={s.source_url||s.website||"#"} target="_blank" rel="noreferrer">منبع اطلاعات</a></small></div></div><div className="ip-stack"><code>{s.primary_ipv4||s.primary_ipv6||"—"}</code><small>{s.secondary_ipv4||s.secondary_ipv6||s.doh_url||"بدون نشانی جایگزین"}</small></div><div className="transport-cell">{desktop?"DNS مستقیم":"DNS-over-HTTPS"}</div><div className="dns-result">{r?<><span className={r.ok?"status-ok":"status-bad"}>{r.ok?<Check size={12}/>:<Activity size={12}/>} {r.status}</span><b>{fmt(r.ms)}</b></>:<span className="status-wait">آزمایش نشده</span>}</div></div>})}
      {custom.map((s:any)=>{const r=resultById.get(s.id) as DNSResult|undefined;return <div className="dns-row" key={s.id}><div className="dns-name"><span className="dns-logo custom-logo">+</span><div><b>{s.name}</b><small>DNS شخصی</small></div></div><div className="ip-stack"><code>{s.ipv4||s.ipv6||"DoH"}</code><small>{s.doh_url||"آدرس ثبت‌شده"}</small></div><div className="transport-cell">{desktop?"DNS مستقیم":"DNS-over-HTTPS"}</div><div className="dns-result">{r?<><span className={r.ok?"status-ok":"status-bad"}>{r.status}</span><b>{fmt(r.ms)}</b></>:<span className="status-wait">آزمایش نشده</span>}<button className="remove-button" onClick={()=>removeCustom(s.id)} title="حذف DNS اختصاصی" aria-label="حذف DNS اختصاصی"><Trash2 size={13}/></button></div></div>})}
      {!rows.length&&!custom.length&&<div className="empty-state">فهرست DNS هنوز بارگذاری نشده است.</div>}
    </div><div className="hint-line"><ShieldCheck size={15}/> تست مرورگر فقط DoH را می‌سنجد. نسخه ویندوز می‌تواند IP resolver را مستقیم از دستگاه آزمایش کند؛ آزمون DNSSEC، نشت DNS و فیلترینگ اختصاصی در مرحله بعدی اضافه می‌شود.</div>
  </>;
}
function GhostPage({session,missions,progress,active,setActive,answer,setAnswer,submit,saving,requireAuth}:any){
  if(!session)return <LockedModule title="Ghost Protocol" desc="پرونده‌های تعاملی و پیشرفت مأموریت‌ها برای حساب‌های واردشده ذخیره می‌شوند." onLogin={requireAuth}/>;
  const current=active;
  const p=current?progress.find((x:any)=>x.mission_id===current.id):null;
  const step=p?.current_step??0;
  const question=current?.steps?.[step];
  return <><PageHeading eyebrow="GHOST PROTOCOL / TRAINING SIM" title="پرونده‌های شبح" desc="در یک محیط داستانی و کاملاً آزمایشی، معماهای شبکه و امنیت را حل کن و XP بگیر." action={<div className="xp-chip"><Trophy size={15}/> {progress.reduce((a:number,b:any)=>a+(b.score||0),0)} امتیاز</div>}/>
    {current&&question?<div className="mission-stage panel"><button className="back-link" onClick={()=>setActive(null)}><ArrowLeft size={14}/> بازگشت به پرونده‌ها</button><div className="mission-progress"><span>مأموریت / {current.title}</span><b>مرحله {step+1} از {current.steps.length}</b></div><div className="progress-track"><i style={{width:`${((step)/current.steps.length)*100}%`}}/></div><div className="mission-terminal"><span>INCOMING TRANSMISSION · SIMULATION</span><h2>{current.briefing}</h2><p>{question.prompt}</p><div className="answer-list">{question.options.map((opt:string,i:number)=><button className={answer===i?"answer-option chosen":"answer-option"} key={i} onClick={()=>setAnswer(i)}><span>{String.fromCharCode(65+i)}</span>{opt}</button>)}</div><button className="btn btn-primary" disabled={answer===null||saving} onClick={submit}>{saving?"در حال بررسی":"ثبت پاسخ و ادامه"} <ArrowLeft size={15}/></button></div></div>:<><div className="ghost-hero"><div className="ghost-graphic"><div className="ghost-ring"/><TerminalSquare size={38}/></div><div><small>TRAINING DIVISION / 04</small><h2>آماده‌ای وارد پرونده شوی؟</h2><p>هر مأموریت یک سناریوی ساختگی آموزشی است؛ هیچ عملیات واقعی روی شبکه انجام نمی‌شود.</p></div></div><div className="mission-grid">{missions.map((m:any)=>{const pr=progress.find((x:any)=>x.mission_id===m.id);return <button className="mission-card" key={m.id} onClick={()=>{if(pr?.status==="completed")return;setActive(m);setAnswer(null);}}><div className="mission-card-top"><span className={`difficulty ${m.difficulty}`}>{m.difficulty}</span><small>+{m.reward_xp} XP</small></div><div className="mission-symbol"><Crosshair size={22}/></div><h3>{m.title}</h3><p>{m.briefing}</p><div className="mission-card-foot"><span>{pr?.status==="completed"?"تکمیل شده":pr? `مرحله ${pr.current_step+1} از ${m.steps.length}`:"شروع مأموریت"}</span><ArrowLeft size={16}/></div></button>})}</div></>}
  </>;
}
function WorldPage({session,player,locations,claims,claim,saving,requireAuth}:any){
  if(!session)return <LockedModule title="Parallel World" desc="جهان موازی به حساب کاربری نیاز دارد تا شخصیت، منابع و قلمروها را ذخیره کند." onLogin={requireAuth}/>;
  const owner=new Map(claims.map((c:any)=>[c.location_id,c]));
  return <><PageHeading eyebrow="PARALLEL WORLD / SECTOR MAP" title="جهان موازی" desc="در نقشه‌ای داستانی حرکت کن، مناطق را تصرف کن و منابع شخصیتت را افزایش بده." action={<div className="world-resources"><span>اعتبار <b>{player?.credits??100}</b></span><span>تجربه <b>{player?.xp??0} XP</b></span><span>انرژی <b>{player?.energy??100}%</b></span></div>}/>
    <div className="world-layout"><div className="world-map panel"><div className="map-top"><div><small>SECTOR GRID / 2049</small><b>نقشه مناطق کشف‌شده</b></div><span className="map-live"><i className="live-dot"/> همگام‌سازی</span></div><div className="map-canvas"><div className="map-grid-lines"/><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="map-lines"><path d="M18 27 L49 45 L68 18 M49 45 L74 72 L22 63 L18 27 M49 45 L86 43" /></svg>{locations.map((loc:any)=>{const claim=owner.get(loc.id) as any;return <button key={loc.id} className={claim?"map-pin claimed":"map-pin"} style={{left:`${loc.map_x}%`,top:`${loc.map_y}%`}} title={loc.name} onClick={()=>claim?null:document.getElementById(`loc-${loc.id}`)?.scrollIntoView({behavior:"smooth",block:"center"})}><span/><small>{loc.name}</small></button>})}<div className="map-compass">N<br/>↑</div></div><div className="map-legend"><span><i/> آزاد</span><span><i className="owned"/> تصرف‌شده</span><span><i className="you"/> موقعیت تو</span></div></div>
    <div className="world-profile panel"><div className="world-emblem"><Globe2 size={30}/></div><small>PLAYER CARD</small><h3>{player?.nickname||profileFallback(session.user.email)}</h3><span className="world-level">سطح {player?.level||1} · {player?.faction||"wanderers"}</span><div className="resource-row"><span>اعتبار</span><b>{player?.credits??100}</b></div><div className="resource-row"><span>انرژی</span><b>{player?.energy??100}%</b></div><div className="resource-row"><span>XP</span><b>{player?.xp??0}</b></div><div className="progress-track"><i style={{width:`${Math.min(100,((player?.xp||0)%500)/5)}%`}}/></div></div></div>
    <div className="section-head"><div><small>EXPANSION / CLAIM ZONES</small><h2>مناطق قابل تصرف</h2></div><span>{claims.length} منطقه تصرف‌شده</span></div><div className="location-grid">{locations.map((loc:any)=>{const c=owner.get(loc.id);return <div className="location-card" id={`loc-${loc.id}`} key={loc.id}><div className="location-tag">{loc.region}</div><h3>{loc.name}</h3><p>{loc.description}</p><div className="location-reward"><span>پاداش منطقه</span><b>+{loc.resource_yield} {loc.resource_type==="credits"?"اعتبار":loc.resource_type==="xp"?"XP":"انرژی"}</b></div><button className={c?"btn btn-ghost full-width":"btn btn-primary full-width"} disabled={Boolean(c)||saving} onClick={()=>claim(loc.id)}>{c?"تصرف‌شده":"تصرف منطقه"} {c?<Check size={15}/>:<MapPin size={15}/>}</button></div>})}</div>
  </>;
}
function profileFallback(email:string){return email?.split("@")[0]||"مسافر";}
function LockedModule({title,desc,onLogin}:any){return <div className="locked-screen panel"><div className="locked-icon"><LockKeyhole size={28}/></div><small>AUTHENTICATION REQUIRED</small><h1>{title}</h1><p>{desc}</p><button className="btn btn-primary" onClick={onLogin}>ورود یا ثبت‌نام <ArrowLeft size={15}/></button></div>;}
function AccountPage({session,profile,network,desktop,logout,startAuth}:any){
  return <><PageHeading eyebrow="ACCOUNT / PREFERENCES" title="حساب و تنظیمات" desc="مدیریت نشست، پروفایل و وضعیت نسخه دسکتاپ."/>
    <div className="account-grid"><div className="panel account-card"><div className="profile-main"><div className="profile-avatar large">{session?(profile?.display_name||session.user.email||"M").slice(0,1).toUpperCase():"?"}</div><div><b>{profile?.display_name||"مهمان"}</b><span>{session?.user?.email||"وارد نشده‌ای"}</span></div></div>{session?<><div className="account-line"><span>شناسه کاربری</span><code>{session.user.id.slice(0,8)}…</code></div><div className="account-line"><span>شناسه عمومی</span><code>{profile?.username||"در انتظار پروفایل"}</code></div><button className="btn btn-ghost full-width" onClick={logout}><LogOut size={15}/> خروج از حساب</button></>:<button className="btn btn-primary full-width" onClick={()=>startAuth("login")}>ورود / ثبت‌نام</button>}</div>
    <div className="panel"><div className="panel-title"><div><small>DEVICE / SYSTEM</small><h3>اطلاعات دستگاه</h3></div><Monitor size={20}/></div><div className="device-list"><div><span>نوع نسخه</span><b>{desktop?"Windows Desktop":"Web Browser"}</b></div><div><span>نام رایانه</span><b>{network?.hostname||"در دسترس نیست"}</b></div><div><span>DNS سیستم</span><b>{network?.dns?.join(" · ")||"فقط در دسکتاپ"}</b></div><div><span>کارت‌های شبکه</span><b>{network?.interfaces?.length??"—"}</b></div></div></div></div>
    <div className="hint-line"><ShieldCheck size={15}/> کلید عمومی Supabase داخل برنامه استفاده می‌شود. کلیدهای مدیریتی و کلید ارسال ایمیل نباید در مخزن یا فایل اجرایی قرار بگیرند.</div>
  </>;
}
function AuthModal({mode,setMode,email,setEmail,password,setPassword,name,setName,username,setUsername,otp,setOtp,newPassword,setNewPassword,showPass,setShowPass,busy,submit,resend,close,notice}:any){
  const verify=mode==="verify-signup"||mode==="verify-recovery";
  const title=mode==="signup"?"ساخت حساب جدید":mode==="forgot"?"بازیابی رمز عبور":mode==="verify-signup"?"تأیید ایمیل":mode==="verify-recovery"?"تأیید بازیابی":mode==="new-password"?"رمز جدید":"ورود به MIXO";
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="auth-modal"><button className="modal-close" onClick={close}>×</button><div className="auth-brand"><div className="brand-mark"><span>M</span><i/></div><div><b>MIXO<span>_</span>GAME</b><small>IDENTITY SYSTEM</small></div></div><div className="auth-eyebrow"><LockKeyhole size={13}/> حساب یکپارچه</div><h2>{title}</h2><p>{mode==="signup"?"یک شناسه بساز تا پیشرفت بازی و تنظیماتت بین وب و ویندوز همراهت باشد.":verify?"کد یک‌بارمصرف ارسال‌شده به ایمیلت را وارد کن.":mode==="new-password"?"رمز تازه و امنی برای حساب خودت انتخاب کن.":mode==="forgot"?"ایمیلت را وارد کن تا راه بازیابی رمز برایت فرستاده شود.":"برای همگام‌سازی اطلاعاتت وارد حساب شو."}</p>
    <form onSubmit={submit}>
      {(mode==="signup"||mode==="login"||mode==="forgot"||verify)&&<label>ایمیل<div className="input-icon"><Mail size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required disabled={verify}/></div></label>}
      {mode==="signup"&&<><label>نام نمایشی<input value={name} onChange={e=>setName(e.target.value)} placeholder="نامی که نمایش داده می‌شود" required/></label><label>شناسه کاربری<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="مثلاً shadow_player" minLength={3} maxLength={24} required/></label></>}
      {(mode==="signup"||mode==="login")&&<label>رمز عبور<div className="input-icon"><LockKeyhole size={16}/><input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="حداقل ۸ نویسه" required minLength={8}/><button type="button" onClick={()=>setShowPass((v:boolean)=>!v)}>{showPass?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>}
      {verify&&<label>کد تأیید ۶ رقمی<input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="••••••" required/></label>}
      {mode==="new-password"&&<label>رمز عبور تازه<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} placeholder="حداقل ۸ نویسه" required/></label>}
      <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy?<RefreshCw className="spin" size={16}/>:<ArrowLeft size={16}/>} {busy?"در حال انجام...":mode==="signup"?"ساخت حساب":mode==="login"?"ورود":mode==="forgot"?"ارسال کد بازیابی":verify?"تأیید کد": "ذخیره رمز تازه"}</button>
    </form>
    <div className="auth-links">{mode==="login"&&<><button onClick={()=>setMode("forgot")}>رمز عبور را فراموش کرده‌ام</button><span>حساب نداری؟ <button onClick={()=>setMode("signup")}>ثبت‌نام</button></span></>}{mode==="signup"&&<span>از قبل حساب داری؟ <button onClick={()=>setMode("login")}>ورود</button></span>}{mode==="forgot"&&<button onClick={()=>setMode("login")}>بازگشت به ورود</button>}{verify&&<button onClick={resend} disabled={busy}>ارسال دوباره کد</button>}{mode==="new-password"&&<button onClick={()=>setMode("login")}>بازگشت به ورود</button>}</div>
    {notice&&<div className="auth-note">{notice}</div>}
    <div className="auth-security"><ShieldCheck size={14}/> رمزها در Supabase Auth نگهداری می‌شوند؛ برنامه به رمز خام دسترسی ذخیره‌ای ندارد.</div>
  </div></div>;
}

export default App;