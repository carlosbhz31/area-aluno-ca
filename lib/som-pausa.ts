// Som do fim da pausa. No iPhone o push de app da tela inicial chega SEM som (limite da Apple),
// então o próprio app toca um áudio: X segundos de silêncio e depois o "pip". Um áudio que já está
// tocando continua com a tela bloqueada, coisa que um cronômetro na página não consegue.

const TAXA = 16000; // amostras por segundo: sobra para um tom de 1,8 kHz e o arquivo fica leve

/** Três pips curtos e agudos (~0,6 s no total), com volume moderado e sem estalo. */
function pip(): Float32Array {
  const tom = 1800;
  const toque = 0.12;
  const intervalo = 0.08;
  const total = Math.round(TAXA * (3 * toque + 2 * intervalo));
  const amostras = new Float32Array(total);
  for (let p = 0; p < 3; p++) {
    const inicio = Math.round(TAXA * p * (toque + intervalo));
    const n = Math.round(TAXA * toque);
    for (let i = 0; i < n; i++) {
      const envelope = Math.min(1, i / (TAXA * 0.005), (n - i) / (TAXA * 0.02)); // sobe em 5 ms, desce em 20 ms
      amostras[inicio + i] = 0.55 * envelope * Math.sin((2 * Math.PI * tom * i) / TAXA);
    }
  }
  return amostras;
}

/** WAV (8 bits, mono) com `segundos` de silêncio seguidos do pip. */
export function wavPausa(segundos: number): Blob {
  const som = pip();
  const silencio = Math.max(0, Math.round(TAXA * segundos));
  const n = silencio + som.length;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const texto = (pos: number, s: string) => [...s].forEach((c, i) => v.setUint8(pos + i, c.charCodeAt(0)));
  texto(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, TAXA, true);
  v.setUint32(28, TAXA, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  texto(36, "data");
  v.setUint32(40, n, true);
  const dados = new Uint8Array(buf, 44);
  dados.fill(128, 0, silencio); // 128 = silêncio em 8 bits
  for (let i = 0; i < som.length; i++) dados[silencio + i] = Math.round(128 + 127 * som[i]);
  return new Blob([buf], { type: "audio/wav" });
}

/** Toca silêncio até o fim da pausa e então o pip. Precisa ser chamado num toque da pessoa. */
export function tocarPausa(el: HTMLAudioElement, segundos: number) {
  if (el.src.startsWith("blob:")) URL.revokeObjectURL(el.src);
  el.src = URL.createObjectURL(wavPausa(segundos));
  return el.play();
}

export function pararPausa(el: HTMLAudioElement) {
  el.pause();
  if (el.src.startsWith("blob:")) URL.revokeObjectURL(el.src);
  el.removeAttribute("src");
  el.load();
}
