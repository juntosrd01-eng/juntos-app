import {sb} from './supabase.js'
export const TIPO={'4h':4,'8h':8,'noche_12h':12},TIPOI={4:'4h',8:'8h',12:'noche_12h'}
export const RMAP={familia:'familia',diaspora:'diaspora',acompanante:'aco',admin:'admin'}
const EST={pendiente:'Pendiente',pagado:'Pagado',asignado:'Asignado',en_curso:'En curso',completado:'Completado',cancelado:'Cancelado'}
const COMIO={bien:'Comió bien',poco:'Comió poco',nada:'No quiso comer'}
export const COMIOI=Object.fromEntries(Object.entries(COMIO).map(([k,v])=>[v,k]))
const one=x=>Array.isArray(x)?x[0]:x
const sign=async(bucket,paths)=>{paths=paths.filter(Boolean);if(!paths.length)return {}
const {data}=await sb.storage.from(bucket).createSignedUrls(paths,3600);return Object.fromEntries((data||[]).map(x=>[x.path,x.signedUrl]))}
// Carga servicios (RLS filtra por rol) y los deja en la misma forma que usa la UI
export async function cargar(){
const {data,error}=await sb.from('servicios').select('*,checkins(*),reportes(*),calificaciones(*)').order('inicio',{ascending:false});if(error)throw error
const ids=[...new Set(data.map(s=>s.solicitante_id))]
const [{data:pub},{data:us}]=await Promise.all([sb.from('acompanante_publica').select('*'),sb.from('users').select('id,nombre').in('id',ids)])
const fotos=await sign('checkin-fotos',data.flatMap(s=>s.checkins.map(c=>c.foto_path))),vids=await sign('reportes-videos',data.map(s=>one(s.reportes)?.video_path))
return data.map(s=>{const i=new Date(s.inicio),r=one(s.reportes),cal=one(s.calificaciones),p=(pub||[]).find(x=>x.servicio_id===s.id)
return {id:s.id,fam:(us||[]).find(u=>u.id===s.solicitante_id)?.nombre||'Familia',ab:s.beneficiario,tipo:TIPO[s.tipo],fecha:i.toLocaleDateString('sv'),hora:i.toTimeString().slice(0,5),
prov:s.provincia,dir:s.direccion,notas:s.notas||'',lat:s.lat,lng:s.lng,add:s.addons||[],estado:EST[s.estado],aco:s.acompanante_id||0,acoInfo:p?{n:p.nombre||'Acompañante',r:p.rating}:null,
ci:s.checkins.map(c=>({t:c.tipo,ts:+new Date(c.ts),lat:c.lat,lng:c.lng,foto:fotos[c.foto_path],fuera:c.fuera_de_rango})).sort((a,b)=>a.ts-b.ts),
rep:r?{comio:COMIO[r.comio],pastilla:r.pastilla,animo:r.animo,nota:r.nota,video:vids[r.video_path]}:null,rt:cal?.estrellas||0}})}
