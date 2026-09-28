import {useEffect,useState} from 'react'
import {useApp,live} from '../store.jsx'
import {buscar,geoOn} from '../geo.js'
import {T,AD,PROV,ACO,R,U,tm,dt,total,cot,today} from '../lib.js'
import {Chip,Map,Nav} from './Shared.jsx'
const NAV=[['ini','🏠','Servicios'],['sol','➕','Solicitar']]
function Solicitar({dia}){const {d,setD,crear}=useApp(),t=cot(d.tipo,d.add),set=(k,v)=>setD(x=>({...x,[k]:v})),[sug,setSug]=useState([])
useEffect(()=>{if(!geoOn||d.lat!=null){setSug([]);return}const h=setTimeout(async()=>setSug(await buscar(d.dir,d.prov)),350);return()=>clearTimeout(h)},[d.dir,d.prov,d.lat])
return <div><h2 className="mt-4 mb-2 text-xl font-bold">Solicitar acompañamiento</h2>
<label className="lbl">¿Quién será acompañado?</label><input className="inp" value={d.ab} placeholder="Ej: Don Pedro" onChange={e=>set('ab',e.target.value)}/>
<label className="lbl">Tipo de servicio</label>{Object.entries(T).map(([k,x])=><div key={k} className={'opt '+(d.tipo==k?'on':'')} onClick={()=>set('tipo',+k)}><span>{x.n}</span><b className="ml-auto">{R(x.p)}</b></div>)}
<div className="mt-2 flex gap-2"><div className="flex-1"><label className="lbl">Fecha</label><input className="inp" type="date" min={today} value={d.fecha} onChange={e=>set('fecha',e.target.value)}/></div><div className="flex-1"><label className="lbl">Hora</label><input className="inp" type="time" value={d.hora} onChange={e=>set('hora',e.target.value)}/></div></div>
<label className="lbl">Provincia</label><select className="inp" value={d.prov} onChange={e=>setD(x=>({...x,prov:e.target.value,lat:null,lng:null}))}>{PROV.map(p=><option key={p}>{p}</option>)}</select>
<label className="lbl">Dirección</label><input className="inp !mb-1" value={d.dir} placeholder="Calle, número, sector" onChange={e=>setD(x=>({...x,dir:e.target.value,lat:null,lng:null}))}/>
{sug.map(s=><div key={s.t} className="opt !my-1 text-sm" onClick={()=>{setD(x=>({...x,dir:s.t,lat:s.lat,lng:s.lng}));setSug([])}}>📍 {s.t}</div>)}
{d.lat!=null&&<p className="mu !text-green-700">✅ Ubicación confirmada en el mapa</p>}
<a className="mu" target="_blank" rel="noopener" href={'https://www.google.com/maps/search/'+encodeURIComponent(d.dir+' '+d.prov+' República Dominicana')}>📍 Verificar en Google Maps</a>
<label className="lbl mt-3 block">Notas (Alzheimer, movilidad, cuidados)</label><textarea className="inp" rows={3} value={d.notas} onChange={e=>set('notas',e.target.value)}/>
<label className="lbl">Add-ons</label>{Object.entries(AD).map(([k,x])=><div key={k} className={'opt '+(d.add.includes(k)?'on':'')} onClick={()=>set('add',d.add.includes(k)?d.add.filter(a=>a!==k):[...d.add,k])}><span>{x.i} {x.n}</span><b className="ml-auto">+{R(x.p)}</b></div>)}
<div className="card"><div className="flex justify-between"><span>Base</span><span>{R(T[d.tipo].p)}</span></div>{d.add.map(k=><div key={k} className="flex justify-between"><span>{AD[k].n}</span><span>{R(AD[k].p)}</span></div>)}
<div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{R(t)}{dia&&' · '+U(t)}</span></div></div>
<button className="btn btn-y" onClick={crear}>Confirmar y pagar</button></div>}
function Detalle({v,dia}){const {setSel,setSheet,rate,resch}=useApp(),a=v.acoInfo
const pts=[{lat:v.lat,lng:v.lng,c:'#0A4DA1',l:v.ab,big:1},...v.ci.map(c=>({lat:c.lat,lng:c.lng,c:c.t==='in'?'#FFC20E':'#2aa84a',l:c.t==='in'?'IN':'OUT'}))]
return <div><button className="btn btn-g btn-s mt-3" onClick={()=>setSel(null)}>‹ Volver</button>
<div className="flex items-center justify-between"><h2 className="text-xl font-bold">{v.ab}</h2><Chip e={v.estado}/></div><p className="mu">{T[v.tipo].n} · {dt(v.fecha)} {v.hora} · {v.dir}, {v.prov}</p>
{a&&<div className="card">💙 <b>{a.n}</b> · ⭐ {a.r} · Verificada con cédula y antecedentes · Chaleco azul</div>}
{v.estado==='Pendiente'&&<button className="btn btn-y" onClick={()=>setSheet({t:'pago',id:v.id})}>Pagar {R(total(v))}</button>}
<h2 className="mt-4 mb-2 text-xl font-bold">Timeline</h2>
<div className="my-2 ml-2 border-l-4 border-sun pl-3.5">{v.ci.length?v.ci.map(c=><div key={c.ts} className="mb-4"><span className="mu">{dt(c.ts)}</span><br/>
{c.t==='in'?<b>{a?.n?.split(' ')[0]||'Tu acompañante'} llegó {tm(c.ts)}</b>:<><b>Check-out {tm(c.ts)}</b>{v.rep&&<><br/>{v.ab}: {v.rep.comio.toLowerCase()}, {v.rep.pastilla?'tomó su pastilla':'sin pastilla hoy'}. Ánimo {v.rep.animo}/5.{v.rep.nota&&<><br/><i>“{v.rep.nota}”</i></>}</>}</>}
<img className="mt-1.5 w-full rounded-2xl" src={c.foto} alt="Foto con marca de agua"/><p className="mu">📍 {c.lat.toFixed(4)}, {c.lng.toFixed(4)}{c.sim&&' (GPS simulado)'}{c.fuera&&' · fuera del radio del domicilio'}</p></div>)
:<b>{v.estado==='Asignado'?'Acompañante asignada. Esperando check-in.':'Aún sin novedades.'}</b>}</div>
{v.add.includes('video')&&v.rep&&<><h2 className="mt-4 mb-2 text-xl font-bold">🎥 Video-Abrazo</h2>{v.rep.video?<video controls playsInline className="w-full rounded-2xl" src={v.rep.video}/>:<div className="rounded-2xl bg-brand p-6 text-center text-white">▶️ “Hola mija, estoy bien”<br/><span className="text-sm text-blue-200">Video de 30s (demo)</span></div>}</>}
{v.ci.length>0&&<><h2 className="mt-4 mb-2 text-xl font-bold">Ubicación (solo check-in/out)</h2><Map pts={pts}/></>}
{v.estado==='Completado'&&<><h2 className="mt-4 mb-2 text-xl font-bold">Califica a la acompañante</h2><div>{[1,2,3,4,5].map(i=><button key={i} className={'text-3xl '+(i<=v.rt?'text-sun':'text-slate-300')} onClick={()=>rate(v.id,i)}>★</button>)}</div>
<button className="btn btn-g" onClick={()=>setSheet({t:'factura',id:v.id})}>🧾 Ver factura (PDF)</button><button className="btn btn-y" onClick={()=>resch(v.id)}>🔁 Re-agendar</button></>}</div>}
export default function Familia(){const {V,role,tab,setTab,sel,setSel,setSheet}=useApp(),dia=role==='diaspora',v=V.find(x=>x.id===sel)
const L=live?V:V.filter(x=>dia?x.fam.startsWith('Carmen'):x.fam.startsWith('Luis')||x.fam==='Familia RD')
return <>{tab==='sol'?<Solicitar dia={dia}/>:v?<Detalle v={v} dia={dia}/>:<div><h2 className="mt-4 mb-2 text-xl font-bold">{dia?'Hola Carmen 👋':'Hola, familia'}</h2>
{L.map(x=><div key={x.id} className="card cursor-pointer" onClick={()=>setSel(x.id)}><div className="flex justify-between"><h3 className="font-semibold">{x.ab}</h3><Chip e={x.estado}/></div><p className="mu">{T[x.tipo].n} · {dt(x.fecha)} {x.hora} · {x.prov}</p><div className="flex justify-between"><b>{dia?U(total(x)):R(total(x))}</b><span className="mu">Ver detalle ›</span></div></div>)}</div>}
<Nav a={NAV} tab={tab} setTab={setTab} sel={sel} setSel={setSel}/></>}
