import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import api, { getApiError } from "./api";
import { useAuth } from "./AuthContext";
import { COMPLAINT_STATUSES, COMPLAINT_TYPES, GOVERNORATES, ROLES, type Complaint, type ComplaintStatus, type ComplaintType, type Department, type Rating, type Role, type Station, type User } from "./types";
import { dateLabel, durationLabel, netResolutionSeconds, roleHome, roleLabel, statusLabel, typeLabel } from "./utils";

type NavItem = { label: string; path: string };
const navByRole: Record<Role, NavItem[]> = {
  administrator: [{label:"Dashboard",path:"dashboard"},{label:"Stations",path:"stations"},{label:"Users",path:"users"},{label:"Departments",path:"departments"},{label:"Complaints",path:"complaints"}],
  manager: [{label:"Dashboard",path:"dashboard"},{label:"My Complaints",path:"complaints"},{label:"New Complaint",path:"new-complaint"}],
  assistant: [{label:"Dashboard",path:"dashboard"},{label:"Complaints",path:"complaints"},{label:"Departments",path:"departments"}],
  intervenant: [{label:"Dashboard",path:"dashboard"},{label:"My Assignments",path:"complaints"}],
  director: [{label:"Dashboard",path:"dashboard"},{label:"All Complaints",path:"complaints"},{label:"Ratings",path:"ratings"}]
};
const labelFor = (items: {value:string;label:string}[], value:string) => items.find(x=>x.value===value)?.label || value;
function AppShell() {
  const {user,logout} = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{from:location.pathname}} />;
  if (location.pathname.split("/")[1] !== user.role) return <Navigate to={roleHome(user.role)} replace/>;
  const nav = navByRole[user.role] || [];
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" to={roleHome(user.role)}><img src="https://agilenergy.com.tn/fr/images/logoagilenergy.jpg" alt="AGIL"/><span>AGIL <small>Station Complaints</small></span></Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{nav.map(item=><NavLink key={item.path} item={item} role={user.role}/>)}</nav>
      <div className="sidebar-bottom"><div className="avatar">{user.email.slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{user.email}</strong><span>{roleLabel(user.role)}</span></div><button className="icon-btn" title="Sign out" onClick={logout}>↪</button></div>
    </aside>
    <main className="main"><header className="topbar"><div><span className="eyebrow">SNDP AGIL · OPERATIONS</span><h1>{nav.find(x=>location.pathname.includes("/"+x.path))?.label || "Workspace"}</h1></div><div className="topbar-right"><span className="online-dot"/> System online</div></header>
      <div className="content"><Routes>
        <Route path=":role/dashboard" element={<Dashboard/>}/>
        <Route path=":role/stations" element={<StationsPage/>}/>
        <Route path=":role/users" element={<UsersPage/>}/>
        <Route path=":role/departments" element={<DepartmentsPage/>}/>
        <Route path=":role/complaints" element={<ComplaintsPage/>}/>
        <Route path="manager/new-complaint" element={<NewComplaint/>}/>
        <Route path="director/ratings" element={<RatingsPage/>}/>
        <Route path="*" element={<Navigate to={roleHome(user.role)} replace/>}/>
      </Routes></div>
    </main>
  </div>;
}
function NavLink({item,role}:{item:NavItem;role:Role}) {
  const location=useLocation(); const active=location.pathname.includes("/"+item.path);
  return <Link className={active?"nav-link active":"nav-link"} to={`/${role}/${item.path}`}><span className="nav-mark">{item.label.slice(0,1)}</span>{item.label}</Link>;
}
function PageHeader({title,description,action}:{title:string;description?:string;action?:ReactNode}) {
  return <div className="page-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>;
}
function Stat({label,value,detail,accent="yellow"}:{label:string;value:ReactNode;detail:string;accent?:string}) {
  return <div className="stat-card"><span className={"stat-accent "+accent}/><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}
function useLoad<T>(url:string) {
  const [data,setData]=useState<T[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const refresh=useCallback(async()=>{if(!url){setData([]);setLoading(false);setError("");return;}setLoading(true);setError("");try{const r=await api.get<T[]>(url);setData(r.data);}catch(e){setError(getApiError(e));}finally{setLoading(false);}},[url]);
  useEffect(()=>{void refresh();},[refresh]);
  return {data,setData,loading,error,refresh};
}
function Dashboard() {
  const {user}=useAuth();
  const role=user!.role;
  const complaints=useLoad<Complaint>("/complaints");
  const stations=useLoad<Station>("/stations");
  const users=useLoad<User>(role==="administrator"?"/users":"");
  const departments=useLoad<Department>(role==="administrator"?"/departments":"");
  const ratings=useLoad<Rating>(role==="director"||role==="administrator"?"/ratings":"");
  const active=complaints.data.filter(x=>!["resolved","on_hold"].includes(x.status)).length;
  const resolved=complaints.data.filter(x=>x.status==="resolved").length;
  const stats=role==="administrator"?[
    ["Total stations",stations.data.length,"Registered locations","yellow"],["Active stations",stations.data.filter(x=>x.is_active).length,"Currently operational","green"],["Total users",users.data.length,"Across all roles","blue"],["Pending approvals",users.data.filter(x=>!x.is_active).length,"Awaiting activation","orange"],["Total complaints",complaints.data.length,"All reported issues","purple"],["Open complaints",active,"Require attention","red"]
  ]:role==="manager"?[
    ["My complaints",complaints.data.length,"Reported by your stations","yellow"],["Open",complaints.data.filter(x=>x.status==="open").length,"Awaiting review","blue"],["In progress",complaints.data.filter(x=>x.status==="in_progress"||x.status==="assigned").length,"Being handled","purple"],["Resolved",resolved,"Completed complaints","green"]
  ]:role==="assistant"?[
    ["Total complaints",complaints.data.length,"Visible complaints","yellow"],["Awaiting dispatch",complaints.data.filter(x=>x.status==="open").length,"Ready to assign","orange"],["In progress",active,"Active workflow","blue"],["Resolved",resolved,"Completed","green"]
  ]:role==="intervenant"?[
    ["My assignments",complaints.data.length,"Assigned to you","yellow"],["To handle",complaints.data.filter(x=>x.status==="assigned").length,"New assignments","orange"],["In progress",complaints.data.filter(x=>x.status==="in_progress").length,"Currently working","blue"],["Resolved",resolved,"Completed by you","green"]
  ]:[
    ["All complaints",complaints.data.length,"Network-wide overview","yellow"],["Open / active",active,"Need attention","orange"],["Resolved",resolved,"Ready for review","green"],["Average rating",ratings.data.length?(ratings.data.reduce((a,b)=>a+b.rating_score,0)/ratings.data.length).toFixed(1)+"/5":"—","Intervenant performance","purple"]
  ];
  return <><PageHeader title="Overview" description={`Welcome back, ${user!.email}. Here is your operational snapshot.`}/>
    <div className="stats-grid">{stats.map(s=><Stat key={s[0]} label={String(s[0])} value={s[1] as ReactNode} detail={String(s[2])} accent={String(s[3])}/>)}</div>
    <section className="panel"><div className="panel-heading"><div><h3>Recent complaints</h3><p>Latest activity across your workspace</p></div><Link className="text-link" to={`/${role}/complaints`}>View all →</Link></div><ComplaintTable complaints={complaints.data.slice(0,6)} compact/></section>
    {complaints.error&&<Notice kind="error">{complaints.error}</Notice>}
    {role==="administrator"&&<section className="panel"><div className="panel-heading"><div><h3>Department coverage</h3><p>Complaint types and assigned intervenants</p></div><Link className="text-link" to="/administrator/departments">Manage departments →</Link></div><div className="coverage-grid">{departments.data.map(d=><div className="coverage-item" key={d.id}><span className="coverage-dot"/><strong>{typeLabel(d.complaint_type)}</strong><small>{d.intervenant_id?"Intervenant assigned":"Needs assignment"}</small></div>)}</div></section>}
  </>;
}
function Notice({kind,children}:{kind:"error"|"success"|"info";children:ReactNode}){return <div className={"notice "+kind}>{children}</div>}
function ComplaintTable({complaints,compact=false,onAction}:{complaints:Complaint[];compact?:boolean;onAction?:(c:Complaint)=>ReactNode}) {
  if(!complaints.length)return <div className="empty">No complaints found.</div>;
  return <div className="table-wrap"><table><thead><tr><th>Complaint</th><th>Type</th><th>Severity</th><th>Status</th><th>Created</th>{!compact&&<th>Station</th>}{onAction&&<th>Action</th>}</tr></thead><tbody>{complaints.map(c=><tr key={c.id}><td><strong>#{c.id} · {c.title}</strong><small>{c.description}</small></td><td>{typeLabel(c.type)}</td><td><span className={"severity s"+c.severity}>{c.severity>=4?"High":c.severity===3?"Medium":"Low"}</span></td><td><span className={"status "+c.status}>{statusLabel(c.status)}</span></td><td>{dateLabel(c.created_at)}</td>{!compact&&<td>Station #{c.station_id}</td>}{onAction&&<td>{onAction(c)}</td>}</tr>)}</tbody></table></div>;
}
function ComplaintsPage() {
  const {user}=useAuth(); const role=user!.role;
  const {data:complaints,loading,error,refresh}=useLoad<Complaint>("/complaints");
  const {data:stations}=useLoad<Station>("/stations");
  const {data:users}=useLoad<User>(role==="assistant"?"/intervenants":"");
  const [filter,setFilter]=useState("all"); const [typeFilter,setTypeFilter]=useState("all");
  const [notice,setNotice]=useState(""); const [failure,setFailure]=useState("");
  const [modal,setModal]=useState<{kind:string;complaint:Complaint}|null>(null);
  const [notes,setNotes]=useState(""); const [score,setScore]=useState(5); const [assignee,setAssignee]=useState(""); const [nextStatus,setNextStatus]=useState<"resolved"|"on_hold">("resolved");
  const visible=complaints.filter(c=>(filter==="all"||c.status===filter)&&(typeFilter==="all"||c.type===typeFilter));
  const run=async(fn:()=>Promise<unknown>,message:string)=>{try{await fn();setNotice(message);setFailure("");setModal(null);setNotes("");await refresh();}catch(e){setFailure(getApiError(e));}};
  const openModal=(kind:string,c:Complaint)=>{setModal({kind,complaint:c});setNotes("");setAssignee("");setScore(5);setNextStatus("resolved");};
  const actions=(c:Complaint)=>{
    if(role==="assistant")return <div className="actions">{c.status==="open"&&<><button className="btn small" onClick={()=>void run(()=>api.post(`/complaints/${c.id}/send`,{}),"Complaint sent to its department.")}>Auto-send</button><button className="btn secondary small" onClick={()=>openModal("assign",c)}>Assign</button></>}</div>;
    if(role==="intervenant")return <div className="actions">{c.status==="assigned"&&<button className="btn small" onClick={()=>void run(()=>api.put(`/complaints/${c.id}/status`,{status:"in_progress"}),"Complaint marked in progress.")}>Handle</button>}{["assigned","in_progress"].includes(c.status)&&<button className="btn secondary small" onClick={()=>openModal("status",c)}>Update</button>}</div>;
    if(role==="manager"&&c.status==="resolved")return c.manager_feedback?<span className="muted">Feedback sent</span>:<button className="btn secondary small" onClick={()=>openModal("feedback",c)}>Feedback</button>;
    if(role==="director"&&c.status==="resolved")return <button className="btn secondary small" onClick={()=>openModal("rate",c)}>Rate</button>;
    if(role==="administrator")return <button className="btn danger small" onClick={()=>{if(confirm(`Delete complaint #${c.id}?`))void run(()=>api.delete(`/complaints/${c.id}`),"Complaint deleted.");}}>Delete</button>;
    return null;
  };
  return <><PageHeader title={role==="manager"?"My Complaints":role==="intervenant"?"My Assignments":role==="director"?"All Complaints":"Complaints"} description="Track, review and manage reported station issues." action={role==="manager"?<Link className="btn" to="/manager/new-complaint">＋ New complaint</Link>:null}/>
    {notice&&<Notice kind="success">{notice}</Notice>}{failure&&<Notice kind="error">{failure}</Notice>}{error&&<Notice kind="error">{error}</Notice>}
    <div className="toolbar"><label>Status <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{COMPLAINT_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label>Type <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">All types</option>{COMPLAINT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><span className="result-count">{visible.length} results</span></div>
    <section className="panel">{loading?<div className="loading">Loading complaints…</div>:<ComplaintTable complaints={visible} onAction={actions}/>}</section>
    {modal&&<Modal title={modal.kind==="assign"?"Assign intervenant":modal.kind==="status"?"Update complaint":modal.kind==="feedback"?"Share your feedback":"Rate intervenant performance"} onClose={()=>setModal(null)}><p className="modal-intro">Complaint #{modal.complaint.id} · {modal.complaint.title}</p>
      {modal.kind==="assign"&&<Field label="Active intervenant"><select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Select intervenant</option>{users.filter(u=>u.role==="intervenant"&&u.is_active).map(u=><option key={u.id} value={u.id}>{u.email}</option>)}</select></Field>}
      {modal.kind==="status"&&<><Field label="New status"><select value={nextStatus} onChange={e=>setNextStatus(e.target.value as "resolved"|"on_hold")}><option value="resolved">Resolved</option><option value="on_hold">On hold</option></select></Field><Field label="Resolution notes / reason"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}/></Field></>}
      {modal.kind==="feedback"&&<Field label="Feedback"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} minLength={5}/></Field>}
      {modal.kind==="rate"&&<Field label="Performance score"><div className="score-picker">{[1,2,3,4,5].map(n=><button key={n} className={score===n?"score selected":"score"} onClick={()=>setScore(n)}>{n}</button>)}</div></Field>}
      <div className="modal-actions"><button className="btn secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn" onClick={()=>{const c=modal.complaint;if(modal.kind==="assign")void run(()=>api.put(`/complaints/${c.id}/assign`,{assigned_to_id:Number(assignee)}),"Complaint assigned.");if(modal.kind==="status"){const status=nextStatus;void run(()=>api.put(`/complaints/${c.id}/status`,{status,resolution_notes:notes||undefined}),"Complaint updated.");}if(modal.kind==="feedback")void run(()=>api.post(`/complaints/${c.id}/feedback`,{feedback:notes}),"Feedback submitted.");if(modal.kind==="rate")void run(()=>api.post("/ratings",{complaint_id:c.id,rating_score:score}),"Rating submitted.");}} disabled={(modal.kind==="assign"&&!assignee)||(modal.kind==="feedback"&&notes.trim().length<5)}>Confirm</button></div>
    </Modal>}
    {stations.length===0&&role==="manager"&&<Notice kind="info">No station data is available.</Notice>}
  </>;
}
function NewComplaint(){
 const {data:stations}=useLoad<Station>("/stations"); const {user}=useAuth(); const assignedStations=stations.filter(s=>s.manager_id===user?.id); const [form,setForm]=useState({title:"",description:"",type:"technical" as ComplaintType,severity:3,station_id:""});const [error,setError]=useState("");const [saving,setSaving]=useState(false);const nav=useNavigate();
 const submit=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{await api.post("/complaints",{...form,station_id:form.station_id?Number(form.station_id):undefined});nav("/manager/complaints");}catch(x){setError(getApiError(x));}finally{setSaving(false);}};
 return <><PageHeader title="New complaint" description="Report an issue at one of your assigned stations."/><section className="panel form-panel">{error&&<Notice kind="error">{error}</Notice>}<form onSubmit={submit} className="form-grid"><Field label="Complaint title"><input required maxLength={150} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Briefly describe the issue"/></Field><Field label="Station"><select required value={form.station_id} onChange={e=>setForm({...form,station_id:e.target.value})}><option value="">Select your station</option>{assignedStations.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></Field><Field label="Complaint type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value as ComplaintType})}>{COMPLAINT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></Field><Field label="Severity"><select value={form.severity} onChange={e=>setForm({...form,severity:Number(e.target.value)})}><option value="1">1 · Low</option><option value="2">2 · Minor</option><option value="3">3 · Medium</option><option value="4">4 · High</option><option value="5">5 · Critical</option></select></Field><div className="span-2"><Field label="Description"><textarea required rows={6} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe what happened, when it started, and any relevant details."/></Field></div><div className="form-actions"><button className="btn" disabled={saving}>{saving?"Submitting…":"Submit complaint"}</button></div></form></section></>;
}
function StationsPage(){
 const {data:stations,loading,error,refresh}=useLoad<Station>("/stations");const {data:users}=useLoad<User>("/users");const [modal,setModal]=useState<Station|null|false>(false);const [notice,setNotice]=useState("");const [failure,setFailure]=useState("");
 const [form,setForm]=useState({name:"",code:"",address:"",governorate:"Tunis",manager_id:""});
 const edit=(s?:Station)=>{setForm(s?{name:s.name,code:s.code,address:s.address||"",governorate:s.governorate,manager_id:s.manager_id?String(s.manager_id):""}:{name:"",code:"",address:"",governorate:"Tunis",manager_id:""});setModal(s||null);};
 const save=async(e:FormEvent)=>{e.preventDefault();try{let station:Station;if(modal){const r=await api.put<Station>(`/stations/${modal.id}`,{name:form.name,address:form.address,governorate:form.governorate});station=r.data;}else{const r=await api.post<Station>("/stations",{name:form.name,code:form.code,address:form.address||null,governorate:form.governorate});station=r.data;}await api.put(`/stations/${station.id}/manager`,{manager_id:form.manager_id?Number(form.manager_id):null});setModal(false);setNotice("Station saved.");setFailure("");await refresh();}catch(e){setFailure(getApiError(e));}};
 const remove=async(s:Station)=>{if(!confirm(`Delete station ${s.name}?`))return;try{await api.delete(`/stations/${s.id}`);setNotice("Station deleted.");await refresh();}catch(e){setFailure(getApiError(e));}};
 return <><PageHeader title="Stations" description="Manage service locations, station details and manager assignments." action={<button className="btn" onClick={()=>edit()}>＋ Add station</button>}/>{notice&&<Notice kind="success">{notice}</Notice>}{(error||failure)&&<Notice kind="error">{failure||error}</Notice>}<section className="panel">{loading?<div className="loading">Loading stations…</div>:<div className="table-wrap"><table><thead><tr><th>Code</th><th>Station</th><th>Governorate</th><th>Manager</th><th>Status</th><th>Actions</th></tr></thead><tbody>{stations.map(s=><tr key={s.id}><td><strong>{s.code}</strong></td><td>{s.name}<small>{s.address}</small></td><td>{s.governorate}</td><td>{users.find(u=>u.id===s.manager_id)?.email||"Unassigned"}</td><td><span className={"status "+(s.is_active?"resolved":"on_hold")}>{s.is_active?"Active":"Inactive"}</span></td><td><div className="actions"><button className="btn secondary small" onClick={()=>edit(s)}>Edit</button><button className="btn danger small" onClick={()=>void remove(s)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>
 {modal!==false&&<Modal title={modal?"Edit station":"Create station"} onClose={()=>setModal(false)}><form onSubmit={save} className="form-grid"><Field label="Station code"><input required disabled={!!modal} value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></Field><Field label="Station name"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Address"><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field><Field label="Governorate"><select value={form.governorate} onChange={e=>setForm({...form,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</select></Field><div className="span-2"><Field label="Station manager"><select value={form.manager_id} onChange={e=>setForm({...form,manager_id:e.target.value})}><option value="">Unassigned</option>{users.filter(u=>u.role==="manager").map(u=><option key={u.id} value={u.id}>{u.email}</option>)}</select></Field></div><div className="modal-actions span-2"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn">Save station</button></div></form></Modal>}</>;
}
function UsersPage(){
 const {data:users,loading,error,refresh}=useLoad<User>("/users");const [modal,setModal]=useState(false);const [form,setForm]=useState({email:"",password:"",role:"manager"});const [failure,setFailure]=useState("");
 const create=async(e:FormEvent)=>{e.preventDefault();try{await api.post("/users",form);setModal(false);setForm({email:"",password:"",role:"manager"});await refresh();}catch(e){setFailure(getApiError(e));}};
 const update=async(u:User,active:boolean)=>{try{await api.put(`/users/${u.id}/${active?"activate":"deactivate"}`,{});await refresh();}catch(e){setFailure(getApiError(e));}};
 const remove=async(u:User)=>{if(!confirm(`Delete user ${u.email}?`))return;try{await api.delete(`/users/${u.id}`);await refresh();}catch(e){setFailure(getApiError(e));}};
 return <><PageHeader title="Users" description="Create accounts, approve registrations and manage access." action={<button className="btn" onClick={()=>setModal(true)}>＋ Create user</button>}/>{failure&&<Notice kind="error">{failure}</Notice>}{error&&<Notice kind="error">{error}</Notice>}<section className="panel">{loading?<div className="loading">Loading users…</div>:<div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.email}</strong></td><td>{roleLabel(u.role)}</td><td><span className={"status "+(u.is_active?"resolved":"on_hold")}>{u.is_active?"Active":"Pending"}</span></td><td><div className="actions"><button className="btn secondary small" onClick={()=>void update(u,!u.is_active)}>{u.is_active?"Deactivate":"Approve"}</button><button className="btn danger small" onClick={()=>void remove(u)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>{modal&&<Modal title="Create user" onClose={()=>setModal(false)}><form onSubmit={create} className="form-stack"><Field label="Email"><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Temporary password"><input type="password" minLength={8} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field><Field label="Role"><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></Field><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn">Create user</button></div></form></Modal>}</>;
}
function DepartmentsPage(){
 const {user}=useAuth();const {data:departments,loading,error,refresh}=useLoad<Department>("/departments");const {data:users}=useLoad<User>(user!.role==="administrator"?"/users":"");const [modal,setModal]=useState<Department|null|false>(false);const [form,setForm]=useState({name:"",complaint_type:"technical",intervenant_id:""});const [failure,setFailure]=useState("");
 const create=()=>{setForm({name:"",complaint_type:"technical",intervenant_id:""});setModal(null);};
 const save=async(e:FormEvent)=>{e.preventDefault();try{if(modal){await api.put(`/departments/${modal.id}`,{name:form.name,intervenant_id:form.intervenant_id?Number(form.intervenant_id):null});}else{await api.post("/departments",{name:form.name,complaint_type:form.complaint_type,intervenant_id:form.intervenant_id?Number(form.intervenant_id):null});}setModal(false);await refresh();}catch(e){setFailure(getApiError(e));}};
 const assign=(d:Department)=>{setForm({name:d.name,complaint_type:d.complaint_type,intervenant_id:d.intervenant_id?String(d.intervenant_id):""});setModal(d);};
 return <><PageHeader title="Departments" description="Map complaint categories to the teams responsible for resolving them." action={user!.role==="administrator"?<button className="btn" onClick={create}>＋ Add department</button>:null}/>{failure&&<Notice kind="error">{failure}</Notice>}{error&&<Notice kind="error">{error}</Notice>}{loading?<div className="loading">Loading departments…</div>:<div className="department-grid">{departments.map(d=><article className="department-card" key={d.id}><div className="dept-top"><span className="dept-symbol">{typeLabel(d.complaint_type).slice(0,1)}</span><span className="status assigned">Configured</span></div><h3>{d.name}</h3><p>{typeLabel(d.complaint_type)} complaints</p><div className="dept-assignee"><small>ASSIGNED INTERVENANT</small><strong>{users.find(u=>u.id===d.intervenant_id)?.email||"Not assigned"}</strong></div>{user!.role==="administrator"&&<button className="btn secondary full" onClick={()=>assign(d)}>{d.intervenant_id?"Change intervenant":"Assign intervenant"}</button>}</article>)}</div>}{modal!==false&&<Modal title={modal?"Assign intervenant":"Create department"} onClose={()=>setModal(false)}><form onSubmit={save} className="form-stack">{!modal&&<><Field label="Department name"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Complaint type"><select value={form.complaint_type} onChange={e=>setForm({...form,complaint_type:e.target.value})}>{COMPLAINT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></Field></>}<Field label="Intervenant"><select value={form.intervenant_id} onChange={e=>setForm({...form,intervenant_id:e.target.value})}><option value="">Unassigned</option>{users.filter(u=>u.role==="intervenant"&&u.is_active).map(u=><option key={u.id} value={u.id}>{u.email}</option>)}</select></Field><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn">Save</button></div></form></Modal>}</>;
}
function RatingsPage(){
 const {data:ratings,loading,error}=useLoad<Rating>("/ratings");const {data:users}=useLoad<User>("");const {data:complaints}=useLoad<Complaint>("/complaints");
 return <><PageHeader title="Performance ratings" description="Review director assessments and intervenant resolution performance."/><div className="stats-grid"><Stat label="Total ratings" value={ratings.length} detail="Submitted assessments"/><Stat label="Average score" value={ratings.length?(ratings.reduce((a,b)=>a+b.rating_score,0)/ratings.length).toFixed(1)+"/5":"—"} detail="Across all rated complaints" accent="green"/><Stat label="Rated intervenants" value={new Set(ratings.map(r=>r.intervenant_id)).size} detail="With recorded feedback" accent="blue"/></div><section className="panel">{error&&<Notice kind="error">{error}</Notice>}{loading?<div className="loading">Loading ratings…</div>:<div className="table-wrap"><table><thead><tr><th>Complaint</th><th>Intervenant</th><th>Rating</th><th>Resolution time</th><th>Rated on</th></tr></thead><tbody>{ratings.map(r=><tr key={r.id}><td>#{r.complaint_id} · {complaints.find(c=>c.id===r.complaint_id)?.title||"Complaint"}</td><td>{users.find(u=>u.id===r.intervenant_id)?.email||`User #${r.intervenant_id}`}</td><td><span className="rating-stars">{"★".repeat(r.rating_score)}{"☆".repeat(5-r.rating_score)}</span> {r.rating_score}/5</td><td>{r.resolution_time_hours.toFixed(1)} hours</td><td>{dateLabel(r.created_at)}</td></tr>)}</tbody></table></div>}</section></>;
}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}>×</button></div>{children}</section></div>}
function LoginPage(){
 const {user,login,register}=useAuth();const nav=useNavigate();const loc=useLocation();const [signup,setSignup]=useState(loc.pathname==="/register");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [role,setRole]=useState("manager");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{if(user)nav(roleHome(user.role),{replace:true});},[user,nav]);
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{if(signup){await register(email,password,role);setSignup(false);setError("Account created. Sign in after an administrator activates it.");}else{const u=await login(email,password);nav((loc.state as {from?:string}|null)?.from||roleHome(u.role),{replace:true});}}catch(e){setError(e instanceof Error?e.message:"Authentication failed");}finally{setBusy(false);}};
 return <div className="auth-screen"><div className="auth-visual"><img src="https://agilenergy.com.tn/fr/images/logoagilenergy.jpg" alt="AGIL"/><div><span className="eyebrow">SNDP AGIL · OPERATIONS PLATFORM</span><h1>Every station.<br/>One connected workflow.</h1><p>Centralize complaints, coordinate interventions and improve service quality across the network.</p></div><small>INTERNAL MANAGEMENT PORTAL</small></div><div className="auth-side"><form className="auth-card" onSubmit={submit}><div className="eyebrow">WELCOME {signup?"ABOARD":"BACK"}</div><h2>{signup?"Create your account":"Sign in to AGIL"}</h2><p>{signup?"Request access to the complaints platform.":"Access your station operations workspace."}</p>{error&&<Notice kind={error.startsWith("Account created")?"success":"error"}>{error}</Notice>}<Field label="Email address"><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@agil.com.tn"/></Field><Field label="Password"><input type="password" autoComplete={signup?"new-password":"current-password"} minLength={signup?8:1} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/></Field>{signup&&<Field label="Requested role"><select value={role} onChange={e=>setRole(e.target.value)}>{ROLES.filter(r=>r.value!=="administrator").map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></Field>}<button className="btn auth-submit" disabled={busy}>{busy?"Please wait…":signup?"Create account":"Sign in"}</button><div className="auth-switch">{signup?"Already have an account?":"New to the platform?"} <button type="button" onClick={()=>{setSignup(!signup);setError("");}}>{signup?"Sign in":"Request access"}</button></div></form></div></div>;
}
function GuardedApp(){const {user,ready}=useAuth();const location=useLocation();if(!ready)return <div className="boot-screen"><div className="loader"/>Restoring secure session…</div>;if(!user)return <Routes><Route path="/login" element={<LoginPage/>}/><Route path="/register" element={<LoginPage/>}/><Route path="*" element={<Navigate to="/login" replace state={{from:location.pathname}}/>}/></Routes>;return <Routes><Route path="/*" element={<AppShell/>}/><Route path="*" element={<Navigate to={roleHome(user.role)} replace/>}/></Routes>;}
export default function App(){return <BrowserRouter><AuthProvider><GuardedApp/></AuthProvider></BrowserRouter>;}
