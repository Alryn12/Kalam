/**
 * Pembantu Bersama Layar Tahap 0 dan After (situs/js/layar/tahap0-bantu.js)
 * Tugas M1-C & M1-D: TB-M1-03, TB-M1-04, TB-M1-05
 * Acuan: SRS-3 FR-001..012, FR-072, FR-073, FR-074; BP-1; BP-5 K-34
 */

import { panggilApi, prosesAntreanLatar } from '../api.js';
import { ambilState, buatIdIdempoten } from '../state.js';
import {
  tambahAntrean,
  perbaruiStatusAntrean,
  simpanSesi,
  ambilSesi,
  hapusSesi,
  simpanRekamanLatihan
} from '../antrean.js';

const KUNCI_KEMAJUAN_TAHAP0 = 'kemajuan_tahap0';
const KUNCI_KALIBRASI_LATAR = 'kalibrasi_latar';
const KUNCI_HASIL_SUARA_S17 = 'hasil_suara_s17';

/**
 * Mengamankan teks sebelum disisipkan ke HTML
 */
export function escapeHtml(teks) {
  return String(teks == null ? '' : teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Menghasilkan waktu ISO 8601 zona WIB (+07:00)
 */
export function waktuIsoWib(tanggal = new Date()) {
  const offsetWibMs = 7 * 60 * 60 * 1000;
  const t = new Date(tanggal.getTime() + offsetWibMs);
  const pad = (n) => (n < 10 ? `0${n}` : String(n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T` +
    `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}+07:00`;
}

/**
 * Menormalkan parameter fase ("T0" atau "AF")
 */
export function ambilFase(param = {}) {
  const f = String(param && param.fase ? param.fase : 'T0').trim().toUpperCase();
  return f === 'AF' ? 'AF' : 'T0';
}

/**
 * Menyiapkan wadah utama #akar-aplikasi dan memperbarui judul dokumen
 */
export function siapkanWadahLayar(idLayar, judul) {
  document.title = `${idLayar} · ${judul} — Kalām`;
  return document.getElementById('akar-aplikasi');
}

/**
 * Menyimpan kemajuan layar Tahap 0 / After agar dapat dilanjutkan jika aplikasi ditutup (K-34)
 */
export async function simpanKemajuanTahap0(layarBerikut, fase = 'T0', paramTambahan = {}) {
  try {
    await simpanSesi(KUNCI_KEMAJUAN_TAHAP0, {
      layar: layarBerikut,
      fase,
      param: paramTambahan,
      waktu: Date.now()
    });
  } catch (_) {
    // Abaikan jika penyimpanan lokal sedang penuh
  }
}

export async function ambilKemajuanTahap0() {
  try {
    return await ambilSesi(KUNCI_KEMAJUAN_TAHAP0);
  } catch (_) {
    return null;
  }
}

export async function hapusKemajuanTahap0() {
  try {
    await hapusSesi(KUNCI_KEMAJUAN_TAHAP0);
  } catch (_) {
    // Abaikan
  }
}

/**
 * Menyimpan dan mengambil kalibrasi suara latar (L dan S) dari S-11 (FR-074, K-21)
 */
export async function simpanKalibrasiLatar(kalibrasi) {
  try {
    await simpanSesi(KUNCI_KALIBRASI_LATAR, kalibrasi);
  } catch (_) {
    // Abaikan
  }
}

export async function ambilKalibrasiLatar() {
  try {
    return await ambilSesi(KUNCI_KALIBRASI_LATAR);
  } catch (_) {
    return null;
  }
}

/**
 * Mengirim aksi ke kalam-api, atau menyimpannya ke antrean IndexedDB bila jaringan/server sedang sibuk
 */
export async function kirimAtauAntre(aksi, data, label, kategori = '') {
  const state = ambilState();
  const idIdempoten = buatIdIdempoten(state.kode_siswa);
  const kat = kategori || (aksi === 'unggah_audio' ? (data && data.jenis) || 'AUDIO' : 'ANGKA');

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await tambahAntrean({
      id_idempoten: idIdempoten,
      aksi,
      kategori: kat,
      unit: (data && data.unit) || null,
      data,
      label: label || aksi,
      status: 'Menunggu',
      percobaan_kirim: 0
    });
    return {
      ok: true,
      diantrekan: true,
      id_idempoten: idIdempoten,
      pesan: 'Tersimpan di HP dan akan dikirim saat internet lancar.'
    };
  }

  const hasil = await panggilApi(aksi, data, {
    id_idempoten: idIdempoten,
    tanpaTungguOnline: true
  });

  if (hasil && hasil.ok) {
    const dataRingkas = aksi === 'unggah_audio' && data && typeof data === 'object'
      ? { jenis: data.jenis, unit: data.unit, id_kartu: data.id_kartu, bagian: data.bagian }
      : data;
    await tambahAntrean({
      id_idempoten: idIdempoten,
      aksi,
      kategori: kat,
      unit: (data && data.unit) || null,
      data: dataRingkas,
      label: label || aksi,
      status: 'Terkirim',
      percobaan_kirim: 1
    });
    return { ...hasil, diantrekan: false, id_idempoten: idIdempoten };
  }

  const kodeGalat = hasil && hasil.galat ? hasil.galat : 'E_SERVER';
  if (kodeGalat === 'E_SERVER' || kodeGalat === 'E_SIBUK') {
    await tambahAntrean({
      id_idempoten: idIdempoten,
      aksi,
      kategori: kat,
      unit: (data && data.unit) || null,
      data,
      label: label || aksi,
      status: 'Menunggu',
      percobaan_kirim: 1
    });
    return {
      ok: true,
      diantrekan: true,
      id_idempoten: idIdempoten,
      pesan: 'Tersimpan di HP dan akan dikirim saat internet lancar.'
    };
  }

  return hasil;
}

/**
 * Mengantrekan unggahan audio (T0, AF, P3) ke IndexedDB (status Menunggu) lalu memicu pengiriman latar (FR-073)
 */
export async function antrekanUnggahAudio(muatanAudio, label) {
  const state = ambilState();
  const idIdempoten = buatIdIdempoten(state.kode_siswa);
  const jenis = String((muatanAudio && muatanAudio.jenis) || 'T0').toUpperCase();

  // Simpan salinan lokal T0 untuk cadangan K-06 bila Tahap After dibuka sebelum terkirim
  if (jenis === 'T0' && muatanAudio && muatanAudio.base64) {
    try {
      await simpanRekamanLatihan('rekaman_lokal_T0', {
        mime: muatanAudio.mime || 'audio/webm',
        base64: muatanAudio.base64,
        metrik: muatanAudio.metrik || {},
        waktu: Date.now()
      });
    } catch (_) {
      // Abaikan bila penyimpanan penuh
    }
  }

  await tambahAntrean({
    id_idempoten: idIdempoten,
    aksi: 'unggah_audio',
    kategori: jenis,
    unit: muatanAudio.unit || null,
    data: muatanAudio,
    label: label || (jenis === 'AF' ? 'Suara Hari Ini' : (jenis === 'P3' ? `Putaran 3 Unit ${muatanAudio.unit || 1}` : 'Suara Hari Pertama')),
    status: 'Menunggu',
    percobaan_kirim: 0
  });

  // Picu pengiriman di latar tanpa memblokir perpindahan layar siswa
  prosesAntreanLatar({ langsung: true, tanpaUlangDalam: true }).catch(() => {});

  return { ok: true, id_idempoten: idIdempoten, status: 'Menunggu' };
}

/**
 * Mengubah Blob menjadi string Base64 murni (tanpa awalan data:...;base64,)
 */
export function blobKeBase64(blob) {
  return new Promise((selesai, tolak) => {
    if (!blob) {
      tolak(new Error('Blob audio kosong.'));
      return;
    }
    if (typeof FileReader !== 'undefined') {
      const pembaca = new FileReader();
      pembaca.onloadend = () => {
        const hasil = String(pembaca.result || '');
        const idx = hasil.indexOf(',');
        selesai(idx !== -1 ? hasil.slice(idx + 1) : hasil);
      };
      pembaca.onerror = () => tolak(pembaca.error || new Error('Tidak dapat membaca blob audio.'));
      pembaca.readAsDataURL(blob);
      return;
    }
    blob.arrayBuffer().then((buf) => {
      const bytes = new Uint8Array(buf);
      let biner = '';
      for (let i = 0; i < bytes.length; i++) {
        biner += String.fromCharCode(bytes[i]);
      }
      selesai(typeof btoa === 'function' ? btoa(biner) : '');
    }).catch(tolak);
  });
}

/**
 * Menyimpan dan mengambil hasil tindakan siswa di S-17 (merekam atau melewati) untuk layar S-19
 */
export async function simpanHasilSuaraS17(fase, info) {
  try {
    await simpanSesi(`${KUNCI_HASIL_SUARA_S17}_${fase}`, {
      ...info,
      fase,
      waktu: Date.now()
    });
  } catch (_) {}
}

export async function ambilHasilSuaraS17(fase = 'T0') {
  try {
    return await ambilSesi(`${KUNCI_HASIL_SUARA_S17}_${fase}`);
  } catch (_) {
    return null;
  }
}

/**
 * Mencatat kendala_teknis ke server atau antrean lokal (FR-045)
 */
export async function catatKendalaTeknis(jenisKendala, layar = 'S-91') {
  try {
    await kirimAtauAntre(
      'catat',
      {
        jenis: 'kendala',
        jenis_kendala: jenisKendala || 'kendala_teknis',
        layar
      },
      `Kendala teknis (${layar})`,
      'KENDALA'
    );
  } catch (_) {}
}

export {
  analisisAmplitudoBlob,
  hitungMetrikAmplitudo,
  pilihMimeRekam
} from '../rekam.js';
