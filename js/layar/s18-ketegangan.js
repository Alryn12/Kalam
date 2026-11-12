/**
 * Layar S-18: Ketegangan (situs/js/layar/s18-ketegangan.js)
 * Tugas M1-D: TB-M1-05
 * Acuan: SRS-3 FR-012; IN-1 §3.7 (TG-01); BP-1 S-18; BP-6 S-18
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

export async function renderS18({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = ambilTeks('S-18', 'judul') || 'Ketegangan';
  const wadah = siapkanWadahLayar('S-18', judul);
  if (!wadah) return;

  const pertanyaan = ambilTeks('S-18', 'pertanyaan');
  const labelSkala = ambilTeks('S-18', 'label_skala');
  const teksLewati = ambilTeks('S-18', 'tombol');
  const tujuan = fase === 'AF' ? 'S-70' : 'S-19';

  let sedangKirim = false;

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s18">
      <h1 id="judul-s18" class="judul-layar">${escapeHtml(judul)}</h1>
      <p class="teks-instruksi">${escapeHtml(pertanyaan)}</p>

      <div class="kelompok-skala">
        <div class="baris-skala-5" role="group" aria-label="Skala ketegangan 1 sampai 5">
          ${[1, 2, 3, 4, 5].map((angka) => `
            <button
              type="button"
              class="tombol-skala tombol-skala-s18"
              data-nilai="${angka}"
              aria-label="Nilai ${angka}"
            >
              ${angka}
            </button>
          `).join('')}
        </div>
        <div class="keterangan-skala">
          <span>1 Santai</span>
          <span>5 Sangat tegang</span>
        </div>
        <p class="daftar-label-skala">${escapeHtml(labelSkala)}</p>
      </div>

      <button type="button" id="tombol-lewati-s18" class="tombol tombol--sekunder">
        ${escapeHtml(teksLewati)}
      </button>
    </section>
  `;

  const tombolAngka = Array.from(wadah.querySelectorAll('.tombol-skala-s18'));
  const btnLewati = document.getElementById('tombol-lewati-s18');

  async function kirimDanLanjut(nilai, flag = '') {
    if (sedangKirim) return;
    sedangKirim = true;

    tombolAngka.forEach((b) => { b.disabled = true; });
    if (btnLewati) btnLewati.disabled = true;

    await kirimAtauAntre(
      'catat',
      {
        tahap: fase,
        aspek: 'ketegangan',
        butir: 'TG-01',
        nilai: nilai === '' ? '' : Number(nilai),
        flag
      },
      `Ketegangan (${fase})`
    );

    if (fase === 'T0') {
      await simpanKemajuanTahap0(tujuan, fase);
    }
    arahKe(tujuan, fase === 'AF' ? { fase } : {});
  }

  tombolAngka.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.add('tombol-skala--terpilih');
      btn.setAttribute('aria-pressed', 'true');
      const nilai = Number(btn.getAttribute('data-nilai'));
      kirimDanLanjut(nilai, '');
    });
  });

  if (btnLewati) {
    btnLewati.addEventListener('click', () => {
      kirimDanLanjut('', 'lewati');
    });
  }
}
