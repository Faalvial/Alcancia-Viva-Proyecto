import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSpanishVoice, clampRate, splitAtWord } from '../src/services/voice/voices.ts';
import { EARCONS, earconLength, playEarcon } from '../src/services/voice/earcons.ts';
import { createSpeechPlayback } from '../src/services/voice/speechPlayback.ts';

const v=(lang,name,localService=false)=>({lang,name,localService});

test('la voz se elige en el orden es-PE, es-MX, es-ES y luego cualquier español',()=>{
  const all=[v('en-US','Ana'),v('es-ES','Lucía'),v('es-MX','Paulina'),v('es_PE','Camila')];
  assert.equal(pickSpanishVoice(all).name,'Camila');
  assert.equal(pickSpanishVoice(all.slice(0,3)).name,'Paulina');
  assert.equal(pickSpanishVoice(all.slice(0,2)).name,'Lucía');
  assert.equal(pickSpanishVoice([v('es-US','Pedro'),v('en-GB','X')]).name,'Pedro');
  assert.equal(pickSpanishVoice([v('en-US','Ana')]),null);
  assert.equal(pickSpanishVoice([v('es-MX','Red'),v('es-MX','Local',true)]).name,'Local');
});

test('la velocidad configurable queda entre 0.8 y 1.3',()=>{
  assert.equal(clampRate(0.5),0.8);assert.equal(clampRate(2),1.3);assert.equal(clampRate(1.14),1.1);assert.equal(clampRate(NaN),1);
});

test('el resaltado separa la palabra actual aunque el navegador no informe su longitud',()=>{
  assert.deepEqual(splitAtWord('Ahorra un poco',7,2),{before:'Ahorra ',word:'un',after:' poco'});
  assert.deepEqual(splitAtWord('Ahorra un poco',10,0),{before:'Ahorra un ',word:'poco',after:''});
  assert.equal(splitAtWord('Hola',9,1),null);
});

test('los earcons duran menos de 200 ms y no suenan si el audio está desactivado',()=>{
  for(const name of Object.keys(EARCONS))assert.ok(earconLength(name)<0.2,name);
  assert.equal(playEarcon('success',false),false);
});

test('la lectura informa la palabra actual y avisa si falla, sin eventos tardíos',()=>{
  const utterances=[];const player=createSpeechPlayback({speak:u=>utterances.push(u),cancel(){},pause(){},resume(){}},text=>({text}));
  const words=[];let failed=0;
  player.speak('Hola mundo',1,'es-PE',undefined,{onBoundary:(start,length)=>words.push([start,length]),onError:()=>failed++});
  utterances[0].onboundary({name:'word',charIndex:5,charLength:5});
  utterances[0].onboundary({name:'sentence',charIndex:0,charLength:10});
  assert.deepEqual(words,[[5,5]]);
  const stale=utterances[0].onerror;player.speak('Otra');stale();assert.equal(failed,0);
  utterances[1].onerror();assert.equal(failed,0);
  player.speak('Tercera',1,'es-PE',undefined,{onError:()=>failed++});utterances[2].onerror();assert.equal(failed,1);
});

import { pickRecordingType, transcribe, transcriptionEnabled } from '../src/services/voice/recorder.ts';

test('el respaldo graba en webm/opus, o en mp4 en Safari, y está desactivado por defecto',()=>{
  assert.equal(pickRecordingType(type=>type.startsWith('audio/webm')),'audio/webm;codecs=opus');
  assert.equal(pickRecordingType(type=>type==='audio/mp4'),'audio/mp4');
  assert.equal(pickRecordingType(()=>false),null);
  assert.equal(pickRecordingType(()=>{throw new Error('sin soporte');}),null);
  assert.equal(transcriptionEnabled(),false);
});

test('la transcripción envía el audio en base64 con action «transcribe» y conserva el error amable',async()=>{
  let sent=null;
  const text=await transcribe(new Blob([new Uint8Array([1,2,3])],{type:'audio/webm'}),async(name,options)=>{sent={name,...options.body};return {data:{text:' gasté diez soles '},error:null};});
  assert.equal(text,'gasté diez soles');
  assert.deepEqual(sent,{name:'financial-assistant',action:'transcribe',audio:'AQID',mimeType:'audio/webm',language:'es'});
  await assert.rejects(transcribe(new Blob([new Uint8Array([1])]),async()=>({data:{error:'Revisa tu consulta.'},error:null})),/Puedes escribir tu movimiento/);
  await assert.rejects(transcribe(new Blob([]),async()=>({data:{text:'x'},error:null})),/No se grabó audio/);
});
