import {useApp,live} from './store.jsx'
import {R,U,T,AD,total,dt} from './lib.js'
import {Landing,Login} from './views/Public.jsx'
import Familia from './views/Familia.jsx'
import Acompanante from './views/Acompanante.jsx'
import Admin from './views/Admin.jsx'

const ROLES=[['familia','👨‍👩‍👧 Familia RD'],['diaspora','✈️ Diáspora'],['aco','💙 Acompañante'],['admin','🗺️ Mesa Op.']]

function Sheet(){
  const {sheet,setSheet,V,cobrar,role}=useApp()
  if(!sheet)return null
  const v=V.find(x=>x.id===sheet.id),dia=role==='diaspora'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={e=>e.target===e.currentTarget&&setSheet(null)}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5">
        {sheet.t==='pago'&&(
          <>
            <h2 className="text-xl font-bold">Pago · {R(total(v))}</h2>
            <div className={'opt '+(dia?'':'on')} onClick={()=>cobrar(v.id,'Azul')}>
              🇩🇴 <span>Azul Dominicana</span><b className="ml-auto">{R(total(v))}</b>
            </div>
            <div className={'opt '+(dia?'on':'')} onClick={()=>cobrar(v.id,'Stripe')}>
              💳 <span>Stripe (USA/España)</span><b className="ml-auto">{U(total(v))}</b>
            </div>
            <p className="mu">Demo: simula el pago. En producción abre el link de Azul o Stripe Checkout.</p>
          </>
        )}
        {sheet.t==='factura'&&(
          <>
            <h2 className="text-xl font-bold">Factura JUNTOS #{1000+(v.id%1000)}</h2>
            <p className="mu">{dt(v.fecha)} · {v.ab} · {v.prov}</p>
            <div className="flex justify-between"><span>{T[v.tipo].n}</span><span>{R(T[v.tipo].p)}</span></div>
            {v.add.map(k=><div key={k} className="flex justify-between"><span>{AD[k].n}</span><span>{R(AD[k].p)}</span></div>)}
            <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{R(total(v))}</span></div>
            <button className="btn" onClick={()=>print()}>Guardar como PDF / Imprimir</button>
          </>
        )}
        {sheet.t==='sos'&&(
          <>
            <h2 className="text-xl font-bold text-red-600">🚨 Alerta SOS enviada</h2>
            <p>La Mesa Operacional recibió tu ubicación y te llamará ahora.</p>
            <button className="btn" onClick={()=>setSheet(null)}>Entendido</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function App(){
  const {role,go,msg,alerta,roles,salir}=useApp()
  if(role==='landing')return <Landing/>
  if(role==='login')return <Login/>
  const View={aco:Acompanante,admin:Admin}[role]||Familia

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-28 font-sans text-slate-900">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white py-2.5">
        <div className="flex items-center justify-between">
          {/* Al hacer clic en el logo o en el nombre JUNTOS, vuelve al inicio */}
          <button 
            type="button"
            onClick={()=>go('landing')} 
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-left transition-opacity hover:opacity-80 active:scale-95"
            title="Ir al inicio"
          >
            <img src="/logo-juntos.jpg" alt="JUNTOS" className="h-8 w-8 rounded-lg object-contain bg-black" />
            <span className="text-xl font-black tracking-tight text-slate-900">JUNTOS</span>
          </button>
          <button className="btn btn-g btn-s" onClick={salir}>Salir</button>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {ROLES.filter(([k])=>!live||roles.includes(k)).map(([k,l])=>(
            <button 
              key={k} 
              onClick={()=>go(k)} 
              className={'flex-none rounded-full border px-3 py-1.5 text-xs font-semibold '+(role===k?'border-[#1B9DF5] bg-[#1B9DF5] text-white':'border-slate-200 text-slate-700 hover:bg-slate-50')}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mu !text-xs mt-1">{live?'':'Modo demo: cambia de rol para ver cada pantalla'}</p>
      </div>

      <View/>
      <Sheet/>

      {role==='aco'&&<button onClick={alerta} className="fixed bottom-20 right-3.5 z-40 size-16 rounded-full border-4 border-white bg-red-600 font-bold text-white shadow-lg">SOS</button>}
      {msg&&<div className="fixed bottom-20 left-1/2 z-50 max-w-[90%] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{msg}</div>}
    </div>
  )
}