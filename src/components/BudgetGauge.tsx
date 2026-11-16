import type React from 'react';
import { soles } from '../live/domain';
import { budgetTone, weekDailyExpenses } from '../live/timeline';
import type { Movement } from '../live/client';

const ARC_LENGTH = Math.PI * 80;
const INITIALS = ['L','M','M','J','V','S','D'];

/** Barra con solo las esquinas superiores redondeadas, apoyada en la línea base. */
function barPath(x:number,y:number,w:number,h:number,r=4) {
  const radius=Math.min(r,w/2,h);
  return `M${x} ${y+h}V${y+radius}Q${x} ${y} ${x+radius} ${y}H${x+w-radius}Q${x+w} ${y} ${x+w} ${y+radius}V${y+h}Z`;
}

/**
 * Presupuesto semanal: medidor semicircular cuyo color pasa gradualmente de verde a
 * ámbar al acercarse al límite (nunca rojo), y mini-gráfica de gastos de lunes a hoy.
 * El medidor expone role="meter"; la gráfica tiene una tabla equivalente para lectores.
 */
export function BudgetGauge({spent,budget,movements,today}:{spent:number;budget:number;movements:Movement[];today:string}) {
  const ratio=budget>0?Math.min(1,Math.max(0,spent/budget)):0;
  const tone=budgetTone(spent,budget);
  const color=`color-mix(in oklab, var(--c-ingreso) ${Math.round(tone*100)}%, var(--c-ahorro))`;
  const week=weekDailyExpenses(movements,today);
  const peak=Math.max(1,...week.map(day=>day.amount||0));
  const percent=budget>0?Math.round(spent/budget*100):0;
  return <div className="av-budget">
    <div className="av-gauge" role="meter" aria-label="Gasto respecto al presupuesto semanal"
      aria-valuemin={0} aria-valuemax={budget} aria-valuenow={Math.min(spent,budget)}
      aria-valuetext={`${soles(spent)} de ${soles(budget)}, ${percent} % del presupuesto`}
      style={{'--av-gauge-color':color} as React.CSSProperties}>
      <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false">
        <path className="av-gauge-track" d="M20 100 A80 80 0 0 1 180 100"/>
        <path className="av-gauge-value" d="M20 100 A80 80 0 0 1 180 100" strokeDasharray={`${ARC_LENGTH*ratio} ${ARC_LENGTH}`} opacity={ratio>0?1:0}/>
      </svg>
      <div className="av-gauge-text"><strong>{soles(spent)}</strong><span>de {soles(budget)}</span></div>
    </div>
    <figure className="av-week">
      <figcaption>Esta semana, día a día</figcaption>
      <svg viewBox="0 0 224 88" aria-hidden="true" focusable="false">
        {week.map((day,index)=>{
          const x=index*32,height=day.amount?Math.max(3,day.amount/peak*60):0;
          return <g key={day.day} className={`av-week-day ${day.today?'is-today':''} ${day.amount===null?'is-future':''}`}>
            <title>{day.amount===null?`${day.name}: aún no llega`:`${day.name}: ${soles(day.amount)}`}</title>
            <rect className="av-week-hit" x={x} y="0" width="32" height="88"/>
            {day.amount===null?<line className="av-week-future" x1={x+9} x2={x+23} y1="66" y2="66"/>:
              height>0?<path className="av-week-bar" d={barPath(x+9,66-height,14,height)}/>:<line className="av-week-zero" x1={x+9} x2={x+23} y1="66" y2="66"/>}
            <text className="av-week-label" x={x+16} y="84" textAnchor="middle">{INITIALS[index]}</text>
          </g>;
        })}
        <line className="av-week-base" x1="0" x2="224" y1="66.5" y2="66.5"/>
      </svg>
      <div className="av-sr-only"><table>
        <caption>Gastos de esta semana por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Gasto</th></tr></thead>
        <tbody>{week.filter(day=>day.amount!==null).map(day=><tr key={day.day}><th scope="row">{day.today?`${day.name} (hoy)`:day.name}</th><td>{soles(day.amount||0)}</td></tr>)}</tbody>
      </table></div>
    </figure>
  </div>;
}
