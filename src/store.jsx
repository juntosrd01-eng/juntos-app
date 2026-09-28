import {createContext,useContext,useEffect,useRef,useState} from 'react'
import * as L from './lib.js'
import {sb} from './supabase.js'
import {cargar,COMIOI,TIPOI,RMAP} from './api.js'
import {buscar} from './geo.js'
export const live=!!sb
const C=createContext();export const useApp=()=>useContext(C)
const blob=async d=>(await fetch(d)).blob(),bad=e=>e&&!/exist|duplicate/i.test(e.message)
export function AppProvider({children}){
const [V,setV]=useState(live?[]:L.seed),[role,setRole]=useState('landing'),[tab,setTab]=useState('ini'),[sel,setSel]=useState(null)
const [d,setD]=useState(L.blank),[sos,setSos]=useState(0),[sheet,setSheet]=useState(null),[msg,setMsg]=useState(''),[otp,setOtp]=useState(false)
const [me,setMe]=useState(live?null:{id:1,nombre:'María'}),[roles,setRoles]=useState([]),[pool,setPool]=useState(live?[]:L.ACO.filter(a=>a.v)),booted=useRef(null)
const myId=me?.id,upd=(id,fn)=>setV(a=>a.map(v=>v.id===id?fn(v):v))
const toast=t=>{setMsg(t);setTimeout(()=>setMsg(''),3600)}
const go=(r,t='ini')=>{setRole(r);setTab(t);setSel(null);scrollTo(0,0)}
const reload=async()=>{try{setV(await cargar())}catch(e){toast('No pude cargar los servicios: '+e.message)}}
const alertas=async rs=>{if(!(rs||roles).includes('admin'))return;const {data}=await sb.from('alertas_sos').select('creado').eq('atendida',false).order('creado',{ascending:false}).limit(1);setSos(data?.[0]?+new Date(data[0].creado):0)}
const boot=async uid=>{if(booted.current===uid)return;booted.current=uid
const [{data:u},{data:r}]=await Promise.all([sb.from('users').select('id,nombre').eq('id',uid).single(),sb.from('user_roles').select('rol').eq('user_id',uid)])
const rs=(r||[]).map(x=>RMAP[x.rol]).filter(Boolean);setMe(u||{id:uid});setRoles(rs);go(rs[0]||'familia');await reload()
if(rs.includes('admin')){const {data}=await sb.from('acompanantes').select('user_id,rating,users(nombre)').eq('verificado',true).eq('activo',true);setPool((data||[]).map(a=>({id:a.user_id,n:a.users?.nombre||'Acompañante',r:a.rating,v:true})));alertas(rs)}}
useEffect(()=>{if(!live){L.seedPhotos(V[2]).then(ci=>upd(3,v=>({...v,ci})));return}
const {data:{subscription}}=sb.auth.onAuthStateChange((ev,s)=>{if(s&&(ev==='INITIAL_SESSION'||ev==='SIGNED_IN'))boot(s.user.id)})
if(new URLSearchParams(location.search).get('pago')==='ok')toast('✅ Pago recibido. En unos segundos verás el servicio como Pagado.')
return()=>subscription.unsubscribe()},[])
useEffect(()=>{if(!live||!me?.id)return;let t;const f=()=>{clearTimeout(t);t=setTimeout(()=>{reload();alertas()},400)}
const ch=sb.channel('juntos');['servicios','checkins','reportes','alertas_sos'].forEach(tb=>ch.on('postgres_changes',{event:'*',schema:'public',table:tb},f));ch.subscribe()
return()=>{clearTimeout(t);sb.removeChannel(ch)}},[me?.id])

const enviarOtp=async(phone,rol)=>{if(!live){setOtp(true);return toast('📲 Código enviado por WhatsApp (demo)')}
const {error}=await sb.auth.signInWithOtp({phone,options:{channel:'whatsapp',data:{rol}}});if(error)return toast('No pudimos enviar el código: '+error.message);setOtp(true);toast('📲 Te enviamos el código por WhatsApp')}
const verificar=async(phone,code)=>{if(!live){if(code==='123456'){setOtp(false);go('familia')}else toast('Código incorrecto. Revisa tu WhatsApp e inténtalo otra vez.');return}
const {error}=await sb.auth.verifyOtp({phone,token:code,type:'sms'});if(error)toast('Código incorrecto o vencido. Pide uno nuevo.');else setOtp(false)}
const salir=async()=>{if(live){await sb.auth.signOut();booted.current=null;setMe(null);setRoles([]);setV([])}go('landing')}

const crear=async()=>{if(!d.dir||!d.ab)return toast('Faltan el nombre y la dirección.')
let {lat,lng}=d
if(lat==null){const r=(await buscar(d.dir,d.prov))[0];if(r)({lat,lng}=r);else{const c=L.PC[d.prov]||[18.9,-70.4];lat=c[0]+Math.random()*.03;lng=c[1]+Math.random()*.03}}
if(!live){const id=Date.now();setV(a=>[{...d,id,fam:role==='diaspora'?'Carmen Núñez (NY)':'Familia RD',lat,lng,estado:'Pendiente',aco:0,ci:[],rep:null,rt:0},...a]);setD(L.blank());setTab('ini');setSel(id);return setSheet({t:'pago',id})}
const {data,error}=await sb.from('servicios').insert({solicitante_id:myId,pagador_id:role==='diaspora'?myId:null,beneficiario:d.ab,tipo:TIPOI[d.tipo],inicio:new Date(d.fecha+'T'+d.hora).toISOString(),provincia:d.prov,direccion:d.dir,lat,lng,notas:d.notas||null,addons:d.add}).select('id').single()
if(error)return toast('No se pudo crear el servicio: '+error.message);setD(L.blank());await reload();setTab('ini');setSel(data.id);setSheet({t:'pago',id:data.id})}
const cobrar=async(id,m)=>{if(!live){upd(id,v=>({...v,estado:'Pagado',pago:m}));setSheet(null);return toast('✅ Pago recibido por '+m+'. WhatsApp enviado (demo).')}
const {data,error}=await sb.functions.invoke('crear-pago',{body:{servicio_id:id,metodo:m.toLowerCase()}})
if(error||!data?.url)return toast(data?.error||'No pudimos abrir el pago. Inténtalo de nuevo.');location.href=data.url}
const asignar=async(id,a)=>{if(!a)return
if(!live){upd(id,v=>({...v,aco:+a,estado:'Asignado',acoInfo:{n:pool.find(p=>p.id==a).n,r:pool.find(p=>p.id==a).r}}));return toast('Asignada. WhatsApp enviado (demo).')}
const {error}=await sb.from('servicios').update({acompanante_id:a}).eq('id',id);if(error)return toast('No se pudo asignar: '+error.message);await reload();toast('Asignada. La acompañante y la familia recibirán WhatsApp.')}
const resch=id=>{const v=V.find(x=>x.id===id);setD({...L.blank(),tipo:v.tipo,add:[...v.add],prov:v.prov,dir:v.dir,ab:v.ab,notas:v.notas});setSel(null);setTab('sol')}
const rate=async(id,rt)=>{if(live){const {error}=await sb.from('calificaciones').insert({servicio_id:id,estrellas:rt});if(error)return toast('Ya calificaste este servicio.');await reload()}else upd(id,v=>({...v,rt}));toast('Gracias por calificar ⭐')}

// Check-in / check-out: GPS obligatorio + foto con marca de agua (+ reporte y video en out)
const marcar=async(id,t,{file,rep,video})=>{const v=V.find(x=>x.id===id);toast('Obteniendo GPS…')
const g=await L.gps(v);if(live&&g.sim)return toast('Activa el GPS y permite la ubicación para hacer el '+(t==='in'?'check-in':'check-out')+'.')
const ts=Date.now(),foto=await L.mark(file,[(t==='in'?'Check-in ':'Check-out ')+L.tm(ts)+' · '+(me?.nombre||'Acompañante'),L.dt(ts)+' · '+g.lat.toFixed(5)+', '+g.lng.toFixed(5)])
if(!live){upd(id,x=>({...x,ci:[...x.ci,{t,ts,lat:g.lat,lng:g.lng,foto,sim:g.sim}],estado:t==='in'?'En curso':'Completado',rep:t==='out'?{...rep,video:video&&URL.createObjectURL(video)}:x.rep}))
if(t==='out')setSel(null);return toast(t==='in'?'✅ Check-in guardado. Familia avisada por WhatsApp (demo).':'✅ Reporte enviado a la diáspora por WhatsApp (demo).')}
try{if(t==='out'){let vp=null
if(video){vp=id+'/abrazo.'+(video.name.split('.').pop()||'mp4');const {error}=await sb.storage.from('reportes-videos').upload(vp,video,{contentType:video.type||'video/mp4'});if(bad(error))throw error}
const {error}=await sb.from('reportes').insert({servicio_id:id,comio:COMIOI[rep.comio],pastilla:rep.pastilla,animo:rep.animo,nota:rep.nota||null,video_path:vp});if(bad(error))throw error}
const path=id+'/'+t+'.jpg',up=await sb.storage.from('checkin-fotos').upload(path,await blob(foto),{contentType:'image/jpeg'});if(bad(up.error))throw up.error
const ins=await sb.from('checkins').insert({servicio_id:id,tipo:t,lat:g.lat,lng:g.lng,precision_m:g.acc?Math.round(g.acc):null,foto_path:path});if(ins.error)throw ins.error
await reload();if(t==='out')setSel(null);toast(t==='in'?'✅ Check-in guardado. Avisamos a la familia por WhatsApp.':'✅ Reporte enviado a la diáspora por WhatsApp.')}
catch(e){toast('No se pudo guardar: '+e.message)}}

const alerta=async()=>{setSheet({t:'sos'});if(!live)return setSos(Date.now())
const s=V.find(x=>x.aco===myId&&x.estado==='En curso')||V.find(x=>x.aco===myId),g=await L.gps(s||{lat:18.9,lng:-70.4})
const {error}=await sb.from('alertas_sos').insert({acompanante_id:myId,servicio_id:s?.id||null,lat:g.sim?null:g.lat,lng:g.sim?null:g.lng});if(error)toast('No se pudo enviar la alerta. Llama a la Mesa ahora.')}
const atenderSos=async()=>{setSos(0);if(live)await sb.from('alertas_sos').update({atendida:true,atendida_por:myId}).eq('atendida',false)}
return <C.Provider value={{V,role,tab,setTab,sel,setSel,d,setD,sos,setSos,sheet,setSheet,msg,otp,setOtp,go,toast,crear,cobrar,asignar,resch,rate,marcar,alerta,atenderSos,live,me,myId,roles,pool,salir,enviarOtp,verificar}}>{children}</C.Provider>}
