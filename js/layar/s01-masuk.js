/**
 * Layar S-01: Masuk (situs/js/layar/s01-masuk.js)
 * Tugas M1-C: TB-M1-03
 * Acuan: SRS-3 FR-001, BP-1 S-01, BP-5 K-30..K-32, BP-6 S-01, desain/prototipe/siswa/s-01-masuk.html
 */

import { panggilApi, prosesAntreanLatar } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, simpanSesiSiswa } from '../state.js';
import {
  escapeHtml,
  siapkanWadahLayar,
  ambilKemajuanTahap0
} from './tahap0-bantu.js';

let timerJeda = null;

function bersihkanTimerJeda() {
  if (timerJeda) {
    clearInterval(timerJeda);
    timerJeda = null;
  }
}

function susunInfoPerangkat() {
  if (typeof navigator === 'undefined') return 'peramban';
  const ua = String(navigator.userAgent || '');
  const lebar = typeof window !== 'undefined' ? window.innerWidth : 0;
  let sistem = 'Lainnya';
  if (/Android/i.test(ua)) sistem = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) sistem = 'iOS';
  else if (/Windows/i.test(ua)) sistem = 'Windows';
  else if (/Mac/i.test(ua)) sistem = 'Mac';

  let peramban = 'Peramban';
  if (/Edg\//i.test(ua)) peramban = 'Edge';
  else if (/Brave/i.test(ua)) peramban = 'Brave';
  else if (/Chrome|CriOS/i.test(ua)) peramban = 'Chrome';
  else if (/Safari/i.test(ua)) peramban = 'Safari';
  else if (/Firefox/i.test(ua)) peramban = 'Firefox';

  return `${sistem} · ${peramban} · ${lebar}px`.slice(0, 120);
}

export async function renderS01() {
  bersihkanTimerJeda();
  const state = ambilState();
  const judul = ambilTeks('S-01', 'judul') || 'Selamat datang';
  const wadah = siapkanWadahLayar('S-01', judul);
  if (!wadah) return;

  const subjudul = ambilTeks('S-01', 'subjudul');
  const labelKode = ambilTeks('S-01', 'label_kolom_1');
  const labelNama = ambilTeks('S-01', 'label_kolom_2');
  const teksTombol = ambilTeks('S-01', 'tombol');
  const teksTautan = ambilTeks('S-01', 'tautan');
  const pesanBantuan = ambilTeks('S-01', 'pesan_bantuan');

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s01">
      <h1 id="judul-s01" class="judul-layar">${escapeHtml(judul)}</h1>
      <p class="teks-instruksi">${escapeHtml(subjudul)}</p>

      <form id="form-masuk-s01" novalidate style="display: flex; flex-direction: column; gap: var(--jarak-4);">
        <div class="kelompok-input">
          <label for="input-kode-siswa" class="label-input">${escapeHtml(labelKode)}</label>
          <input
            type="text"
            id="input-kode-siswa"
            class="input-teks"
            value="${escapeHtml(state.kode_siswa || '')}"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            required
          >
        </div>

        <div class="kelompok-input">
          <label for="input-nama-panggilan" class="label-input">${escapeHtml(labelNama)}</label>
          <input
            type="text"
            id="input-nama-panggilan"
            class="input-teks"
            value="${escapeHtml(state.nama_panggilan || '')}"
            maxlength="20"
            autocomplete="off"
            required
          >
        </div>

        <button type="submit" id="tombol-masuk-s01" class="tombol tombol--utama">
          ${escapeHtml(teksTombol)}
        </button>
      </form>

      <div id="wadah-pesan-s01" aria-live="polite"></div>

      <div>
        <button type="button" id="tombol-bantuan-s01" class="tautan-aksi tautan-aksi-tombol" aria-expanded="false">
          ${escapeHtml(teksTautan)}
        </button>
      </div>

      <div id="kotak-bantuan-s01" class="pesan-hangat" role="status" hidden>
        <p class="pesan-hangat__isi">${escapeHtml(pesanBantuan)}</p>
      </div>
    </section>
  `;

  const formEl = document.getElementById('form-masuk-s01');
  const inputKode = document.getElementById('input-kode-siswa');
  const inputNama = document.getElementById('input-nama-panggilan');
  const tombolMasuk = document.getElementById('tombol-masuk-s01');
  const wadahPesan = document.getElementById('wadah-pesan-s01');
  const tombolBantuan = document.getElementById('tombol-bantuan-s01');
  const kotakBantuan = document.getElementById('kotak-bantuan-s01');

  function tampilPesanNetral(teks, aksen = true) {
    if (!wadahPesan) return;
    if (!teks) {
      wadahPesan.innerHTML = '';
      return;
    }
    const kelas = aksen ? 'pesan-hangat pesan-hangat--aksen' : 'pesan-hangat';
    wadahPesan.innerHTML = `
      <div class="${kelas}" role="status">
        <p class="pesan-hangat__isi">${escapeHtml(teks)}</p>
      </div>
    `;
  }

  function mulaiHitungMundurJeda(detikAwal) {
    bersihkanTimerJeda();
    let sisa = Math.max(1, Number(detikAwal) || 60);
    tombolMasuk.disabled = true;
    tombolMasuk.classList.add('tombol--nonaktif');
    tampilPesanNetral(ambilTeks('S-01', 'pesan_jeda', { detik: sisa }));

    timerJeda = setInterval(() => {
      sisa -= 1;
      if (sisa <= 0) {
        bersihkanTimerJeda();
        tombolMasuk.disabled = false;
        tombolMasuk.classList.remove('tombol--nonaktif');
        tampilPesanNetral('');
      } else {
        tampilPesanNetral(ambilTeks('S-01', 'pesan_jeda', { detik: sisa }));
      }
    }, 1000);
  }

  if (tombolBantuan && kotakBantuan) {
    tombolBantuan.addEventListener('click', () => {
      const terbuka = !kotakBantuan.hidden;
      kotakBantuan.hidden = terbuka;
      tombolBantuan.setAttribute('aria-expanded', String(!terbuka));
    });
  }

  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      bersihkanTimerJeda();

      const kode = String(inputKode?.value || '').trim().toUpperCase();
      const nama = String(inputNama?.value || '').replace(/<[^>]*>/g, '').trim();

      if (!kode || !nama) {
        tampilPesanNetral('Isi dulu kode siswa dan nama panggilanmu ya.');
        return;
      }
      if (nama.length > 20) {
        tampilPesanNetral('Nama panggilan maksimal 20 huruf.');
        return;
      }

      tombolMasuk.disabled = true;
      tombolMasuk.textContent = 'Memeriksa…';
      tampilPesanNetral('');

      const hasil = await panggilApi(
        'masuk',
        {
          kode,
          nama_panggilan: nama,
          info_perangkat: susunInfoPerangkat()
        },
        { tanpaUlang: true, janganArahkan: true }
      );

      tombolMasuk.disabled = false;
      tombolMasuk.textContent = teksTombol;

      if (!hasil || !hasil.ok) {
        const galat = hasil && hasil.galat ? hasil.galat : 'E_SERVER';
        if (galat === 'E_KODE') {
          tampilPesanNetral(ambilTeks('S-01', 'pesan_kode_tidak_dikenal'));
        } else if (galat === 'E_NAMA') {
          tampilPesanNetral(ambilTeks('S-01', 'pesan_nama_tidak_cocok'));
        } else if (galat === 'E_JEDA') {
          mulaiHitungMundurJeda(hasil.detik_sisa || 300);
        } else {
          tampilPesanNetral(
            (hasil && hasil.pesan) || 'Internet belum terhubung. Cek sinyalmu lalu coba masuk kembali.'
          );
        }
        return;
      }

      const dataMasuk = hasil.data || {};
      const statusServer = dataMasuk.status || {};
      await simpanSesiSiswa({
        kode_siswa: kode,
        nama_panggilan: dataMasuk.nama_panggilan || nama,
        token: dataMasuk.token || '',
        status_server: statusServer
      });

      prosesAntreanLatar();

      if (!statusServer.tahap0_selesai) {
        if (Number(statusServer.persetujuan_T0 || 0) !== 1) {
          arahKe('S-10', { fase: 'T0' });
          return;
        }
        const kemajuan = await ambilKemajuanTahap0();
        if (kemajuan && kemajuan.layar && kemajuan.fase === 'T0' && kemajuan.layar !== 'S-01') {
          arahKe(kemajuan.layar, { fase: 'T0', ...(kemajuan.param || {}) });
          return;
        }
        arahKe('S-11', { fase: 'T0' });
        return;
      }

      arahKe('S-02');
    });
  }
}
