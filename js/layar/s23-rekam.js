/**
 * Layar S-23: Tab Rekam Sesi 1 (situs/js/layar/s23-rekam.js)
 * Tugas M1-G & M1-H: TB-M1-08, TB-M1-09 · Acuan: SRS-3 FR-017, FR-072, FR-074, BP-1, BP-4 R-10/R-26/R-27, K-14/K-17, BP-6
 */

import { ambilRekamanLatihan, simpanRekamanLatihan } from '../antrean.js';
import { ambilTeks, muatKontenJson } from '../state.js';
import { arahKe } from '../router.js';
import { hentikanAudioModel, putarDaftarAudioModel } from '../audio-model.js';
import {
  analisisAmplitudoBlob,
  evaluasiHasilRekamLatihan,
  pilihMimeRekam
} from '../rekam.js';
import {
  ambilKalibrasiLatar,
  catatKendalaTeknis,
  escapeHtml,
  kirimAtauAntre
} from './tahap0-bantu.js';
import {
  catatKejadianSesi1,
  daftarTabBelumDibuka,
  folderAudioUnit,
  nomorUnitDariId,
  pasangNavigasiSesi1,
  pilihBentukAudio,
  pilihBentukTeks,
  renderKepalaSesi1,
  semuaTabSesi1Selesai,
  siapkanKonteksSesi1,
  simpanKemajuanSesi1
} from './sesi1-bantu.js';

/**
 * Mengevaluasi hasil rekaman Sesi 1 menurut aturan K-15 (sunyi/pendek) dan K-17 (diam 10 detik).
 */
export function evaluasiHasilRekamSesi1(opsi) {
  const hasil = evaluasiHasilRekamLatihan(opsi);
  return {
    kategori: hasil.kategori,
    hitungPercobaan: hasil.hitungPercobaan,
    simpan: hasil.simpan,
    durasiBicara: hasil.durasiBicara
  };
}

export async function renderS23({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi1('S-23', param, null);
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;

  // R-10: Tab Rekam aktif hanya setelah tab Tiru pernah dibuka
  if (!kemajuan.tab.tiru) {
    const pesanKunci = ambilTeks('S-23', 'tab_belum_aktif') || 'Buka tab Tiru dulu satu kali, lalu kamu bisa merekam.';
    const judulTiru = ambilTeks('S-22', 'judul_tab') || 'Tiru';
    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi1(konteks, 'S-23', { tanpaPemilihBentuk: true })}
        <div class="pesan-hangat" role="status">
          <p class="pesan-hangat__isi">${escapeHtml(pesanKunci)}</p>
        </div>
        <button type="button" id="tombol-buka-tiru-s23" class="tombol tombol--utama">
          ${escapeHtml(judulTiru)}
        </button>
      </section>
    `;
    pasangNavigasiSesi1(konteks);
    const btnTiru = wadah.querySelector('#tombol-buka-tiru-s23');
    if (btnTiru) {
      btnTiru.addEventListener('click', () => arahKe('S-22', { unit: unitId, blok: blokId }));
    }
    return;
  }

  // B1-05: Arahkan ke S-12 (ketenangan) satu kali sebelum rekaman Sesi 1 pertama
  if (!kemajuan.s12RekamSudah) {
    kemajuan.s12RekamSudah = true;
    await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
    arahKe('S-12', { konteks: 'sesi1', unit: unitId, blok: blokId });
    return;
  }

  if (!kemajuan.tab.rekam) {
    kemajuan.tab.rekam = true;
  }

  const daftarTiru = Array.isArray(blokData.tiru) ? blokData.tiru : [];
  if (!kemajuan.giliranDipilih.length && daftarTiru.length) {
    const awal = daftarTiru.slice(0, Math.min(2, daftarTiru.length)).map((t) => t.no);
    kemajuan.giliranDipilih = awal;
  }
  await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);

  const paramUmum = await muatKontenJson('konten/umum/parameter.json');
  const perekamanParam = (paramUmum && paramUmum.perekaman) || {};
  const batasDetik = Number((perekamanParam.batas_durasi_detik && perekamanParam.batas_durasi_detik.latihan_sesi1_sesi2) || 15);
  const batasDiam = Number(perekamanParam.batas_tidak_mulai_bicara_detik || 10);
  const bitrateBps = Number(perekamanParam.bitrate_bps || 24000);
  const minDetikSah = Number(perekamanParam.durasi_minimal_sah_detik || 1.0);
  const kalibrasiLatar = await ambilKalibrasiLatar();

  const kunciRekam = (no) => `s23_${kodeSiswa}_${blokId}_${no}`;
  const punyaRekaman = {};
  await Promise.all(
    daftarTiru.map(async (t) => {
      const r = await ambilRekamanLatihan(kunciRekam(t.no));
      if (r && r.blob) punyaRekaman[t.no] = true;
    })
  );

  let noFokus = kemajuan.giliranDipilih[0] || (daftarTiru[0] && daftarTiru[0].no) || 1;
  let statusRekam = punyaRekaman[noFokus] ? 'tersimpan' : 'siap'; // 'siap' | 'merekam' | 'tersimpan'
  let pesanStatus = '';
  let pesanPilih = '';
  let percobaanCount = 0;

  let mediaRecorder = null;
  let streamAktif = null;
  let audioCtxMonitor = null;
  let intervalMonitor = null;
  let timerDiam = null;
  let timerBatas = null;
  let audioSuarakuAktif = null;
  let alasanHenti = 'manual';
  let aktifDiLayar = true;

  function bersihkanSumberRekam() {
    clearInterval(intervalMonitor);
    clearTimeout(timerDiam);
    clearTimeout(timerBatas);
    intervalMonitor = null;
    timerDiam = null;
    timerBatas = null;
    if (streamAktif) {
      streamAktif.getTracks().forEach((tr) => tr.stop());
      streamAktif = null;
    }
    if (audioCtxMonitor && typeof audioCtxMonitor.close === 'function') {
      audioCtxMonitor.close().catch(() => {});
      audioCtxMonitor = null;
    }
  }

  function hentikanPutarSuaraku() {
    if (audioSuarakuAktif) {
      try {
        audioSuarakuAktif.pause();
        audioSuarakuAktif.currentTime = 0;
      } catch (_) {}
      audioSuarakuAktif = null;
    }
  }

  window.addEventListener('hashchange', () => {
    aktifDiLayar = false;
    hentikanRekam('batal');
    bersihkanSumberRekam();
    hentikanPutarSuaraku();
  }, { once: true });

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    if (!kemajuan.giliranDipilih.includes(noFokus) && kemajuan.giliranDipilih.length) {
      noFokus = kemajuan.giliranDipilih[0];
    }
    const butirAktif = daftarTiru.find((t) => t.no === noFokus) || daftarTiru[0] || {};
    const sudahRekamAktif = Boolean(punyaRekaman[butirAktif.no]);
    if (statusRekam !== 'merekam') {
      statusRekam = sudahRekamAktif ? 'tersimpan' : 'siap';
    }

    const judulPilih = (ambilTeks('S-23', 'judul_pilih_giliran') || 'Pilih 2 atau 3 giliran untuk direkam ({jumlah} dipilih)')
      .replace('{jumlah}', String(kemajuan.giliranDipilih.length));
    const lblRekam = statusRekam === 'merekam'
      ? (ambilTeks('S-23', 'tombol_berhenti') || 'Berhenti')
      : (ambilTeks('S-23', 'tombol_rekam') || 'Rekam');
    const lblSuaraku = ambilTeks('S-23', 'tombol_dengar_suaraku') || 'Dengar suaraku';
    const lblContoh = ambilTeks('S-23', 'tombol_dengar_contoh') || 'Dengar contoh';
    const penjelasan = ambilTeks('S-23', 'penjelasan') || 'Rekaman latihan ini hanya ada di HP-mu.';
    const lblLewati = ambilTeks('S-23', 'tombol_lewati') || 'Lewati rekam (HP bermasalah)';
    const lblLanjut = ambilTeks('S-23', 'tombol_lanjut_refleksi') || 'Lanjut ke refleksi';
    const lblAktif = ambilTeks('S-23', 'tombol_aktif') || 'Aktif';
    const lblPilih = ambilTeks('S-23', 'tombol_pilih') || 'Pilih';
    const lblGiliran = (ambilTeks('S-23', 'label_giliran') || 'Giliran {n}').replace('{n}', String(butirAktif.no || 1));

    const statusLabel = statusRekam === 'merekam'
      ? (ambilTeks('S-23', 'status_merekam') || 'Sedang merekam… silakan berbicara.')
      : statusRekam === 'tersimpan'
        ? (ambilTeks('S-23', 'status_tersimpan') || 'Rekaman tersimpan ✓')
        : (ambilTeks('S-23', 'status_siap') || 'Siap merekam (maksimal 15 detik).');

    const pilihHtml = daftarTiru.map((t) => {
      const dipilih = kemajuan.giliranDipilih.includes(t.no);
      const arab = pilihBentukTeks(t.arab, bentuk);
      const tanda = punyaRekaman[t.no] ? ' ✓' : '';
      return `
        <div style="display: flex; gap: var(--jarak-2); align-items: stretch;">
          <button
            type="button"
            class="pilihan-giliran ${dipilih ? 'pilihan-giliran--terpilih' : ''}"
            data-toggle-pilih="${t.no}"
            aria-pressed="${dipilih}"
            style="flex: 1;"
          >
            <span style="font-weight: 600;">${dipilih ? '☑' : '☐'} ${t.no}${tanda}</span>
            <span class="teks-arab" lang="ar" dir="rtl" style="flex: 1; text-align: right;">${escapeHtml(arab)}</span>
          </button>
          ${dipilih ? `<button type="button" class="tombol tombol--sekunder ${t.no === noFokus ? 'tombol--terpilih' : ''}" data-fokus-giliran="${t.no}" style="width: auto; padding-inline: var(--jarak-3);">${escapeHtml(t.no === noFokus ? lblAktif : lblPilih)}</button>` : ''}
        </div>
      `;
    }).join('');

    const labelIrama = (ambilTeks('S-23', 'pilihan_1') || 'Ya · Sedikit · Belum')
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean);
    const opsiIrama = [1, 2, 3].map((kode, idx) => ({
      kode,
      label: labelIrama[idx] || ['Ya', 'Sedikit', 'Belum'][idx]
    }));

    const labelKataBeda = (ambilTeks('S-23', 'pilihan_2') || 'Ya · Tidak')
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean);
    const opsiKataBeda = [1, 0].map((kode, idx) => ({
      kode,
      label: labelKataBeda[idx] || ['Ya', 'Tidak'][idx]
    }));

    const kurangTab = daftarTabBelumDibuka(kemajuan.tab);
    const semuaLengkap = semuaTabSesi1Selesai(kemajuan.tab);

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi1(konteks, 'S-23')}

        <section class="kartu" style="display: flex; flex-direction: column; gap: var(--jarak-2);">
          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(judulPilih)}</p>
          ${pesanPilih ? `<p class="teks-keterangan" role="status" style="margin: 0;">${escapeHtml(pesanPilih)}</p>` : ''}
          <div style="display: flex; flex-direction: column; gap: var(--jarak-2);">
            ${pilihHtml}
          </div>
        </section>

        <section class="kotak-rekam kotak-rekam--${statusRekam}" aria-live="polite">
          <span class="lencana-penanda-audio">${escapeHtml(lblGiliran)}</span>
          <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">
            ${escapeHtml(pilihBentukTeks(butirAktif.arab, bentuk))}
          </p>
          ${statusRekam === 'merekam'
            ? '<div class="indikator-gelombang" aria-hidden="true"><span class="titik-gelombang"></span><span class="titik-gelombang"></span><span class="titik-gelombang"></span></div>'
            : ''}
          <p class="${statusRekam === 'tersimpan' ? 'label-rekam-tersimpan' : 'teks-keterangan'}" style="margin: 0;">
            ${escapeHtml(statusLabel)}
          </p>
          ${pesanStatus ? `<div class="pesan-hangat" style="width: 100%; text-align: left;"><p class="pesan-hangat__isi">${escapeHtml(pesanStatus)}</p></div>` : ''}
          <button type="button" id="tombol-rekam-s23" class="tombol ${statusRekam === 'merekam' ? 'tombol-rekam--merekam' : 'tombol-rekam--siap'}">
            ${escapeHtml(lblRekam)}
          </button>
          <div class="baris-kontrol" style="width: 100%;">
            <button type="button" id="tombol-dengar-suaraku-s23" class="tombol tombol--sekunder" ${sudahRekamAktif && statusRekam !== 'merekam' ? '' : 'disabled'}>
              ${escapeHtml(lblSuaraku)}
            </button>
            <button type="button" id="tombol-dengar-contoh-s23" class="tombol tombol--sekunder" ${statusRekam === 'merekam' ? 'disabled' : ''}>
              ${escapeHtml(lblContoh)}
            </button>
          </div>
          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(penjelasan)}</p>
        </section>

        <section class="kartu" style="display: flex; flex-direction: column; gap: var(--jarak-3);">
          <div class="kelompok-skala">
            <p class="teks-instruksi" style="margin: 0;">${escapeHtml(ambilTeks('S-23', 'penilaian_diri_1') || 'Iramanya mirip?')}</p>
            <div class="baris-pilihan-3" role="group" aria-label="Penilaian irama">
              ${opsiIrama.map((o) => `
                <button type="button" class="tombol tombol--sekunder ${kemajuan.irama === o.kode ? 'tombol--terpilih' : ''}" data-irama="${o.kode}" aria-pressed="${kemajuan.irama === o.kode}">
                  ${escapeHtml(o.label)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="kelompok-skala">
            <p class="teks-instruksi" style="margin: 0;">${escapeHtml(ambilTeks('S-23', 'penilaian_diri_2') || 'Ada kata yang terasa berbeda?')}</p>
            <div class="baris-pilihan-kecil" role="group" aria-label="Penilaian kata berbeda">
              ${opsiKataBeda.map((o) => `
                <button type="button" class="tombol tombol--sekunder ${kemajuan.kataBeda === o.kode ? 'tombol--terpilih' : ''}" data-kata-beda="${o.kode}" aria-pressed="${kemajuan.kataBeda === o.kode}">
                  ${escapeHtml(o.label)}
                </button>
              `).join('')}
            </div>
          </div>
          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(ambilTeks('S-23', 'catatan_penilaian') || 'Penilaian diri ini hanya untukmu, bukan nilai.')}</p>
        </section>

        ${!semuaLengkap ? `
          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi">${escapeHtml((ambilTeks('S-23', 'pesan_lengkapi_tab') || 'Yuk buka dulu tab yang belum bertanda centang ({daftar}) sebelum lanjut ke refleksi.').replace('{daftar}', kurangTab.join(', ')))}</p>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: var(--jarak-2);">
          <button type="button" id="tombol-lanjut-s23" class="tombol tombol--utama">
            ${escapeHtml(lblLanjut)}
          </button>
          <button type="button" id="tombol-lewati-s23" class="tombol tombol--sekunder">
            ${escapeHtml(lblLewati)}
          </button>
        </div>
      </section>
    `;

    pasangEvent();
  }

  async function mulaiRekam() {
    hentikanAudioModel();
    hentikanPutarSuaraku();
    pesanStatus = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      statusRekam = 'siap';
      pesanStatus = ambilTeks('S-23', 'pesan_mikrofon_kendala') || 'Mikrofon belum bisa dipakai sekarang. Kamu bisa melewati bagian rekam ini.';
      await catatKendalaTeknis('mikrofon_tidak_didukung', 'S-23');
      lukis();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aktifDiLayar || !konteks.masihAktif()) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      streamAktif = stream;
      const mime = pilihMimeRekam();
      const opsiRec = mime ? { mimeType: mime, audioBitsPerSecond: bitrateBps } : { audioBitsPerSecond: bitrateBps };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, opsiRec);
      } catch (_) {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorder = recorder;

      const potongan = [];
      const mulaiMs = Date.now();
      let pernahBersuara = false;
      alasanHenti = 'manual';

      // Pantau tingkat suara agar bisa berhenti otomatis pada 10 detik bila sunyi (R-26 / K-17)
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioCtxMonitor = new AudioCtx();
          const sumber = audioCtxMonitor.createMediaStreamSource(stream);
          const analyser = audioCtxMonitor.createAnalyser();
          analyser.fftSize = 1024;
          sumber.connect(analyser);
          const buf = new Float32Array(analyser.fftSize);
          const ambangRms = (kalibrasiLatar && typeof kalibrasiLatar.ambang_dipakai === 'number' && kalibrasiLatar.ambang_dipakai > 0)
            ? kalibrasiLatar.ambang_dipakai
            : 0.012;
          intervalMonitor = setInterval(() => {
            analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
            if (Math.sqrt(sum / buf.length) >= ambangRms) pernahBersuara = true;
          }, 150);
        }
      } catch (_) {
        // Bila Web Audio monitor gagal, lanjutkan dengan analisis blob setelah berhenti
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) potongan.push(ev.data);
      };

      recorder.onstop = async () => {
        bersihkanSumberRekam();
        if (!aktifDiLayar || !konteks.masihAktif() || alasanHenti === 'batal' || alasanHenti === 'lewati') {
          statusRekam = punyaRekaman[noFokus] ? 'tersimpan' : 'siap';
          return;
        }

        const durasi = Math.max(0.2, Math.round(((Date.now() - mulaiMs) / 1000) * 10) / 10);
        const tipe = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(potongan, { type: tipe });

        let metrik = null;
        try {
          metrik = await analisisAmplitudoBlob(blob, kalibrasiLatar);
        } catch (_) {
          metrik = null;
        }
        if (!aktifDiLayar || !konteks.masihAktif()) return;

        const evaluasi = evaluasiHasilRekamSesi1({
          alasanHenti,
          metrik,
          pernahBersuara,
          durasi,
          minDetikSah
        });

        if (evaluasi.hitungPercobaan) {
          percobaanCount += 1;
          await catatKejadianSesi1(unitId, blokId, 'percobaan_rekam', percobaanCount, {
            butir: `${blokId}-T${noFokus}`,
            ...(evaluasi.kategori === 'diam10' ? { flag: 'tidak_bersuara' } : {})
          });
          if (!aktifDiLayar || !konteks.masihAktif()) return;
        }

        if (!evaluasi.simpan) {
          statusRekam = punyaRekaman[noFokus] ? 'tersimpan' : 'siap';
          pesanStatus = evaluasi.kategori === 'diam10'
            ? (ambilTeks('S-23', 'pesan_tidak_bersuara') || 'Tidak apa-apa, coba lagi kapan siap.')
            : (ambilTeks('S-23', 'pesan_sunyi_pendek') || 'Sepertinya suaramu tidak terekam. Cek mikrofonmu, lalu coba lagi.');
          lukis();
          return;
        }

        await simpanRekamanLatihan(kunciRekam(noFokus), {
          blob,
          mime: tipe,
          durasi,
          durasi_bicara: evaluasi.durasiBicara,
          waktu: Date.now()
        });
        punyaRekaman[noFokus] = true;
        statusRekam = 'tersimpan';
        pesanStatus = '';

        kirimAtauAntre(
          'catat',
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'S1_REKAM',
            id_item: `${blokId}-T${noFokus}`,
            bagian: noFokus,
            konteks: 'sesi1',
            percobaan: percobaanCount,
            hasil: 'tersimpan',
            durasi_bicara: evaluasi.durasiBicara
          },
          `Rekam Sesi 1 (${blokId}-T${noFokus})`
        );

        if (aktifDiLayar && konteks.masihAktif()) lukis();
      };

      recorder.start();
      statusRekam = 'merekam';
      timerDiam = setTimeout(() => {
        if (!pernahBersuara && mediaRecorder && mediaRecorder.state === 'recording') {
          alasanHenti = 'diam10';
          mediaRecorder.stop();
        }
      }, batasDiam * 1000);
      timerBatas = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          alasanHenti = 'batas15';
          mediaRecorder.stop();
        }
      }, batasDetik * 1000);

      lukis();
    } catch (_) {
      bersihkanSumberRekam();
      statusRekam = 'siap';
      pesanStatus = ambilTeks('S-23', 'pesan_mikrofon_kendala') || 'Mikrofon belum bisa dipakai sekarang. Kamu bisa melewati bagian rekam ini.';
      await catatKendalaTeknis('izin_atau_perangkat_mikrofon', 'S-23');
      lukis();
    }
  }

  function hentikanRekam(alasan = 'manual') {
    alasanHenti = alasan;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }

  function pasangEvent() {
    pasangNavigasiSesi1(konteks, () => lukis());

    wadah.querySelectorAll('[data-toggle-pilih]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const no = Number(btn.getAttribute('data-toggle-pilih'));
        const ada = kemajuan.giliranDipilih.includes(no);
        pesanPilih = '';
        if (ada) {
          if (kemajuan.giliranDipilih.length <= 2) {
            pesanPilih = ambilTeks('S-23', 'petunjuk_batas_pilih') || 'Pilih minimal 2 dan maksimal 3 giliran ya.';
            lukis();
            return;
          }
          kemajuan.giliranDipilih = kemajuan.giliranDipilih.filter((n) => n !== no);
        } else {
          if (kemajuan.giliranDipilih.length >= 3) {
            pesanPilih = ambilTeks('S-23', 'petunjuk_batas_pilih') || 'Pilih minimal 2 dan maksimal 3 giliran ya.';
            lukis();
            return;
          }
          kemajuan.giliranDipilih = [...kemajuan.giliranDipilih, no];
          noFokus = no;
        }
        await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
        lukis();
      });
    });

    wadah.querySelectorAll('[data-fokus-giliran]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (statusRekam === 'merekam') return;
        noFokus = Number(btn.getAttribute('data-fokus-giliran'));
        pesanStatus = '';
        lukis();
      });
    });

    const btnRekam = wadah.querySelector('#tombol-rekam-s23');
    if (btnRekam) {
      btnRekam.addEventListener('click', () => {
        if (statusRekam === 'merekam') hentikanRekam('manual');
        else mulaiRekam();
      });
    }

    const btnSuaraku = wadah.querySelector('#tombol-dengar-suaraku-s23');
    if (btnSuaraku) {
      btnSuaraku.addEventListener('click', async () => {
        hentikanAudioModel();
        hentikanPutarSuaraku();
        const rek = await ambilRekamanLatihan(kunciRekam(noFokus));
        if (!rek || !rek.blob) return;
        const urlObj = URL.createObjectURL(rek.blob);
        const audio = new Audio(urlObj);
        audioSuarakuAktif = audio;
        audio.addEventListener('ended', () => URL.revokeObjectURL(urlObj), { once: true });
        audio.addEventListener('error', () => URL.revokeObjectURL(urlObj), { once: true });
        audio.play().catch(() => URL.revokeObjectURL(urlObj));
      });
    }

    const btnContoh = wadah.querySelector('#tombol-dengar-contoh-s23');
    if (btnContoh) {
      btnContoh.addEventListener('click', async () => {
        hentikanPutarSuaraku();
        const butir = daftarTiru.find((t) => t.no === noFokus);
        if (!butir) return;
        const daftarId = pilihBentukAudio(butir.audio, kemajuan.bentukLawan);
        const hasil = await putarDaftarAudioModel(daftarId, folderAudioUnit(unitId), { kecepatan: 1 });
        if (hasil.status === 'penanda') {
          pesanStatus = ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).';
          lukis();
        }
      });
    }

    wadah.querySelectorAll('[data-irama]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nilai = Number(btn.getAttribute('data-irama'));
        kemajuan.irama = nilai;
        await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
        catatKejadianSesi1(unitId, blokId, 'penilaian_irama', nilai, { butir: `${blokId}-T${noFokus}` });
        lukis();
      });
    });

    wadah.querySelectorAll('[data-kata-beda]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nilai = Number(btn.getAttribute('data-kata-beda'));
        kemajuan.kataBeda = nilai;
        await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
        catatKejadianSesi1(unitId, blokId, 'penilaian_kata_beda', nilai, { butir: `${blokId}-T${noFokus}` });
        lukis();
      });
    });

    const btnLewati = wadah.querySelector('#tombol-lewati-s23');
    if (btnLewati) {
      btnLewati.addEventListener('click', async () => {
        if (statusRekam === 'merekam') hentikanRekam('lewati');
        hentikanAudioModel();
        hentikanPutarSuaraku();
        kemajuan.dilewatiTeknis = true;
        await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
        catatKejadianSesi1(unitId, blokId, 'dilewati_teknis', 1, {
          butir: `${blokId}-S1`,
          flag: 'kendala_teknis'
        });
        kirimAtauAntre(
          'catat',
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'S1_REKAM',
            id_item: `${blokId}-S1`,
            bagian: 0,
            konteks: 'sesi1',
            percobaan: percobaanCount,
            hasil: 'dilewati_teknis'
          },
          `Lewati rekam Sesi 1 (${blokId})`
        );
        if (semuaTabSesi1Selesai(kemajuan.tab)) {
          arahKe('S-24', { unit: unitId, blok: blokId });
        } else {
          pesanStatus = (ambilTeks('S-23', 'pesan_lengkapi_tab') || 'Yuk buka dulu tab yang belum bertanda centang ({daftar}) sebelum lanjut ke refleksi.')
            .replace('{daftar}', daftarTabBelumDibuka(kemajuan.tab).join(', '));
          lukis();
        }
      });
    }

    const btnLanjut = wadah.querySelector('#tombol-lanjut-s23');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        if (!semuaTabSesi1Selesai(kemajuan.tab)) {
          pesanStatus = (ambilTeks('S-23', 'pesan_lengkapi_tab') || 'Yuk buka dulu tab yang belum bertanda centang ({daftar}) sebelum lanjut ke refleksi.')
            .replace('{daftar}', daftarTabBelumDibuka(kemajuan.tab).join(', '));
          lukis();
          return;
        }
        hentikanAudioModel();
        hentikanPutarSuaraku();
        arahKe('S-24', { unit: unitId, blok: blokId });
      });
    }
  }

  lukis();
}
