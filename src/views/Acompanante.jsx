import {useState} from 'react'
import {useApp} from '../store.jsx'
import {T,tm} from '../lib.js'
import {Chip} from './Shared.jsx'
function Trabajo({v}){const {marcar,setSel}=useApp(),inn=v.ci.find(c=>c.t==='in')
const [file,setFile]=useState(null),[ok,setOk]=useState(false),[video,setVideo]=useState(),[busy,setBusy]=useState(false)
const [rep,setRep]=useState({comio:'Comió bien',pastilla:true,animo:5,nota:''}),set=(k,x)=>setRep(r=>({...r,[k]:x}))
const send=async t=>{setBusy(true);await marcar(v.id,t,{file,rep,video});setBusy(false)}
return <div><button className="btn btn-g btn-s mt-3" onClick={()=>setSel(null)}>‹ Volver</button><h2 className="text-xl font-bold">{v.ab}</h2><p className="mu">{v.dir}, {v.prov}<br/>📝 {v.notas||'Sin notas'}</p>
{!inn?<div className="card"><h3 className="font-semibold">1. Check-in</h3><p className="mu">Se exige GPS y foto de llegada con marca de agua.</p>
<label className="lbl">📸 Foto de llegada</label><input className="inp" type="file" accept="image/*" capture="environment" onChange={e=>{setFile(e.target.files[0]);setOk(true)}}/>
<button className="btn btn-y" disabled={!ok||busy} onClick={()=>send('in')}>📍 CHECK-IN ahora</button>{!ok&&<button className="btn btn-g btn-s" onClick={()=>setOk(true)}>Usar foto demo</button>}</div>
:<><div className="card"><Chip e="Asignado"/> Check-in {tm(inn.ts)}<img className="mt-2 w-full rounded-xl" src={inn.foto}/></div>
<div className="card"><h3 className="font-semibold">2. Mini-reporte y check-out</h3>
<label className="lbl">¿Cómo comió?</label><select className="inp" value={rep.comio} onChange={e=>set('comio',e.target.value)}><option>Comió bien</option><option>Comió poco</option><option>No quiso comer</option></select>
<label className="lbl">¿Tomó su pastilla?</label><select className="inp" value={rep.pastilla?'1':'0'} onChange={e=>set('pastilla',e.target.value==='1')}><option value="1">Sí</option><option value="0">No / no aplica</option></select>
<label className="lbl">Ánimo (1–5): {rep.animo}</label><input className="inp" type="range" min="1" max="5" value={rep.animo} onChange={e=>set('animo',+e.target.value)}/>
<label className="lbl">Nota</label><textarea className="inp" rows={2} value={rep.nota} placeholder="Ej: Rezamos y vimos la novela" onChange={e=>set('nota',e.target.value)}/>
{v.add.includes('video')&&<><label className="lbl">🎥 Video-Abrazo (30s)</label><input className="inp" type="file" accept="video/*" capture="user" onChange={e=>setVideo(e.target.files[0])}/></>}
<label className="lbl">📸 Foto final</label><input className="inp" type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files[0])}/>
<button className="btn btn-y" disabled={busy} onClick={()=>send('out')}>✅ CHECK-OUT y enviar reporte</button></div></>}</div>}
export default function Acompanante(){const {V,sel,setSel,myId,me}=useApp(),v=V.find(x=>x.id===sel),m=V.filter(x=>x.aco===myId&&x.estado!=='Completado')
if(v)return <Trabajo key={v.id+v.estado} v={v}/>
return <div><h2 className="mt-4 mb-2 text-xl font-bold">Buenos días, {me?.nombre?.split(' ')[0]||'María'} 👋</h2><div className="card">🪪 Verificada · Chaleco azul · ⭐ 4.9</div><h3 className="font-semibold">Mis servicios de hoy</h3>
{m.length?m.map(x=><div key={x.id} className="card cursor-pointer" onClick={()=>setSel(x.id)}><div className="flex justify-between"><h3 className="font-semibold">{x.ab}</h3><Chip e={x.estado}/></div><p className="mu">{T[x.tipo].n} · {x.hora}<br/>{x.dir}</p><p className="mu">📝 {x.notas||'Sin notas'}</p><div className="btn">Abrir servicio</div></div>):<div className="card">No tienes servicios asignados.</div>}</div>}
