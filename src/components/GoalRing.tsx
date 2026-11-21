/** Anillo de progreso con el color de la etapa de crecimiento (decorativo: el porcentaje se expone aparte). */
export function GoalRing({percent,stage,label,size=64}:{percent:number;stage:number;label:string;size?:number}) {
  const r=26,c=2*Math.PI*r,value=Math.min(100,Math.max(0,percent));
  return <span className={`av-goal-ring av-stage-${stage}`} style={{width:size,height:size}} aria-hidden="true">
    <svg viewBox="0 0 64 64" width={size} height={size} focusable="false">
      <circle className="av-goal-ring-track" cx="32" cy="32" r={r}/>
      <circle className="av-goal-ring-value" cx="32" cy="32" r={r} strokeDasharray={`${c*value/100} ${c}`} transform="rotate(-90 32 32)"/>
    </svg>
    <span className="av-goal-ring-label">{label}</span>
  </span>;
}
