import { useState } from 'react';
import { Mascot } from './Mascot';
import type { MascotMood } from './Mascot';
import { DEFAULT_PET_NAME, PET_NAME_SUGGESTIONS, capitalized, petNameOf } from '../live/companion';

/**
 * Saludo de la mascota al entrar al jardín: «Buenas tardes, Lucía» y lo que pasó en
 * tu semana, contado con calidez. Si la alcancía aún no tiene nombre, lo pide aquí.
 */
export function CompanionGreeting({greeting,name,petName,mood,lines,growth,busy,onNamePet}:{
  greeting:string;name:string;petName:string;mood:MascotMood;lines:string[];growth:number;busy:boolean;
  onNamePet:(name:string)=>Promise<void>|void;
}) {
  const pet=petNameOf(petName);
  const [draft,setDraft]=useState('');
  const unnamed=pet===DEFAULT_PET_NAME;
  return <section className="av-greeting" aria-labelledby="av-greeting-title">
    <Mascot mood={mood} growth={growth} size={112} className="av-greeting-mascot"/>
    <div className="av-greeting-bubble">
      <p id="av-greeting-title" className="av-greeting-title">{greeting}{name?`, ${name}`:''}.</p>
      {lines.map(line=><p key={line}>{line}</p>)}
      <p className="av-greeting-signature">— {capitalized(pet)}</p>
      {unnamed&&<form className="av-pet-name" onSubmit={event=>{event.preventDefault();const value=draft.trim();if(value)void onNamePet(value);}}>
        <label htmlFor="av-pet-name-input">¿Me pones nombre?</label>
        <div className="av-pet-name-row">
          <input id="av-pet-name-input" value={draft} maxLength={24} autoComplete="off" spellCheck={false} placeholder="Por ejemplo, Chanchi…" onChange={event=>setDraft(event.target.value)}/>
          <button type="submit" disabled={busy||!draft.trim()}>Bautizar</button>
        </div>
        <div className="av-chips" role="group" aria-label="Sugerencias de nombre">
          {PET_NAME_SUGGESTIONS.map(suggestion=><button type="button" key={suggestion} className="av-secondary av-chip" aria-pressed={draft===suggestion} onClick={()=>setDraft(suggestion)}>{suggestion}</button>)}
        </div>
      </form>}
    </div>
  </section>;
}
