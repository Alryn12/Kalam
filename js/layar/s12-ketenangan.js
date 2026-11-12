/**
 * Layar S-12: Cek Ketenangan Tempat (situs/js/layar/s12-ketenangan.js)
 * Tugas M1-C: TB-M1-04
 * Acuan: SRS-3 FR-006; BP-1 S-12; BP-5 K-20; BP-6 S-12; KEPUTUSAN.md SL-BARU-08
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

function tentukanTujuanBerikut(konteks, param = {}, fase = 'T0') {
  if (konteks === 'sebelum_suara') {
    return { layar: 'S-17', param: { fase } };
  }
  if (konteks === 'sesi1') {
    return { layar: 'S-23', param: { unit: param.unit || '', blok: param.blok || '' } };
  }
  if (konteks === 'sesi2') {
    return { layar: 'S-31', param: { unit: param.unit || '', blok: param.blok || '' } };
  }
  if (konteks === 'sesi3') {
    return { layar: 'S-33', param: { unit: param.unit || '', konteks: 'p1' } };
  }
  return { layar: 'S-13', param: { fase } };
}

export async function renderS12({ param = {} } = {}) {
  const fase = ambilFase(param);
  const konteks = String(param.konteks || 'cek_perangkat').trim();
  const tahapKejadian = ['sesi1', 'sesi2', 'sesi3'].includes(konteks) ? 'UNIT' : fase;

  const judul = ambilTeks('S-12', 'judul') || 'Ketenangan tempat';
  const wadah = siapkanWadahLayar('S-12', judul);
  if (!wadah) return;

  const pertanyaan = ambilTeks('S-12', 'pertanyaan');
  const pilihan1 = ambilTeks('S-12', 'pilihan_1');
  const pilihan2 = ambilTeks('S-12', 'pilihan_2');
  const pilihan3 = ambilTeks('S-12', 'pilihan_3');
  const saranRamai = ambilTeks('S-12', 'saran_bila_ramai');
  const teksLewati = ambilTeks('S-12', 'tombol_lewati');

  const tujuan = tentukanTujuanBerikut(konteks, param, fase);
  let sudahTerkirim = false;

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s12">
      <h1 id="judul-s12" class="judul-layar">${escapeHtml(judul)}</h1>
      <p class="teks-instruksi">${escapeHtml(pertanyaan)}</p>

      <div class="baris-tombol" role="group" aria-label="${escapeHtml(pertanyaan)}">
        <button type="button" class="tombol tombol--sekunder pilihan-tenang-s12" data-nilai="1">
          ${escapeHtml(pilihan1)}
        </button>
        <button type="button" class="tombol tombol--sekunder pilihan-tenang-s12" data-nilai="2">
          ${escapeHtml(pilihan2)}
        </button>
        <button type="button" class="tombol tombol--sekunder pilihan-tenang-s12" data-nilai="3">
          ${escapeHtml(pilihan3)}
        </button>
      </div>

      <div id="wadah-saran-s12" class="pesan-hangat" role="status" hidden>
        <p class="pesan-hangat__isi">${escapeHtml(saranRamai)}</p>
        <button type="button" id="tombol-lanjut-s12" class="tombol tombol--utama" style="margin-top: var(--jarak-2);">
          Lanjut
        </button>
      </div>

      <button type="button" id="tombol-lewati-s12" class="tombol tombol--sekunder">
        ${escapeHtml(teksLewati)}
      </button>
    </section>
  `;

  const tombolPilihan = Array.from(wadah.querySelectorAll('.pilihan-tenang-s12'));
  const wadahSaran = document.getElementById('wadah-saran-s12');
  const btnLanjut = document.getElementById('tombol-lanjut-s12');
  const btnLewati = document.getElementById('tombol-lewati-s12');

  async function catatDanArahkan(nilai, flag = '') {
    if (!sudahTerkirim) {
      sudahTerkirim = true;
      const isi = {
        tahap: tahapKejadian,
        aspek: 'ketenangan',
        butir: 'P-05',
        nilai: nilai === '' ? '' : Number(nilai),
        flag,
        catatan: konteks
      };
      if (tahapKejadian === 'UNIT' && param.unit) {
        isi.unit = Number(String(param.unit).replace(/^U/i, ''));
      }
      await kirimAtauAntre('catat', isi, `Ketenangan tempat (${konteks})`);
      if (tahapKejadian !== 'UNIT') {
        await simpanKemajuanTahap0(tujuan.layar, fase, tujuan.param);
      }
    }
    arahKe(tujuan.layar, tujuan.param);
  }

  tombolPilihan.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nilai = Number(btn.getAttribute('data-nilai'));
      tombolPilihan.forEach((b) => {
        b.classList.toggle('tombol--terpilih', b === btn);
      });

      if (nilai === 1) {
        btn.disabled = true;
        await catatDanArahkan(1, '');
        return;
      }

      // Agak ramai (2) atau Ramai (3): tampilkan saran lembut, tetap tidak memblokir (K-20)
      if (!sudahTerkirim) {
        sudahTerkirim = true;
        const isi = {
          tahap: tahapKejadian,
          aspek: 'ketenangan',
          butir: 'P-05',
          nilai,
          flag: '',
          catatan: konteks
        };
        if (tahapKejadian === 'UNIT' && param.unit) {
          isi.unit = Number(String(param.unit).replace(/^U/i, ''));
        }
        await kirimAtauAntre('catat', isi, `Ketenangan tempat (${konteks})`);
        if (tahapKejadian !== 'UNIT') {
          await simpanKemajuanTahap0(tujuan.layar, fase, tujuan.param);
        }
      }
      if (wadahSaran) wadahSaran.hidden = false;
    });
  });

  if (btnLanjut) {
    btnLanjut.addEventListener('click', () => {
      arahKe(tujuan.layar, tujuan.param);
    });
  }

  if (btnLewati) {
    btnLewati.addEventListener('click', async () => {
      btnLewati.disabled = true;
      await catatDanArahkan('', 'lewati');
    });
  }
}
