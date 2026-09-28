import {useApp} from '../store.jsx'
import {T,R,dt,tm,total,MARGEN} from '../lib.js'
import {Chip,Map} from './Shared.jsx'
export default function Admin(){const {V,sos,atenderSos,asignar,pool}=useApp()
const pts=V.map(v=>({lat:v.lat,lng:v.lng,l:v.ab,c:v.estado==='En curso'?'#FFC20E':v.estado==='Completado'?'#999':'#0A4DA1',big:v.estado==='En curso'}))
const mg=V.filter(v=>v.estado!=='Pendiente').reduce((s,v)=>s+total(v)*MARGEN,0)
return <div>{sos>0&&<div className="card !bg-red-600 text-white"><b>🚨 SOS de una acompañante · {tm(sos)}</b><br/>Llamar de inmediato.<button className="btn btn-y btn-s ml-2" onClick={atenderSos}>Atendida</button></div>}
<h2 className="mt-4 mb-2 text-xl font-bold">Mesa operacional</h2><Map pts={pts}/>
<div className="my-2.5 flex gap-2"><div className="card !m-0 flex-1"><span className="mu">Servicios</span><h3 className="font-bold">{V.length}</h3></div><div className="card !m-0 flex-1"><span className="mu">Margen 32% (solo admin)</span><h3 className="font-bold">{R(Math.round(mg))}</h3></div></div>
{V.map(v=><div key={v.id} className="card"><div className="flex justify-between"><h3 className="font-semibold">{v.ab}</h3><Chip e={v.estado}/></div>
<p className="mu">{T[v.tipo].n} · {dt(v.fecha)} {v.hora} · {v.prov}<br/>Total {R(total(v))} · margen {R(Math.round(total(v)*MARGEN))}</p>
{v.estado==='Pagado'?<select className="inp" defaultValue="" onChange={e=>asignar(v.id,e.target.value)}><option value="">Asignar del pool ({pool.length} verificadas)…</option>{pool.map(a=><option key={a.id} value={a.id}>{a.n} · ⭐{a.r}</option>)}</select>:v.aco>0&&<p>💙 {v.acoInfo?.n||'Asignada'}</p>}
<a className="btn btn-y btn-s" target="_blank" rel="noopener" href={'https://wa.me/18095550101?text='+encodeURIComponent('JUNTOS: servicio de '+v.ab+' a las '+v.hora)}>WhatsApp</a></div>)}</div>}
