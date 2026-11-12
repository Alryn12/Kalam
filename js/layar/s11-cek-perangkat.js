/**
 * Layar S-11: Cek Perangkat (situs/js/layar/s11-cek-perangkat.js)
 * Tugas M1-C: TB-M1-04
 * Acuan: SRS-3 FR-005, FR-072, FR-074; BP-1 S-11; BP-5 K-10 & K-13; BP-6 S-11; KEPUTUSAN.md SL-BARU-08; keputusan-M0.md
 */

import { panggilApi } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import {
  ambilFase,
  analisisAmplitudoBlob,
  escapeHtml,
  kirimAtauAntre,
  pilihMimeRekam,
  siapkanWadahLayar,
  simpanKalibrasiLatar,
  simpanKemajuanTahap0
} from './tahap0-bantu.js';

function deteksiBenderaPengenalanSuara() {
  const state = ambilState();
  const adaApi = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  const adalahHp = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const matikanDiHp = Boolean(
    state.parameter &&
    state.parameter.deteksi_kata_kunci &&
    state.parameter.deteksi_kata_kunci.matikan_pengenalan_suara_di_hp
  );

  // Sesuai keputusan-M0.md: pada seluruh HP siswa, pengenalan suara tidak dipakai (mode mandiri otomatis)
  if (adalahHp && matikanDiHp) {
    return 0;
  }
  return adaApi ? 1 : 0;
}

export async function renderS11({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = ambilTeks('S-11', 'judul') || 'Cek HP-mu';
  const wadah = siapkanWadahLayar('S-11', judul);
  if (!wadah) return;

  const teksIzin = ambilTeks('S-11', 'tombol_izin');
  const teksInstruksi = ambilTeks('S-11', 'instruksi');
  const teksRekam = ambilTeks('S-11', 'tombol_rekam');
  const teksPutar = ambilTeks('S-11', 'tombol_putar');
  const teksTanyaDengar = ambilTeks('S-11', 'pertanyaan_dengar');
  const teksYa = ambilTeks('S-11', 'pilihan_ya');
  const teksBelum = ambilTeks('S-11', 'pilihan_belum');
  const teksSukses = ambilTeks('S-11', 'sukses');
  const teksDitolak = ambilTeks('S-11', 'izin_ditolak');
  const teksBantuan = ambilTeks('S-11', 'tombol_bantuan');
  const teksInternet = ambilTeks('S-11', 'internet_bermasalah');
  const teksLanjut = ambilTeks('S-11', 'tombol');

  let izinMikrofon = 0;
  let tesRekamOk = 0;
  let internetOk = 0;
  let ambangSuaraLatar = 0.02;
  const dukunganSuara = deteksiBenderaPengenalanSuara();
  let jumlahTidakTerdengar = 0;
  let audioUrl = '';
  let sedangMerekam = false;
  let audioPemutar = null;

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s11">
      <h1 id="judul-s11" class="judul-layar">${escapeHtml(judul)}</h1>

      <div id="status-internet-s11" class="daftar-status" aria-live="polite">
        <span class="penanda-status penanda-status--menunggu">
          <span class="penanda-status__ikon" aria-hidden="true">&#9719;</span>
          <span>Memeriksa internet…</span>
        </span>
      </div>

      <div id="kotak-internet-masalah-s11" class="pesan-hangat pesan-hangat--aksen" role="status" hidden>
        <p class="pesan-hangat__isi">${escapeHtml(teksInternet)}</p>
        <button type="button" id="tombol-cek-internet-s11" class="tombol tombol--sekunder">Coba lagi</button>
      </div>

      <button type="button" id="tombol-izin-s11" class="tombol tombol--utama">
        ${escapeHtml(teksIzin)}
      </button>

      <div id="kotak-izin-ditolak-s11" class="pesan-hangat pesan-hangat--aksen" role="status" hidden>
        <p class="pesan-hangat__isi">${escapeHtml(teksDitolak)}</p>
        <button type="button" id="tombol-bantuan-s11" class="tombol tombol--sekunder">
          ${escapeHtml(teksBantuan)}
        </button>
        <div id="isi-bantuan-s11" class="pesan-hangat" hidden style="margin-top: var(--jarak-2);">
          <p class="pesan-hangat__isi">
            1. Ketuk ikon gembok atau pengaturan di sebelah alamat situs pada perambanmu.<br>
            2. Pilih <strong>Mikrofon</strong> lalu ubah ke <strong>Izinkan</strong>.<br>
            3. Jika masih belum bisa, tunjukkan layar ini ke gurumu untuk memakai HP lain.
          </p>
        </div>
      </div>

      <div id="kotak-rekam-s11" class="kotak-rekam kotak-rekam--siap" hidden>
        <p class="teks-instruksi" style="margin: 0;">${escapeHtml(teksInstruksi)}</p>
        <button type="button" id="tombol-rekam-s11" class="tombol tombol-rekam--siap">
          <span aria-hidden="true">&#9679;</span> ${escapeHtml(teksRekam)}
        </button>
        <div id="status-rekam-s11" aria-live="polite"></div>

        <div id="area-putar-s11" class="baris-tombol" hidden>
          <button type="button" id="tombol-putar-s11" class="tombol tombol--sekunder">
            &#9654; ${escapeHtml(teksPutar)}
          </button>
          <p class="teks-instruksi" style="margin: var(--jarak-2) 0 0 0; font-weight: 600;">
            ${escapeHtml(teksTanyaDengar)}
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--jarak-2); width: 100%;">
            <button type="button" id="tombol-dengar-ya-s11" class="tombol tombol--sekunder">
              ${escapeHtml(teksYa)}
            </button>
            <button type="button" id="tombol-dengar-belum-s11" class="tombol tombol--sekunder">
              ${escapeHtml(teksBelum)}
            </button>
          </div>
        </div>
      </div>

      <div id="pesan-hasil-s11" aria-live="polite"></div>

      <button type="button" id="tombol-lanjut-s11" class="tombol tombol--nonaktif" disabled>
        ${escapeHtml(teksLanjut)}
      </button>
    </section>
  `;

  const elStatusNet = document.getElementById('status-internet-s11');
  const elNetMasalah = document.getElementById('kotak-internet-masalah-s11');
  const btnCekNet = document.getElementById('tombol-cek-internet-s11');
  const btnIzin = document.getElementById('tombol-izin-s11');
  const elIzinDitolak = document.getElementById('kotak-izin-ditolak-s11');
  const btnBantuan = document.getElementById('tombol-bantuan-s11');
  const elIsiBantuan = document.getElementById('isi-bantuan-s11');
  const elKotakRekam = document.getElementById('kotak-rekam-s11');
  const btnRekam = document.getElementById('tombol-rekam-s11');
  const elStatusRekam = document.getElementById('status-rekam-s11');
  const elAreaPutar = document.getElementById('area-putar-s11');
  const btnPutar = document.getElementById('tombol-putar-s11');
  const btnYa = document.getElementById('tombol-dengar-ya-s11');
  const btnBelum = document.getElementById('tombol-dengar-belum-s11');
  const elPesanHasil = document.getElementById('pesan-hasil-s11');
  const btnLanjut = document.getElementById('tombol-lanjut-s11');

  function perbaruiTombolLanjut() {
    const siap = izinMikrofon === 1 && tesRekamOk === 1 && internetOk === 1;
    if (!btnLanjut) return;
    btnLanjut.disabled = !siap;
    btnLanjut.classList.toggle('tombol--utama', siap);
    btnLanjut.classList.toggle('tombol--nonaktif', !siap);
  }

  async function cekInternet() {
    if (elStatusNet) {
      elStatusNet.innerHTML = `
        <span class="penanda-status penanda-status--menunggu">
          <span class="penanda-status__ikon" aria-hidden="true">&#9719;</span>
          <span>Memeriksa internet…</span>
        </span>
      `;
    }
    const onlineNav = typeof navigator === 'undefined' || navigator.onLine !== false;
    let pingOk = false;
    if (onlineNav) {
      const res = await panggilApi('ping', {}, { tanpaUlang: true, janganArahkan: true });
      pingOk = Boolean(res && res.ok);
    }

    internetOk = pingOk ? 1 : 0;
    if (elNetMasalah) elNetMasalah.hidden = pingOk;
    if (elStatusNet) {
      elStatusNet.innerHTML = pingOk
        ? `<span class="penanda-status penanda-status--terkirim"><span class="penanda-status__ikon" aria-hidden="true">&#10003;</span><span>Internet terhubung</span></span>`
        : `<span class="penanda-status penanda-status--coba-lagi"><span class="penanda-status__ikon" aria-hidden="true">&#8635;</span><span>Internet belum terhubung</span></span>`;
    }
    perbaruiTombolLanjut();
  }

  if (btnCekNet) {
    btnCekNet.addEventListener('click', cekInternet);
  }

  if (btnBantuan && elIsiBantuan) {
    btnBantuan.addEventListener('click', () => {
      elIsiBantuan.hidden = !elIsiBantuan.hidden;
    });
  }

  if (btnIzin) {
    btnIzin.addEventListener('click', async () => {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        izinMikrofon = 0;
        if (elIzinDitolak) elIzinDitolak.hidden = false;
        perbaruiTombolLanjut();
        return;
      }

      btnIzin.disabled = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        izinMikrofon = 1;
        if (elIzinDitolak) elIzinDitolak.hidden = true;
        if (elKotakRekam) elKotakRekam.hidden = false;
        btnIzin.className = 'tombol tombol--terpilih';
        btnIzin.textContent = '✓ Mikrofon diizinkan';
      } catch (_) {
        izinMikrofon = 0;
        btnIzin.disabled = false;
        if (elIzinDitolak) elIzinDitolak.hidden = false;
        kirimAtauAntre('catat', {
          tahap: fase,
          aspek: 'izin_mikrofon',
          butir: 'P-01',
          nilai: 0
        }, 'Cek izin mikrofon');
      }
      perbaruiTombolLanjut();
    });
  }

  if (btnRekam) {
    btnRekam.addEventListener('click', async () => {
      if (sedangMerekam) return;
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof window.MediaRecorder === 'undefined') {
        if (elIzinDitolak) elIzinDitolak.hidden = false;
        return;
      }

      sedangMerekam = true;
      tesRekamOk = 0;
      perbaruiTombolLanjut();
      if (elPesanHasil) elPesanHasil.innerHTML = '';
      if (elAreaPutar) elAreaPutar.hidden = true;
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = '';
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
        });
      } catch (_) {
        sedangMerekam = false;
        izinMikrofon = 0;
        if (elIzinDitolak) elIzinDitolak.hidden = false;
        return;
      }

      const mime = pilihMimeRekam();
      const opsiRecorder = { audioBitsPerSecond: 24000 };
      if (mime) opsiRecorder.mimeType = mime;

      let recorder;
      try {
        recorder = new MediaRecorder(stream, opsiRecorder);
      } catch (_) {
        recorder = new MediaRecorder(stream);
      }

      const potongan = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) potongan.push(ev.data);
      };

      if (elKotakRekam) {
        elKotakRekam.className = 'kotak-rekam kotak-rekam--merekam';
      }
      btnRekam.disabled = true;
      btnRekam.className = 'tombol tombol-rekam--merekam';
      btnRekam.innerHTML = '<span class="titik-gelombang" aria-hidden="true"></span> Merekam (3 detik)…';
      if (elStatusRekam) {
        elStatusRekam.innerHTML = '<p class="indikator-gelombang">Ucapkan namamu sekarang…</p>';
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        sedangMerekam = false;

        const blob = new Blob(potongan, { type: recorder.mimeType || mime || 'audio/webm' });
        audioUrl = URL.createObjectURL(blob);

        try {
          const metrik = await analisisAmplitudoBlob(blob);
          if (metrik && metrik.statistik_rms) {
            ambangSuaraLatar = metrik.statistik_rms.ambang_dipakai;
            await simpanKalibrasiLatar({
              L: metrik.statistik_rms.L,
              S: metrik.statistik_rms.S,
              ambang_dipakai: ambangSuaraLatar
            });
          }
        } catch (_) {
          // Gunakan nilai ambang bawaan jika dekode tidak tersedia
        }

        if (elKotakRekam) {
          elKotakRekam.className = 'kotak-rekam kotak-rekam--tersimpan';
        }
        btnRekam.disabled = false;
        btnRekam.className = 'tombol tombol-rekam--siap';
        btnRekam.innerHTML = `<span aria-hidden="true">&#9679;</span> ${escapeHtml(teksRekam)}`;
        if (elStatusRekam) {
          elStatusRekam.innerHTML = '<p class="label-rekam-tersimpan">&#10003; Rekaman siap didengarkan</p>';
        }
        if (elAreaPutar) elAreaPutar.hidden = false;
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);
    });
  }

  if (btnPutar) {
    btnPutar.addEventListener('click', () => {
      if (!audioUrl) return;
      if (audioPemutar) {
        audioPemutar.pause();
      }
      audioPemutar = new Audio(audioUrl);
      audioPemutar.play().catch(() => {});
    });
  }

  if (btnYa) {
    btnYa.addEventListener('click', () => {
      tesRekamOk = 1;
      btnYa.className = 'tombol tombol--utama';
      if (btnBelum) btnBelum.className = 'tombol tombol--sekunder';
      if (elPesanHasil) {
        elPesanHasil.innerHTML = `
          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi" style="font-weight: 600;">${escapeHtml(teksSukses)}</p>
          </div>
        `;
      }
      perbaruiTombolLanjut();
    });
  }

  if (btnBelum) {
    btnBelum.addEventListener('click', () => {
      tesRekamOk = 0;
      jumlahTidakTerdengar += 1;
      btnBelum.className = 'tombol tombol--terpilih';
      if (btnYa) btnYa.className = 'tombol tombol--sekunder';
      perbaruiTombolLanjut();

      if (jumlahTidakTerdengar <= 2) {
        if (elPesanHasil) {
          elPesanHasil.innerHTML = `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi">Tidak apa-apa. Dekatkan mikrofon lalu tekan Rekam 3 detik sekali lagi (${jumlahTidakTerdengar} dari 2 ulang).</p>
            </div>
          `;
        }
      } else {
        if (elPesanHasil) {
          elPesanHasil.innerHTML = `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi">Sepertinya mikrofon HP ini butuh bantuan gurumu. Tunjukkan layar ini ke gurumu ya.</p>
              <button type="button" id="tombol-bantuan-rekam-s11" class="tombol tombol--sekunder" style="margin-top: var(--jarak-2);">
                ${escapeHtml(teksBantuan)}
              </button>
            </div>
          `;
          const btnBantuanRekam = document.getElementById('tombol-bantuan-rekam-s11');
          if (btnBantuanRekam && elIzinDitolak && elIsiBantuan) {
            btnBantuanRekam.addEventListener('click', () => {
              elIzinDitolak.hidden = false;
              elIsiBantuan.hidden = false;
            });
          }
        }
        kirimAtauAntre('catat', {
          jenis: 'kendala',
          jenis_kendala: 'perlu_bantuan_guru',
          layar: 'S-11'
        }, 'Kendala tes rekam S-11');
      }
    });
  }

  if (btnLanjut) {
    btnLanjut.addEventListener('click', async () => {
      if (btnLanjut.disabled) return;
      btnLanjut.disabled = true;
      btnLanjut.textContent = 'Menyimpan…';

      const ambangValid = Math.min(1, Math.max(0, Number(ambangSuaraLatar) || 0.02));
      const daftarPeristiwa = [
        { jenis: 'kejadian', isi: { tahap: fase, aspek: 'izin_mikrofon', butir: 'P-01', nilai: 1 } },
        { jenis: 'kejadian', isi: { tahap: fase, aspek: 'tes_rekam_ok', butir: 'P-02', nilai: 1 } },
        { jenis: 'kejadian', isi: { tahap: fase, aspek: 'ambang_suara_latar', butir: 'P-02', nilai: Number(ambangValid.toFixed(4)) } },
        { jenis: 'kejadian', isi: { tahap: fase, aspek: 'internet_ok', butir: 'P-04', nilai: 1 } },
        { jenis: 'kejadian', isi: { tahap: fase, aspek: 'dukungan_pengenalan_suara', butir: 'P-04', nilai: dukunganSuara } }
      ];

      await kirimAtauAntre('catat', { peristiwa: daftarPeristiwa }, 'Cek perangkat S-11');
      await simpanKemajuanTahap0('S-12', fase, { konteks: 'cek_perangkat' });
      arahKe('S-12', { konteks: 'cek_perangkat', fase });
    });
  }

  await cekInternet();
}
