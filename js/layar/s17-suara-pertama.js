/**
 * Layar S-17: Suara Hari Pertama / Suara Hari Ini (situs/js/layar/s17-suara-pertama.js)
 * Tugas M1-E: TB-M1-06
 * Acuan: SRS-3 FR-011, FR-072, FR-073, FR-074; IN-1 §3.6 (SV-01); BP-1 S-17; BP-5 K-15, K-16, K-60; BP-6 S-17
 */

import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import {
  ambilFase,
  ambilKalibrasiLatar,
  analisisAmplitudoBlob,
  antrekanUnggahAudio,
  blobKeBase64,
  catatKendalaTeknis,
  escapeHtml,
  kirimAtauAntre,
  pilihMimeRekam,
  siapkanWadahLayar,
  simpanHasilSuaraS17,
  simpanKemajuanTahap0
} from './tahap0-bantu.js';

const BATAS_MAKS_AUDIO_BYTE = 400 * 1024; // 400 KB (FR-073)

export async function renderS17({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = fase === 'AF'
    ? (ambilTeks('S-17', 'judul_after') || 'Suaramu hari ini')
    : (ambilTeks('S-17', 'judul_t0') || ambilTeks('S-17', 'judul') || 'Suara hari pertamamu');

  const wadah = siapkanWadahLayar('S-17', judul);
  if (!wadah) return;

  const state = ambilState();
  const paramRekam = (state.parameter && state.parameter.perekaman) || {};
  const batasDetik = fase === 'AF'
    ? (Number(paramRekam.batas_detik_after) || 30)
    : (Number(paramRekam.batas_detik_tahap0) || 20);
  const bitrateBps = Number(paramRekam.bitrate_bps) || 24000;

  const instruksi = fase === 'AF'
    ? ambilTeks('S-17', 'instruksi_after')
    : ambilTeks('S-17', 'instruksi_t0');
  const teksRekam = ambilTeks('S-17', 'tombol_rekam') || 'Rekam';
  const teksBerhenti = ambilTeks('S-17', 'tombol_berhenti') || 'Berhenti';
  const teksBatas = ambilTeks('S-17', 'pemberitahuan_batas') || 'Rekaman berhenti otomatis di batas waktu.';
  const teksSetelahRekam = ambilTeks('S-17', 'setelah_rekam') || 'Rekaman tersimpan ✓';
  const teksUlang = ambilTeks('S-17', 'tombol_ulang') || 'Ulangi satu kali';
  const teksLewati = ambilTeks('S-17', 'tombol_lewati') || 'Lewati, aku belum bisa';
  const teksPeringatanSunyi = ambilTeks('S-17', 'peringatan_sunyi') || 'Sepertinya suaramu tidak terekam. Cek mikrofonmu, lalu coba lagi.';
  const teksLanjut = ambilTeks('S-17', 'tombol_lanjut') || 'Lanjut';

  let keadaan = 'siap'; // 'siap' | 'merekam' | 'tersimpan'
  let jumlahUlang = 0; // Maksimal 1 kali ulang (FR-011)
  let sudahPeringatanSunyi = false; // Peringatan lembut sunyi maksimal satu kali (FR-011)
  let tampilkanPeringatanSunyiKini = false;
  let pesanTambahan = '';
  let sedangMemproses = false;

  let rekamanTerakhir = null; // { blob, mime, durasiTotal, metrik }
  let mediaRecorderAktif = null;
  let streamAktif = null;
  let timerBatas = null;
  let waktuMulaiRekamMs = 0;

  function bersihkanAliranRekam() {
    if (timerBatas) {
      clearTimeout(timerBatas);
      timerBatas = null;
    }
    if (streamAktif) {
      try {
        streamAktif.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      streamAktif = null;
    }
    mediaRecorderAktif = null;
  }

  function gambarLayar() {
    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="judul-s17">
        <div class="daftar-status" style="justify-content: space-between;">
          <span class="kartu-arab__label">${fase === 'AF' ? 'Tahap Akhir' : 'Langkah Awal'}</span>
          <span class="teks-keterangan">Maksimal ${batasDetik} detik</span>
        </div>

        <h1 id="judul-s17" class="judul-layar">${escapeHtml(judul)}</h1>

        <div class="pesan-hangat" style="display: flex; align-items: center; gap: var(--jarak-3);">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true" style="flex-shrink: 0;">
            <circle cx="24" cy="24" r="22" fill="#E0F2FE" stroke="#0369A1" stroke-width="2"/>
            <circle cx="17" cy="20" r="2.5" fill="#0C4A6E"/>
            <circle cx="31" cy="20" r="2.5" fill="#0C4A6E"/>
            <path d="M16 28C18 32 30 32 32 28" stroke="#0C4A6E" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <p class="teks-instruksi" style="margin: 0;">
            ${escapeHtml(instruksi)}
          </p>
        </div>

        ${keadaan === 'siap' ? `
          <div id="kotak-siap-s17" class="kotak-rekam kotak-rekam--siap">
            <button type="button" id="tombol-rekam-s17" class="tombol tombol-rekam--siap" ${sedangMemproses ? 'disabled' : ''}>
              <span aria-hidden="true">&#9679;</span> ${escapeHtml(teksRekam)}
            </button>
            <p class="teks-keterangan" style="margin: 0;">
              ${escapeHtml(teksBatas)}
            </p>
          </div>
        ` : ''}

        ${keadaan === 'merekam' ? `
          <div id="kotak-merekam-s17" class="kotak-rekam kotak-rekam--merekam" role="status" aria-live="polite">
            <button type="button" id="tombol-berhenti-s17" class="tombol tombol-rekam--merekam">
              <span aria-hidden="true">&#9632;</span> ${escapeHtml(teksBerhenti)}
            </button>
            <p class="teks-keterangan" style="margin: 0; color: var(--warna-aksen-gelap);">
              ${escapeHtml(teksBatas)}
            </p>
          </div>
        ` : ''}

        ${keadaan === 'tersimpan' ? `
          <div id="kotak-tersimpan-s17" class="kotak-rekam kotak-rekam--tersimpan" role="status" aria-live="polite">
            <div class="label-rekam-tersimpan">
              <span>${escapeHtml(teksSetelahRekam)}</span>
            </div>
            <div class="baris-tombol" style="width: 100%;">
              <button type="button" id="tombol-lanjut-s17" class="tombol tombol--utama" ${sedangMemproses ? 'disabled' : ''}>
                ${escapeHtml(sedangMemproses ? 'Menyimpan…' : teksLanjut)}
              </button>
              ${jumlahUlang < 1 ? `
                <button type="button" id="tombol-ulang-s17" class="tombol tombol--sekunder" ${sedangMemproses ? 'disabled' : ''}>
                  ${escapeHtml(teksUlang)}
                </button>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${tampilkanPeringatanSunyiKini ? `
          <div id="peringatan-sunyi-s17" class="pesan-hangat pesan-hangat--aksen" role="status" aria-live="polite">
            <p class="pesan-hangat__isi">${escapeHtml(teksPeringatanSunyi)}</p>
          </div>
        ` : ''}

        ${pesanTambahan ? `
          <div id="pesan-tambahan-s17" class="pesan-hangat" role="status" aria-live="polite">
            <p class="pesan-hangat__isi">${escapeHtml(pesanTambahan)}</p>
          </div>
        ` : ''}

        ${keadaan !== 'merekam' ? `
          <button type="button" id="tombol-lewati-s17" class="tombol tombol--sekunder" ${sedangMemproses ? 'disabled' : ''}>
            ${escapeHtml(teksLewati)}
          </button>
        ` : ''}
      </section>
    `;

    pasangPendengar();
  }

  async function prosesSelesaiRekam(potonganBlob, tipeMime, durasiDetikKasar) {
    sedangMemproses = true;
    gambarLayar();

    try {
      const blob = new Blob(potonganBlob, { type: tipeMime || 'audio/webm' });

      if (blob.size > BATAS_MAKS_AUDIO_BYTE) {
        pesanTambahan = 'Ukuran rekaman terlalu besar. Silakan rekam ulang lebih singkat.';
        keadaan = 'siap';
        sedangMemproses = false;
        gambarLayar();
        return;
      }

      const kalibrasi = await ambilKalibrasiLatar();
      let metrik = null;
      try {
        metrik = await analisisAmplitudoBlob(blob, kalibrasi);
      } catch (_) {
        metrik = null;
      }

      if (!metrik) {
        const durasiAman = Math.min(batasDetik, Math.max(0.5, Number(durasiDetikKasar.toFixed(2))));
        const durasi20 = Number(Math.min(20, durasiAman).toFixed(2));
        const durasiEkstra = fase === 'AF' && durasiAman > 20 ? Number((durasiAman - 20).toFixed(2)) : 0;
        metrik = {
          durasi_rekaman_total: durasiAman,
          waktu_mulai_bicara: blob.size > 500 ? 0.4 : null,
          durasi_bersuara_20: blob.size > 500 ? durasi20 : 0,
          durasi_bersuara_tambahan: blob.size > 500 ? durasiEkstra : 0,
          durasi_bersuara_total: blob.size > 500 ? durasiAman : 0,
          flag: blob.size <= 500 ? 'sunyi' : ''
        };
      }

      rekamanTerakhir = {
        blob,
        mime: tipeMime || blob.type || 'audio/webm',
        durasiTotal: metrik.durasi_rekaman_total || Number(durasiDetikKasar.toFixed(2)),
        metrik
      };

      const apakahSunyiAtauPendek =
        metrik.flag === 'sunyi' ||
        metrik.flag === 'kurang_1_detik' ||
        Number(metrik.durasi_bersuara_total || 0) < 1;

      if (apakahSunyiAtauPendek && !sudahPeringatanSunyi) {
        sudahPeringatanSunyi = true;
        tampilkanPeringatanSunyiKini = true;
      } else {
        tampilkanPeringatanSunyiKini = false;
      }

      pesanTambahan = '';
      keadaan = 'tersimpan';
    } catch (_) {
      pesanTambahan = teksPeringatanSunyi;
      keadaan = 'siap';
    } finally {
      sedangMemproses = false;
      gambarLayar();
    }
  }

  async function mulaiMerekam() {
    if (sedangMemproses || keadaan === 'merekam') return;
    pesanTambahan = '';
    tampilkanPeringatanSunyiKini = false;

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      pesanTambahan = 'Peramban ini belum mendukung perekaman suara. Silakan gunakan tombol Lewati atau hubungi gurumu.';
      await catatKendalaTeknis('mikrofon_tidak_didukung', 'S-17');
      gambarLayar();
      return;
    }

    try {
      streamAktif = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    } catch (_) {
      pesanTambahan = ambilTeks('S-11', 'izin_ditolak') || 'Mikrofon belum diizinkan. Buka pengaturan peramban atau minta bantuan gurumu.';
      await catatKendalaTeknis('izin_mikrofon_ditolak', 'S-17');
      gambarLayar();
      return;
    }

    const mimeTerpilih = pilihMimeRekam();
    const opsiRecorder = { audioBitsPerSecond: bitrateBps };
    if (mimeTerpilih) opsiRecorder.mimeType = mimeTerpilih;

    const potongan = [];
    try {
      mediaRecorderAktif = new MediaRecorder(streamAktif, opsiRecorder);
    } catch (_) {
      try {
        mediaRecorderAktif = new MediaRecorder(streamAktif);
      } catch (err2) {
        bersihkanAliranRekam();
        pesanTambahan = 'Perekam belum siap di perangkat ini. Kamu boleh melewati bagian ini.';
        await catatKendalaTeknis('mediarecorder_kendala', 'S-17');
        gambarLayar();
        return;
      }
    }

    const mimeAktual = mediaRecorderAktif.mimeType || mimeTerpilih || 'audio/webm';
    waktuMulaiRekamMs = Date.now();
    keadaan = 'merekam';
    gambarLayar();

    mediaRecorderAktif.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) potongan.push(e.data);
    });

    mediaRecorderAktif.addEventListener('stop', () => {
      const durasiDetik = Math.min(batasDetik, Math.max(0.2, (Date.now() - waktuMulaiRekamMs) / 1000));
      bersihkanAliranRekam();
      prosesSelesaiRekam(potongan, mimeAktual, durasiDetik);
    });

    mediaRecorderAktif.start(250);

    // Berhenti otomatis di batas waktu (20 detik T0, 30 detik AF) tanpa hitung mundur (FR-011, K-16)
    timerBatas = setTimeout(() => {
      hentikanMerekam();
    }, batasDetik * 1000);
  }

  function hentikanMerekam() {
    if (timerBatas) {
      clearTimeout(timerBatas);
      timerBatas = null;
    }
    if (mediaRecorderAktif && mediaRecorderAktif.state !== 'inactive') {
      try {
        mediaRecorderAktif.stop();
        return;
      } catch (_) {}
    }
    bersihkanAliranRekam();
  }

  async function simpanDanKeS18() {
    if (sedangMemproses || !rekamanTerakhir) return;
    sedangMemproses = true;
    gambarLayar();

    try {
      const base64 = await blobKeBase64(rekamanTerakhir.blob);
      const m = rekamanTerakhir.metrik || {};
      const muatanUnggah = {
        jenis: fase,
        mime: rekamanTerakhir.mime || 'audio/webm',
        durasi_total: Number(rekamanTerakhir.durasiTotal || 0),
        flag: m.flag || '',
        metrik: {
          durasi_bersuara_20: Number(m.durasi_bersuara_20 || 0),
          durasi_bersuara_tambahan: fase === 'AF' ? Number(m.durasi_bersuara_tambahan || 0) : 0,
          waktu_mulai_bicara: m.waktu_mulai_bicara != null ? Number(m.waktu_mulai_bicara) : '',
          dilewati: 0,
          jumlah_ulang: jumlahUlang,
          batas_detik: batasDetik
        },
        base64
      };

      const labelItem = fase === 'AF' ? 'Suara Hari Ini' : 'Suara Hari Pertama';
      await antrekanUnggahAudio(muatanUnggah, labelItem);
      await simpanHasilSuaraS17(fase, {
        dilewati: 0,
        durasi_bersuara_20: Number(m.durasi_bersuara_20 || 0),
        durasi_bersuara_tambahan: fase === 'AF' ? Number(m.durasi_bersuara_tambahan || 0) : 0,
        jumlah_ulang: jumlahUlang
      });
      await simpanKemajuanTahap0('S-18', fase);
      arahKe('S-18', { fase });
    } catch (_) {
      sedangMemproses = false;
      pesanTambahan = 'Rekaman belum dapat disiapkan. Silakan coba lagi.';
      gambarLayar();
    }
  }

  async function lewatiDanKeS18() {
    if (sedangMemproses) return;
    hentikanMerekam();
    sedangMemproses = true;
    gambarLayar();

    await kirimAtauAntre(
      'lewati_rekaman',
      {
        jenis: fase,
        alasan: 'aku_belum_bisa'
      },
      fase === 'AF' ? 'Lewati Suara Hari Ini' : 'Lewati Suara Hari Pertama',
      fase
    );

    await simpanHasilSuaraS17(fase, {
      dilewati: 1,
      durasi_bersuara_20: 0,
      durasi_bersuara_tambahan: 0,
      jumlah_ulang: jumlahUlang
    });
    await simpanKemajuanTahap0('S-18', fase);
    arahKe('S-18', { fase });
  }

  function pasangPendengar() {
    const btnRekam = document.getElementById('tombol-rekam-s17');
    if (btnRekam) {
      btnRekam.addEventListener('click', () => {
        mulaiMerekam();
      });
    }

    const btnBerhenti = document.getElementById('tombol-berhenti-s17');
    if (btnBerhenti) {
      btnBerhenti.addEventListener('click', () => {
        hentikanMerekam();
      });
    }

    const btnUlang = document.getElementById('tombol-ulang-s17');
    if (btnUlang) {
      btnUlang.addEventListener('click', () => {
        if (jumlahUlang >= 1 || sedangMemproses) return;
        jumlahUlang += 1;
        rekamanTerakhir = null;
        tampilkanPeringatanSunyiKini = false;
        pesanTambahan = '';
        keadaan = 'siap';
        gambarLayar();
      });
    }

    const btnLanjut = document.getElementById('tombol-lanjut-s17');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        simpanDanKeS18();
      });
    }

    const btnLewati = document.getElementById('tombol-lewati-s17');
    if (btnLewati) {
      btnLewati.addEventListener('click', () => {
        lewatiDanKeS18();
      });
    }
  }

  gambarLayar();
}
