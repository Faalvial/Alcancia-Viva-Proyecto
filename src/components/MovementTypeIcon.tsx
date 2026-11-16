import { ArrowDownCircle, ArrowUpCircle, Droplets } from 'lucide-react';
import type { Movement } from '../live/client';

/** Nombre, icono y tono semántico de cada tipo de movimiento (tokens --c-gasto/--c-ingreso/--c-ahorro). */
export const MOVEMENT_META = {
  expense:{name:'Gasto',plural:'Gastos',Icon:ArrowDownCircle,tone:'gasto'},
  income:{name:'Ingreso',plural:'Ingresos',Icon:ArrowUpCircle,tone:'ingreso'},
  savings:{name:'Ahorro',plural:'Ahorros',Icon:Droplets,tone:'ahorro'},
} as const;

export function MovementTypeIcon({type,size=24,className=''}:{type:Movement['type'];size?:number;className?:string}) {
  const {Icon,tone}=MOVEMENT_META[type];
  return <span className={`av-type-icon av-tone-${tone} ${className}`} aria-hidden="true"><Icon size={size} strokeWidth={2}/></span>;
}
