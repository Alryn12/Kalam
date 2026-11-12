/**
 * Layar S-14: Kenyamananku (situs/js/layar/s14-kenyamananku.js)
 * Tugas M1-D: TB-M1-05
 * Acuan: SRS-3 FR-008; IN-1 §3.3 (K-02, K-03, K-04, K-05 dibalik, K-07 searah); BP-1 S-14; BP-6 S-14
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

const DAFTAR_BUTIR_KENYAMANAN = [
  { id: 'K-02', kunciTeks: 'butir_2' },
  { id: 'K-03', kunciTeks: 'butir_3' },
  { id: 'K-04', kunciTeks: 'butir_4' },
  { id: 'K-05', kunciTeks: 'butir_5' },
  { id: 'K-07', kunciTeks: 'butir_7' }
];

export async function renderS14({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = ambilTeks('S-14', 'judul') || 'Kenyamananku';
  const wadah = siapkanWadahLayar('S-14', judul);
  if (!wadah) return;

  const instruksi = ambilTeks('S-14', 'instruksi');
  const labelSkala = ambilTeks('S-14', 'label_skala');
  const teksLewati = ambilTeks('S-14', 'tombol');

  let indeks = 0;
  const hasilPeristiwa = [];
  let sedangTransisi = false;

  async function kirimDanLanjut() {
    wadah.innerHTML = `
      <section class="kartu">
        <h1 class="judul-layar">${escapeHtml(judul)}</h1>
        <p class="teks-instruksi">Menyimpan jawabanmu…</p>
      </section>
    `;

    await kirimAtauAntre('catat', { peristiwa: hasilPeristiwa }, `Kuesioner Kenyamananku (${fase})`);
    await simpanKemajuanTahap0('S-15', fase);
    arahKe('S-15', { fase });
  }

  function renderButir() {
    const butir = DAFTAR_BUTIR_KENYAMANAN[indeks];
    if (!butir) {
      kirimDanLanjut();
      return;
    }

    const teksPernyataan = ambilTeks('S-14', butir.kunciTeks);
    const tombolSkalaHtml = [1, 2, 3, 4, 5].map((angka) => `
      <button
        type="button"
        class="tombol-skala tombol-skala-s14"
        data-nilai="${angka}"
        aria-label="Nilai ${angka}"
      >
        ${angka}
      </button>
    `).join('');

    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="judul-s14">
        <div class="daftar-status">
          <span class="penanda-status penanda-status--menunggu">
            <span>Pernyataan ${indeks + 1} dari ${DAFTAR_BUTIR_KENYAMANAN.length}</span>
          </span>
        </div>

        <h1 id="judul-s14" class="judul-layar">${escapeHtml(judul)}</h1>
        <p class="teks-keterangan">${escapeHtml(instruksi)}</p>

        <div class="pesan-hangat">
          <p class="pesan-hangat__isi" style="font-size: var(--ukuran-teks-subjudul); font-weight: 600;">
            ${escapeHtml(teksPernyataan)}
          </p>
        </div>

        <div class="kelompok-skala">
          <div class="baris-skala-5" role="group" aria-label="Skala 1 sampai 5">
            ${tombolSkalaHtml}
          </div>
          <div class="keterangan-skala">
            <span>1 Sangat tidak setuju</span>
            <span>5 Sangat setuju</span>
          </div>
          <p class="daftar-label-skala">${escapeHtml(labelSkala)}</p>
        </div>

        <button type="button" id="tombol-lewati-s14" class="tombol tombol--sekunder">
          ${escapeHtml(teksLewati)}
        </button>
      </section>
    `;

    const tombolAngka = Array.from(wadah.querySelectorAll('.tombol-skala-s14'));
    const btnLewati = document.getElementById('tombol-lewati-s14');

    function catatButir(nilaiMentah, flag = '') {
      if (sedangTransisi) return;
      sedangTransisi = true;

      // Server (Catat.gs) membalik nilai G = 6 - H otomatis untuk K-02..K-05 dan menyimpan mentah di kolom H
      hasilPeristiwa.push({
        jenis: 'kejadian',
        isi: {
          tahap: fase,
          aspek: 'kenyamanan_butir',
          butir: butir.id,
          nilai: nilaiMentah === '' ? '' : Number(nilaiMentah),
          nilai_mentah: nilaiMentah === '' ? '' : Number(nilaiMentah),
          flag
        }
      });

      tombolAngka.forEach((b) => {
        b.disabled = true;
        if (String(nilaiMentah) === b.getAttribute('data-nilai')) {
          b.classList.add('tombol-skala--terpilih');
          b.setAttribute('aria-pressed', 'true');
        }
      });
      if (btnLewati) btnLewati.disabled = true;

      setTimeout(() => {
        sedangTransisi = false;
        indeks += 1;
        if (indeks >= DAFTAR_BUTIR_KENYAMANAN.length) {
          kirimDanLanjut();
        } else {
          renderButir();
        }
      }, 220);
    }

    tombolAngka.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nilai = Number(btn.getAttribute('data-nilai'));
        catatButir(nilai, '');
      });
    });

    if (btnLewati) {
      btnLewati.addEventListener('click', () => {
        catatButir('', 'lewati');
      });
    }
  }

  renderButir();
}
