/**
 * Layar S-15: Skala Keberanian (situs/js/layar/s15-keberanian.js)
 * Tugas M1-D: TB-M1-05
 * Acuan: SRS-3 FR-009; IN-1 §3.4 KD-06; BP-1 S-15; BP-6 S-15
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

export async function renderS15({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = ambilTeks('S-15', 'judul') || 'Seberapa berani kamu?';
  const wadah = siapkanWadahLayar('S-15', judul);
  if (!wadah) return;

  const pertanyaan1 = ambilTeks('S-15', 'pertanyaan_1');
  const pertanyaan2 = ambilTeks('S-15', 'pertanyaan_2');
  const petunjuk = ambilTeks('S-15', 'petunjuk_penggeser');
  const ujungSkala = ambilTeks('S-15', 'ujung_skala');
  const teksLanjut = ambilTeks('S-15', 'tombol_lanjut');
  const teksLewati = ambilTeks('S-15', 'tombol_lewati');

  let nilaiTeman = null;
  let nilaiGuru = null;

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s15">
      <h1 id="judul-s15" class="judul-layar">${escapeHtml(judul)}</h1>

      <div class="kelompok-penggeser">
        <label for="penggeser-teman-s15" class="label-input">${escapeHtml(pertanyaan1)}</label>
        <div class="kepala-penggeser">
          <span class="teks-keterangan" style="margin: 0;">${escapeHtml(petunjuk)}</span>
          <span id="nilai-teman-s15" class="nilai-penggeser" aria-live="polite">&ndash;</span>
        </div>
        <input
          type="range"
          id="penggeser-teman-s15"
          class="input-penggeser"
          min="1"
          max="10"
          step="1"
          value="5"
          aria-label="${escapeHtml(pertanyaan1)}"
        >
        <div class="keterangan-skala">
          <span>1 Belum berani</span>
          <span>10 Sangat berani</span>
        </div>
      </div>

      <div class="kelompok-penggeser" style="margin-top: var(--jarak-2);">
        <label for="penggeser-guru-s15" class="label-input">${escapeHtml(pertanyaan2)}</label>
        <div class="kepala-penggeser">
          <span class="teks-keterangan" style="margin: 0;">${escapeHtml(petunjuk)}</span>
          <span id="nilai-guru-s15" class="nilai-penggeser" aria-live="polite">&ndash;</span>
        </div>
        <input
          type="range"
          id="penggeser-guru-s15"
          class="input-penggeser"
          min="1"
          max="10"
          step="1"
          value="5"
          aria-label="${escapeHtml(pertanyaan2)}"
        >
        <div class="keterangan-skala">
          <span>1 Belum berani</span>
          <span>10 Sangat berani</span>
        </div>
      </div>

      <p class="daftar-label-skala">${escapeHtml(ujungSkala)}</p>

      <div class="baris-tombol">
        <button type="button" id="tombol-lanjut-s15" class="tombol tombol--nonaktif" disabled>
          ${escapeHtml(teksLanjut)}
        </button>
        <button type="button" id="tombol-lewati-s15" class="tombol tombol--sekunder">
          ${escapeHtml(teksLewati)}
        </button>
      </div>
    </section>
  `;

  const inputTeman = document.getElementById('penggeser-teman-s15');
  const labelTeman = document.getElementById('nilai-teman-s15');
  const inputGuru = document.getElementById('penggeser-guru-s15');
  const labelGuru = document.getElementById('nilai-guru-s15');
  const btnLanjut = document.getElementById('tombol-lanjut-s15');
  const btnLewati = document.getElementById('tombol-lewati-s15');

  function perbaruiTombol() {
    const siap = nilaiTeman !== null && nilaiGuru !== null;
    if (!btnLanjut) return;
    btnLanjut.disabled = !siap;
    btnLanjut.classList.toggle('tombol--utama', siap);
    btnLanjut.classList.toggle('tombol--nonaktif', !siap);
  }

  function hubungkanPenggeser(inputEl, labelEl, saatUbah) {
    if (!inputEl) return;
    const tanganiSentuh = () => {
      const angka = Number(inputEl.value);
      saatUbah(angka);
      if (labelEl) labelEl.textContent = String(angka);
      perbaruiTombol();
    };
    inputEl.addEventListener('input', tanganiSentuh);
    inputEl.addEventListener('change', tanganiSentuh);
    inputEl.addEventListener('pointerdown', tanganiSentuh);
  }

  hubungkanPenggeser(inputTeman, labelTeman, (v) => { nilaiTeman = v; });
  hubungkanPenggeser(inputGuru, labelGuru, (v) => { nilaiGuru = v; });

  async function kirimDanLanjut(dilewatiSemua = false) {
    if (btnLanjut) btnLanjut.disabled = true;
    if (btnLewati) btnLewati.disabled = true;

    const peristiwa = [
      {
        jenis: 'kejadian',
        isi: {
          tahap: fase,
          aspek: 'keberanian_teman',
          butir: 'KB-01',
          nilai: (!dilewatiSemua && nilaiTeman !== null) ? nilaiTeman : '',
          flag: (!dilewatiSemua && nilaiTeman !== null) ? '' : 'lewati'
        }
      },
      {
        jenis: 'kejadian',
        isi: {
          tahap: fase,
          aspek: 'keberanian_guru',
          butir: 'KB-02',
          nilai: (!dilewatiSemua && nilaiGuru !== null) ? nilaiGuru : '',
          flag: (!dilewatiSemua && nilaiGuru !== null) ? '' : 'lewati'
        }
      }
    ];

    await kirimAtauAntre('catat', { peristiwa }, `Skala keberanian (${fase})`);
    await simpanKemajuanTahap0('S-16', fase);
    arahKe('S-16', { fase });
  }

  if (btnLanjut) {
    btnLanjut.addEventListener('click', () => {
      if (nilaiTeman === null || nilaiGuru === null) return;
      btnLanjut.textContent = 'Menyimpan…';
      kirimDanLanjut(false);
    });
  }

  if (btnLewati) {
    btnLewati.addEventListener('click', () => {
      kirimDanLanjut(true);
    });
  }
}
