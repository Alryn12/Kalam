/**
 * Layar S-91: Pesan Sistem (situs/js/layar/s91-pesan-sistem.js)
 * Tugas M1-E: TB-M1-06
 * Acuan: SRS-3 FR-045; BP-1 S-91; BP-5 K-03, K-05, K-07, K-37, K-38; BP-6 S-91
 */

import { panggilApi, prosesAntreanLatar } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import { catatKendalaTeknis, escapeHtml, siapkanWadahLayar } from './tahap0-bantu.js';

export async function renderS91({ param = {} } = {}) {
  const jenis = String(param.jenis || 'internet').trim().toLowerCase();
  const asal = String(param.asal || '').trim().toUpperCase();
  const tujuan = String(param.tujuan || (jenis === 'belum_terbuka' ? 'S-03' : 'S-02')).trim().toUpperCase();

  let judul = ambilTeks('S-91', 'judul_internet') || 'Internet terputus';
  let penjelasan = ambilTeks('S-91', 'penjelasan') ||
    'Tidak apa-apa. Hasil yang sudah kamu kerjakan tersimpan dan akan terkirim saat internet kembali.';

  if (jenis === 'belum_terbuka') {
    judul = ambilTeks('S-91', 'judul_belum_terbuka') || 'Bagian ini belum terbuka';
    penjelasan = ambilTeks('S-91', 'penjelasan_belum_terbuka') ||
      'Selesaikan bagian sebelumnya atau tanyakan ke gurumu.';
  } else if (jenis === 'gagal_memuat' || jenis === 'konten') {
    judul = ambilTeks('S-91', 'judul_konten') || 'Materi belum termuat';
    penjelasan = ambilTeks('S-91', 'penjelasan_konten') ||
      'Berkas materi belum dapat dimuat sekarang. Periksa sinyalmu lalu ketuk Coba lagi.';
  } else if (jenis === 'audio') {
    judul = ambilTeks('S-91', 'judul_audio') || 'Audio belum termuat';
    penjelasan = 'Berkas belum dapat dimuat sekarang. Periksa sinyalmu lalu ketuk Coba lagi.';
  } else if (jenis === 'mikrofon') {
    judul = 'Mikrofon belum siap';
    penjelasan = ambilTeks('S-11', 'izin_ditolak') ||
      'Mikrofon belum diizinkan. Buka pengaturan peramban lalu izinkan mikrofon, atau minta bantuan gurumu.';
  } else if (jenis === 'perlu_internet') {
    judul = 'Perlu internet';
    penjelasan = 'Sambungkan HP-mu ke internet terlebih dahulu, lalu ketuk Coba lagi.';
  }

  const wadah = siapkanWadahLayar('S-91', judul);
  if (!wadah) return;

  const teksCobaLagi = ambilTeks('S-91', 'tombol_coba_lagi') || 'Coba lagi';
  const teksKembali = ambilTeks('S-91', 'tombol_kembali') || 'Kembali';

  // Catat kendala_teknis (kecuali K-05 aplikasi dibuka tanpa internet)
  if (jenis !== 'perlu_internet') {
    catatKendalaTeknis(jenis, asal || 'S-91');
  }

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s91">
      <div class="daftar-status">
        <span class="penanda-status penanda-status--menunggu">
          <span class="penanda-status__ikon" aria-hidden="true">&#9432;</span>
          <span>${escapeHtml(ambilTeks('S-91', 'judul') || 'Pesan sistem')}</span>
        </span>
      </div>

      <h1 id="judul-s91" class="judul-layar">${escapeHtml(judul)}</h1>

      <div class="pesan-hangat" role="status" aria-live="polite">
        <p class="pesan-hangat__isi">${escapeHtml(penjelasan)}</p>
      </div>

      <div class="baris-tombol">
        <button type="button" id="tombol-coba-lagi-s91" class="tombol tombol--utama">
          ${escapeHtml(teksCobaLagi)}
        </button>
        <button type="button" id="tombol-kembali-s91" class="tombol tombol--sekunder">
          ${escapeHtml(teksKembali)}
        </button>
      </div>
    </section>
  `;

  const btnCobaLagi = document.getElementById('tombol-coba-lagi-s91');
  const btnKembali = document.getElementById('tombol-kembali-s91');

  if (btnCobaLagi) {
    btnCobaLagi.addEventListener('click', async () => {
      btnCobaLagi.disabled = true;
      try {
        await prosesAntreanLatar({ langsung: true, tanpaUlangDalam: true });
        if (ambilState().token && (typeof navigator === 'undefined' || navigator.onLine)) {
          await panggilApi('status', {}, { tanpaUlang: true, janganArahkan: true });
        }
      } catch (_) {}

      const paramBalik = {};
      if (param.unit) paramBalik.unit = param.unit;
      if (param.blok) paramBalik.blok = param.blok;

      if (asal && asal !== 'S-91') {
        arahKe(asal, paramBalik);
      } else {
        arahKe(tujuan, paramBalik);
      }
    });
  }

  if (btnKembali) {
    btnKembali.addEventListener('click', () => {
      const state = ambilState();
      if (!state.token) {
        arahKe('S-01');
        return;
      }
      arahKe(tujuan, param.unit ? { unit: param.unit } : {});
    });
  }
}
