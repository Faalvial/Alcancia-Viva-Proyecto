// Reconocimiento y síntesis de voz simulados para Playwright (no hay micrófono en la nube).
//
// installVoiceFakes(page, { micDenied, noRecognition })
// - window.__say(texto): la próxima escucha «oye» ese texto; __say(null) = silencio;
//   __say('__denied') = el navegador niega el micrófono.
// - window.__spoken: frases que la app pidió leer en voz alta.
// - La síntesis dispara onstart, onboundary (palabra a palabra) y onend.
async function installVoiceFakes(page, { micDenied = false, noRecognition = false } = {}) {
  await page.addInitScript(({ micDenied, noRecognition }) => {
    window.__queue = [];
    window.__spoken = [];
    window.__listening = 0;
    window.__say = (text) => { window.__queue.push(text); window.__flush?.(); };
    if (noRecognition) { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }
    else {
      class FakeRecognition {
        constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.onstart = this.onresult = this.onerror = this.onend = null; this.aborted = false; }
        start() {
          window.__listening++;
          setTimeout(() => {
            if (this.aborted) return;
            this.onstart?.();
            const deliver = () => {
              if (this.aborted) return;
              if (!window.__queue.length) { window.__flush = deliver; return; }
              window.__flush = null;
              const text = window.__queue.shift();
              if (text === '__denied') { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); return; }
              if (text === null) { this.onerror?.({ error: 'no-speech' }); this.onend?.(); return; }
              const words = text.split(' ');
              // Resultado parcial y luego final, como Chrome con interimResults.
              this.onresult?.({ results: [[{ transcript: words.slice(0, Math.ceil(words.length / 2)).join(' ') }]] });
              setTimeout(() => { if (this.aborted) return; this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.(); }, 60);
            };
            deliver();
          }, 30);
        }
        abort() { this.aborted = true; if (window.__flush) window.__flush = null; }
        stop() { this.abort(); }
      }
      window.SpeechRecognition = FakeRecognition;
      window.webkitSpeechRecognition = FakeRecognition;
    }
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.voice = null; } };
    const synth = {
      speaking: false,
      speak(utterance) {
        window.__spoken.push(utterance.text);
        synth.current = utterance;
        setTimeout(() => {
          if (synth.current !== utterance) return;
          utterance.onstart?.({});
          let index = 0;
          for (const word of utterance.text.split(' ')) { utterance.onboundary?.({ name: 'word', charIndex: index, charLength: word.length }); index += word.length + 1; }
          setTimeout(() => { if (synth.current === utterance) { synth.current = null; utterance.onend?.({}); } }, Number(window.__speechMs ?? 40));
        }, 10);
      },
      cancel() { synth.current = null; }, pause() {}, resume() {},
      getVoices() { return [{ lang: 'es-MX', name: 'Paulina', localService: true }, { lang: 'es-PE', name: 'Camila', localService: true }]; },
      addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    if (micDenied && navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permiso denegado', 'NotAllowedError'));
  }, { micDenied, noRecognition });
}

module.exports = { installVoiceFakes };
