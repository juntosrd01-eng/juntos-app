export const T={4:{n:'4 horas',p:2200},8:{n:'8 horas',p:4000},12:{n:'Noche Respiro 12h',p:3500}}
export const AD={video:{n:'Video-Abrazo',p:300,i:'🎥'},med:{n:'Chequeo de medicación',p:250,i:'💊'}}
export const MARGEN=0.32 // visible solo para admin
export const PROV='Azua,Bahoruco,Barahona,Dajabón,Distrito Nacional,Duarte,El Seibo,Elías Piña,Espaillat,Hato Mayor,Hermanas Mirabal,Independencia,La Altagracia,La Romana,La Vega,María Trinidad Sánchez,Monseñor Nouel,Monte Cristi,Monte Plata,Pedernales,Peravia,Puerto Plata,Samaná,San Cristóbal,San José de Ocoa,San Juan,San Pedro de Macorís,Sánchez Ramírez,Santiago,Santiago Rodríguez,Santo Domingo,Valverde'.split(',')
export const PC={'Santiago':[19.45,-70.69],'Distrito Nacional':[18.47,-69.93],'Santo Domingo':[18.5,-69.85],'La Vega':[19.22,-70.53],'Puerto Plata':[19.79,-70.69],'San Cristóbal':[18.42,-70.1]}
const NM='María,Altagracia,Yolanda,Carmen,Josefina,Ramona,Milagros,Mercedes,Esperanza,Dulce'.split(','),AP='Pérez,Rodríguez,Santana,Núñez,Peña,Reyes'.split(',')
export const ACO=Array.from({length:30},(_,i)=>({id:i+1,n:i?NM[i%10]+' '+AP[i%6]:'María Altagracia Pérez',r:(4.6+((i*7)%5)/12).toFixed(1),v:i!==29}))
export const today=new Date().toISOString().slice(0,10)
export const R=n=>'RD$'+n.toLocaleString('es-DO'), U=n=>'US$'+(n/60).toFixed(2)
export const tm=d=>new Date(d).toLocaleTimeString('es-DO',{hour:'numeric',minute:'2-digit'})
export const dt=d=>new Date(d).toLocaleDateString('es-DO',{day:'numeric',month:'short'})
export const cot=(tipo,add)=>T[tipo].p+add.reduce((x,k)=>x+AD[k].p,0)
export const total=v=>cot(v.tipo,v.add)
export const blank=()=>({tipo:8,add:[],fecha:today,hora:'09:00',prov:'Santiago',dir:'',notas:'',ab:'',lat:null,lng:null})

// Marca de agua: hora, fecha y ubicación sobre la foto (o placeholder si no hay cámara)
export function mark(file,lines){return new Promise(res=>{const c=document.createElement('canvas'),x=c.getContext('2d')
const go=im=>{const w=640,h=im?Math.round(im.height*w/im.width):480;c.width=w;c.height=h
if(im)x.drawImage(im,0,0,w,h);else{const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#0A4DA1');g.addColorStop(1,'#FFC20E');x.fillStyle=g;x.fillRect(0,0,w,h);x.font='110px serif';x.textAlign='center';x.fillText('👵🏽🤝',w/2,h/2);x.textAlign='left'}
x.fillStyle='rgba(0,0,0,.62)';x.fillRect(0,h-66,w,66);x.fillStyle='#fff';x.font='bold 16px sans-serif';lines.forEach((t,i)=>x.fillText(t,12,h-45+i*20));x.fillStyle='#FFC20E';x.fillText('JUNTOS',w-84,h-45);res(c.toDataURL('image/jpeg',.72))}
if(!file)return go();const im=new Image();im.onload=()=>go(im);im.onerror=()=>go();im.src=URL.createObjectURL(file)})}

// GPS del dispositivo; si falla, coordenadas simuladas cerca del servicio (solo demo)
export const gps=s=>new Promise(r=>{const f=()=>r({lat:s.lat+(Math.random()-.5)*8e-4,lng:s.lng+(Math.random()-.5)*8e-4,sim:true})
if(!navigator.geolocation)return f()
navigator.geolocation.getCurrentPosition(p=>r({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy}),f,{enableHighAccuracy:true,timeout:7000,maximumAge:0})})

const ayer=new Date(Date.now()-864e5).toISOString().slice(0,10)
export const seed=()=>[
{id:1,fam:'Carmen Núñez (NY)',ab:'Don Pedro',tipo:4,fecha:today,hora:'09:00',prov:'Santiago',dir:'C/ del Sol #45, Los Jardines',notas:'Movilidad reducida, usa bastón.',lat:19.4517,lng:-70.697,add:['video','med'],estado:'Asignado',aco:1,ci:[],rep:null,rt:0},
{id:2,fam:'Luis Reyes (Madrid)',ab:'Doña Rosa',tipo:12,fecha:today,hora:'20:00',prov:'Distrito Nacional',dir:'Av. Independencia #310, Gazcue',notas:'Alzheimer inicial. No dejar sola con la estufa.',lat:18.462,lng:-69.905,add:['med'],estado:'Pagado',aco:0,ci:[],rep:null,rt:0},
{id:3,fam:'Carmen Núñez (NY)',ab:'Don Pedro',tipo:4,fecha:ayer,hora:'09:00',prov:'Santiago',dir:'C/ del Sol #45, Los Jardines',notas:'',lat:19.4517,lng:-70.697,add:['video'],estado:'Completado',aco:1,ci:[],rep:{comio:'Comió bien',pastilla:true,animo:5,nota:'Rezamos juntos y vimos la novela.'},rt:5}]
export async function seedPhotos(v){const a=new Date(v.fecha+'T09:02'),b=new Date(v.fecha+'T13:05')
return [{t:'in',ts:+a,lat:v.lat,lng:v.lng,foto:await mark(0,['María llegó · '+tm(a),dt(a)+' · '+v.lat.toFixed(4)+', '+v.lng.toFixed(4)])},{t:'out',ts:+b,lat:v.lat,lng:v.lng,foto:await mark(0,['Check-out · '+tm(b),dt(b)+' · GPS verificado'])}]}
