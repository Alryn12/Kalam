/**
 * Pemutar Audio Model & Penanda Sementara (situs/js/audio-model.js)
 * Tugas M1-D: TB-M1-05
 *
 * Catatan penggantian aset (M3-E):
 * Saat berkas audio asli sudah tersedia di folder `situs/audio/umum/{id}.m4a`
 * (atau jalur lain yang diberikan), pemutar akan memutar berkas asli secara otomatis.
 * Jika berkas belum ada, fungsi ini memutar nada penanda lembut via Web Audio API
 * tanpa memuat kunci jawaban apa pun.
 */

let pemutarAktif = null;

/**
 * Menghentikan audio model yang sedang diputar
 */
export function hentikanAudioModel() {
  if (pemutarAktif) {
    try {
      pemutarAktif.pause();
      pemutarAktif.currentTime = 0;
    } catch (_) {
      // Abaikan
    }
    pemutarAktif = null;
  }
}

/**
 * Memainkan nada penanda sementara yang lembut saat berkas .m4a belum tersedia
 */
async function putarNadaPenanda() {
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  try {
    const sekarang = ctx.currentTime;
    const nada = [523.25, 659.25];
    nada.forEach((frek, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frek, sekarang + idx * 0.16);
      gain.gain.setValueAtTime(0.001, sekarang + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.12, sekarang + idx * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, sekarang + idx * 0.16 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(sekarang + idx * 0.16);
      osc.stop(sekarang + idx * 0.16 + 0.15);
    });
    await new Promise((r) => setTimeout(r, 380));
  } finally {
    if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
      try {
        await ctx.close();
      } catch (_) {
        // Abaikan
      }
    }
  }
}

/**
 * Mencoba memutar berkas audio asli; bila belum tersedia, memutar penanda sementara
 */
export async function putarAudioModel(idAudio, folder = 'umum') {
  hentikanAudioModel();
  const jalurUtama = `audio/${folder}/${idAudio}.m4a`;

  const berhasilAsli = await new Promise((selesai) => {
    const audio = new Audio(jalurUtama);
    pemutarAktif = audio;
    let selesaiSudah = false;

    const akhiri = (ok) => {
      if (selesaiSudah) return;
      selesaiSudah = true;
      selesai(ok);
    };

    audio.addEventListener('ended', () => akhiri(true), { once: true });
    audio.addEventListener('error', () => akhiri(false), { once: true });
    audio.play().catch(() => akhiri(false));
  });

  if (berhasilAsli) {
    return { status: 'asli', idAudio, jalur: jalurUtama };
  }

  await putarNadaPenanda();
  return { status: 'penanda', idAudio, jalur: jalurUtama };
}
