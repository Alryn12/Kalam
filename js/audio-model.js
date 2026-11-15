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
let sesiPutar = 0;

/**
 * Menghentikan audio model atau antrean putar yang sedang berjalan
 */
export function hentikanAudioModel() {
  sesiPutar += 1;
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
async function putarNadaPenanda(kecepatan = 1, nomorSesi = sesiPutar) {
  const skala = kecepatan > 0 ? 1 / kecepatan : 1;
  const durasiMs = Math.round(380 * skala);
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) {
    await new Promise((r) => setTimeout(r, durasiMs));
    return;
  }

  const ctx = new AudioCtx();
  try {
    const sekarang = ctx.currentTime;
    const nada = [523.25, 659.25];
    const jeda = 0.16 * skala;
    nada.forEach((frek, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frek, sekarang + idx * jeda);
      gain.gain.setValueAtTime(0.001, sekarang + idx * jeda);
      gain.gain.exponentialRampToValueAtTime(0.12, sekarang + idx * jeda + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, sekarang + idx * jeda + 0.14 * skala);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(sekarang + idx * jeda);
      osc.stop(sekarang + idx * jeda + 0.15 * skala);
    });
    await new Promise((r) => setTimeout(r, durasiMs));
  } catch (_) {
    // Abaikan kendala AudioContext di lingkungan terbatas
  } finally {
    if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
      try {
        await ctx.close();
      } catch (_) {
        // Abaikan
      }
    }
  }
  return nomorSesi === sesiPutar;
}

function terapkanKecepatanAudio(audio, kecepatan) {
  const nilai = Number(kecepatan) > 0 ? Number(kecepatan) : 1;
  audio.playbackRate = nilai;
  if ('preservesPitch' in audio) audio.preservesPitch = true;
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = true;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
}

async function putarSatuBerkas(idAudio, folder, kecepatan, nomorSesi) {
  if (nomorSesi !== sesiPutar) {
    return { status: 'berhenti', idAudio, jalur: '' };
  }
  const jalurUtama = folder ? `audio/${folder}/${idAudio}.m4a` : `audio/${idAudio}.m4a`;

  const berhasilAsli = await new Promise((selesai) => {
    const audio = new Audio(jalurUtama);
    terapkanKecepatanAudio(audio, kecepatan);
    pemutarAktif = audio;
    let selesaiSudah = false;

    const akhiri = (ok) => {
      if (selesaiSudah) return;
      selesaiSudah = true;
      if (pemutarAktif === audio) pemutarAktif = null;
      selesai(ok);
    };

    audio.addEventListener('ended', () => akhiri(true), { once: true });
    audio.addEventListener('pause', () => akhiri(nomorSesi === sesiPutar), { once: true });
    audio.addEventListener('error', () => akhiri(false), { once: true });
    audio.play().catch(() => akhiri(false));
  });

  if (nomorSesi !== sesiPutar) {
    return { status: 'berhenti', idAudio, jalur: jalurUtama };
  }
  if (berhasilAsli) {
    return { status: 'asli', idAudio, jalur: jalurUtama };
  }

  await putarNadaPenanda(kecepatan, nomorSesi);
  if (nomorSesi !== sesiPutar) {
    return { status: 'berhenti', idAudio, jalur: jalurUtama };
  }
  return { status: 'penanda', idAudio, jalur: jalurUtama };
}

/**
 * Memutar beberapa berkas audio secara berurutan dengan kecepatan & callback tiap butir
 */
export async function putarDaftarAudioModel(daftarId, folder = 'umum', opsi = {}) {
  hentikanAudioModel();
  const nomorSesi = sesiPutar;
  const kecepatan = Number(opsi.kecepatan || 1);
  const daftar = (Array.isArray(daftarId) ? daftarId : [daftarId]).filter(Boolean);
  let statusAkhir = 'penanda';
  let hasilAkhir = { status: 'berhenti', daftar: [] };

  for (let i = 0; i < daftar.length; i += 1) {
    if (nomorSesi !== sesiPutar) break;
    if (typeof opsi.padaButir === 'function') opsi.padaButir(i, daftar[i]);
    const hasil = await putarSatuBerkas(daftar[i], folder, kecepatan, nomorSesi);
    hasilAkhir.daftar.push(hasil);
    if (hasil.status === 'berhenti' || nomorSesi !== sesiPutar) {
      return { status: 'berhenti', idAudio: daftar[i], daftar: hasilAkhir.daftar };
    }
    if (hasil.status === 'asli') statusAkhir = 'asli';
  }
  return {
    status: daftar.length ? statusAkhir : 'berhenti',
    idAudio: daftar[0] || '',
    daftar: hasilAkhir.daftar
  };
}

/**
 * Mencoba memutar berkas audio asli; bila belum tersedia, memutar penanda sementara
 */
export async function putarAudioModel(idAudio, folder = 'umum', opsi = {}) {
  if (Array.isArray(idAudio)) {
    return putarDaftarAudioModel(idAudio, folder, opsi);
  }
  hentikanAudioModel();
  const nomorSesi = sesiPutar;
  const kecepatan = Number(opsi.kecepatan || 1);
  return putarSatuBerkas(idAudio, folder, kecepatan, nomorSesi);
}
