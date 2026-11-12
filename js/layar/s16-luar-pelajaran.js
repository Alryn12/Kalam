/**
 * Layar S-16: Di Luar Pelajaran (situs/js/layar/s16-luar-pelajaran.js)
 * Tugas M1-D: TB-M1-05
 * Acuan: SRS-3 FR-010; IN-1 §3.5 KD-07 (LP-01); BP-1 S-16; BP-6 S-16
 */

import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import {
  ambilFase,
  escapeHtml,
  kirimAtauAntre,
  siapkanWadahLayar,
  simpanKemajuanTahap0
} from './tahap0-bantu.js';

export async function renderS16({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = ambilTeks('S-16', 'judul') || 'Di luar pelajaran';
  const wadah = siapkanWadahLayar('S-16', judul);
  if (!wadah) return;

  const pertanyaan = ambilTeks('S-16', 'pertanyaan');
  const keterangan = ambilTeks('S-16', 'keterangan');
  const pilihan = [
    { kode: 1, teks: ambilTeks('S-16', 'pilihan_1') },
    { kode: 2, teks: ambilTeks('S-16', 'pilihan_2') },
    { kode: 3, teks: ambilTeks('S-16', 'pilihan_3') },
    { kode: 4, teks: ambilTeks('S-16', 'pilihan_4') }
  ];
  const teksLewati = ambilTeks('S-16', 'tombol');

  let sedangKirim = false;

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s16">
      <h1 id="judul-s16" class="judul-layar">${escapeHtml(judul)}</h1>
      <p class="teks-instruksi">${escapeHtml(pertanyaan)}</p>
      <p class="teks-keterangan">${escapeHtml(keterangan)}</p>

      <div class="baris-tombol" role="group" aria-label="${escapeHtml(pertanyaan)}">
        ${pilihan.map((p) => `
          <button type="button" class="tombol tombol--sekunder pilihan-luar-s16" data-nilai="${p.kode}">
            ${escapeHtml(p.teks)}
          </button>
        `).join('')}
      </div>

      <button type="button" id="tombol-lewati-s16" class="tombol tombol--sekunder">
        ${escapeHtml(teksLewati)}
      </button>
    </section>
  `;

  const tombolPilihan = Array.from(wadah.querySelectorAll('.pilihan-luar-s16'));
  const btnLewati = document.getElementById('tombol-lewati-s16');

  async function kirimDanLanjut(nilai, flag = '') {
    if (sedangKirim) return;
    sedangKirim = true;

    tombolPilihan.forEach((b) => { b.disabled = true; });
    if (btnLewati) btnLewati.disabled = true;

    await kirimAtauAntre(
      'catat',
      {
        tahap: fase,
        aspek: 'luar_pelajaran',
        butir: 'LP-01',
        nilai: nilai === '' ? '' : Number(nilai),
        flag
      },
      `Di luar pelajaran (${fase})`
    );

    await simpanKemajuanTahap0('S-12', fase, { konteks: 'sebelum_suara' });
    arahKe('S-12', { konteks: 'sebelum_suara', fase });
  }

  tombolPilihan.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.add('tombol--terpilih');
      const kode = Number(btn.getAttribute('data-nilai'));
      kirimDanLanjut(kode, '');
    });
  });

  if (btnLewati) {
    btnLewati.addEventListener('click', () => {
      kirimDanLanjut('', 'lewati');
    });
  }
}
