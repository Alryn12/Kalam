/**
 * Layar S-40: Sesi 3 · Pengantar & Daftar Rangkaian Tetap (situs/js/layar/s40-sesi3-pengantar.js)
 * Tugas M2-A: TB-M2-01
 * Acuan: SRS-3 FR-027; BP-1 S-40; BP-4 R-06, R-30, R-31; BP-5 K-36, K-45, K-47; BP-6 S-40
 */

import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  hitungRingkasanSesi3,
  kirimSesi3MulaiDenganCadangan,
  siapkanKonteksSesi3,
  simpanKemajuanSesi3,
  susunRangkaianFinalSesi3
} from './sesi3-bantu.js';

export async function renderS40({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi3('S-40', param);
  if (!konteks) return;

  const {
    kodeSiswa,
    unitId,
    noUnit,
    unitInfo,
    muhimmah,
    petaKartuL3,
    kemajuanS3,
    wadah
  } = konteks;

  const punyaKartuKembarTeman = (kemajuanS3.rangkaian || []).some((r) => r.pilih_satu === 'teman');
  let sedangMemulai = false;
  let pesanGalat = '';

  function lukis() {
    const judul = ambilTeks('S-40', 'judul') || 'Sesi 3 · Ulang dan berani';
    const penjelasan = ambilTeks('S-40', 'penjelasan') ||
      'Kamu akan mengulang kartu yang sama tiga kali. Tiap putaran bantuannya makin sedikit.';
    const judulDaftar = ambilTeks('S-40', 'daftar') || 'Kartu yang akan kamu ucapkan';
    const tombolMulai = ambilTeks('S-40', 'tombol') || 'Mulai Putaran 1';
    const lblKembali = ambilTeks('S-40', 'tombol_kembali_unit') || 'Kembali ke Isi Unit';
    const lblJudulPutaran = ambilTeks('S-40', 'judul_putaran') || 'Tiga putaran berurutan';
    const ketP1 = ambilTeks('S-40', 'ket_putaran_1') || 'Putaran 1: teks Arab dan petunjuk tampil penuh.';
    const ketP2 = ambilTeks('S-40', 'ket_putaran_2') || 'Putaran 2: petunjuk tersembunyi, bisa dibuka saat perlu.';
    const ketP3 = ambilTeks('S-40', 'ket_putaran_3') || 'Putaran 3: penghitung maju santai, tanpa batas waktu.';
    const lblPilihTeman = ambilTeks('S-40', 'pilih_ikon_teman') ||
      ambilTeks('S-33', 'pilih_ikon_teman') ||
      'Pilih temanmu';
    const lblTemanPa = ambilTeks('S-40', 'label_teman_putra') || 'Teman laki-laki';
    const lblTemanPi = ambilTeks('S-40', 'label_teman_putri') || 'Teman perempuan';
    const lblMenyiapkan = ambilTeks('S-40', 'label_mengirim') || 'Menyiapkan…';

    const rangkaianTampil = susunRangkaianFinalSesi3(muhimmah, petaKartuL3, kemajuanS3.ikonTeman);
    kemajuanS3.rangkaian = rangkaianTampil;

    const lanjutTertunda = Boolean(kemajuanS3.sedangBerjalan && rangkaianTampil.length > 0);
    const indeksLanjut = Math.min(Math.max(0, Number(kemajuanS3.indeksKartuAktif || 0)), Math.max(0, rangkaianTampil.length - 1));
    const putaranLanjut = [1, 2, 3].includes(Number(kemajuanS3.putaranAktif)) ? Number(kemajuanS3.putaranAktif) : 1;
    const pesanLanjut = ambilTeks('S-40', 'pesan_lanjut_putaran', {
      n: putaranLanjut,
      k: indeksLanjut + 1,
      total: rangkaianTampil.length
    }) || `Kamu sedang berada di Putaran ${putaranLanjut}, Kartu ${indeksLanjut + 1} dari ${rangkaianTampil.length}.`;
    const tombolLanjutPutaran = ambilTeks('S-40', 'tombol_lanjut_putaran', { n: putaranLanjut }) ||
      `Lanjutkan Putaran ${putaranLanjut}`;
    const tombolUlangAwal = ambilTeks('S-40', 'tombol_ulang_dari_awal') || 'Mulai lagi dari Putaran 1';

    const daftarKartuHtml = rangkaianTampil.map((item, idx) => `
      <li class="butir-aku-bisa" data-id-kartu="${escapeHtml(item.id_kartu)}">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--jarak-2); flex-wrap: wrap;">
          <span class="kartu-unit__nomor">Kartu ${idx + 1}</span>
          <span class="kartu-arab__label">${escapeHtml(item.id_kartu)}</span>
        </div>
        <p class="teks-instruksi" style="margin: 0; font-weight: 600;">${escapeHtml(item.kartu)}</p>
      </li>
    `).join('');

    const pemilihTemanHtml = punyaKartuKembarTeman ? `
      <div class="panel-pilihan-sesi" role="group" aria-label="${escapeHtml(lblPilihTeman)}">
        <p class="teks-keterangan" style="margin: 0; font-weight: 600;">${escapeHtml(lblPilihTeman)}</p>
        <div class="baris-pilihan-kecil">
          <button
            type="button"
            id="s40-ikon-putra"
            class="tombol tombol--sekunder ${kemajuanS3.ikonTeman === 'putra' ? 'tombol--terpilih' : ''}"
            data-ikon-teman="putra"
            aria-pressed="${kemajuanS3.ikonTeman === 'putra'}"
          >
            ${escapeHtml(lblTemanPa)}
          </button>
          <button
            type="button"
            id="s40-ikon-putri"
            class="tombol tombol--sekunder ${kemajuanS3.ikonTeman === 'putri' ? 'tombol--terpilih' : ''}"
            data-ikon-teman="putri"
            aria-pressed="${kemajuanS3.ikonTeman === 'putri'}"
          >
            ${escapeHtml(lblTemanPi)}
          </button>
        </div>
      </div>
    ` : '';

    wadah.innerHTML = `
      <section class="wadah-layar" aria-labelledby="judul-s40">
        <section class="kartu">
          <div class="daftar-status" style="justify-content: space-between; align-items: center;">
            <button type="button" id="s40-tombol-kembali" class="tautan-aksi" style="width: auto; padding-inline: 0; background: transparent; border: none; cursor: pointer;">
              &larr; ${escapeHtml(lblKembali)}
            </button>
            <span class="kartu-arab__label">Unit ${noUnit}</span>
          </div>

          <h1 id="judul-s40" class="judul-layar" style="margin-bottom: 0;">${escapeHtml(judul)}</h1>
          ${unitInfo && unitInfo.judul_ar ? `<p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${unitInfo.judul_ar}</p>` : ''}
          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(penjelasan)}</p>

          <div class="pesan-hangat">
            <p class="pesan-hangat__judul">${escapeHtml(lblJudulPutaran)}</p>
            <p class="pesan-hangat__isi">1. ${escapeHtml(ketP1)}</p>
            <p class="pesan-hangat__isi">2. ${escapeHtml(ketP2)}</p>
            <p class="pesan-hangat__isi">3. ${escapeHtml(ketP3)}</p>
          </div>
        </section>

        ${lanjutTertunda ? `
          <section class="kartu" aria-label="Lanjutkan Sesi 3">
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi" style="font-weight: 600;">${escapeHtml(pesanLanjut)}</p>
            </div>
            <button type="button" id="s40-tombol-lanjutkan" class="tombol tombol--utama">
              ${escapeHtml(tombolLanjutPutaran)}
            </button>
          </section>
        ` : ''}

        <section class="kartu" aria-labelledby="judul-daftar-s40">
          <h2 id="judul-daftar-s40" class="subjudul-layar" style="margin: 0;">${escapeHtml(judulDaftar)}</h2>
          ${pemilihTemanHtml}
          <ol id="s40-daftar-rangkaian" class="daftar-aku-bisa">
            ${daftarKartuHtml}
          </ol>

          ${pesanGalat ? `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi">${escapeHtml(pesanGalat)}</p>
            </div>
          ` : ''}

          <button
            type="button"
            id="s40-tombol-mulai"
            class="tombol ${lanjutTertunda ? 'tombol--sekunder' : 'tombol--utama'}"
            ${sedangMemulai ? 'disabled' : ''}
          >
            ${escapeHtml(sedangMemulai ? lblMenyiapkan : (lanjutTertunda ? tombolUlangAwal : tombolMulai))}
          </button>
        </section>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    const btnKembali = wadah.querySelector('#s40-tombol-kembali');
    if (btnKembali) {
      btnKembali.addEventListener('click', () => arahKe('S-03', { unit: unitId }));
    }

    wadah.querySelectorAll('[data-ikon-teman]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ikonBaru = btn.getAttribute('data-ikon-teman') === 'putri' ? 'putri' : 'putra';
        if (kemajuanS3.ikonTeman === ikonBaru) return;
        kemajuanS3.ikonTeman = ikonBaru;
        kemajuanS3.rangkaian = susunRangkaianFinalSesi3(muhimmah, petaKartuL3, ikonBaru);
        await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
        if (konteks.masihAktif()) lukis();
      });
    });

    const btnLanjutkan = wadah.querySelector('#s40-tombol-lanjutkan');
    if (btnLanjutkan) {
      btnLanjutkan.addEventListener('click', () => {
        const putaran = [1, 2, 3].includes(Number(kemajuanS3.putaranAktif)) ? Number(kemajuanS3.putaranAktif) : 1;
        const indeks = Math.max(0, Number(kemajuanS3.indeksKartuAktif || 0));
        arahKe('S-33', {
          unit: unitId,
          konteks: `p${putaran}`,
          item: String(indeks)
        });
      });
    }

    const btnMulai = wadah.querySelector('#s40-tombol-mulai');
    if (btnMulai) {
      btnMulai.addEventListener('click', async () => {
        if (sedangMemulai) return;
        sedangMemulai = true;
        pesanGalat = '';
        lukis();

        const susunanPilihan = susunRangkaianFinalSesi3(muhimmah, petaKartuL3, kemajuanS3.ikonTeman);
        const kartuKembar = susunanPilihan
          .filter((r) => r.pilih_satu)
          .map((r) => ({
            pilih_satu: r.pilih_satu,
            ikon: kemajuanS3.ikonTeman,
            id_kartu: r.id_kartu
          }));

        const res = await kirimSesi3MulaiDenganCadangan({
          unitId,
          pilihanKartuKembar: kartuKembar
        });

        if (!konteks.masihAktif()) return;
        if (!res || !res.ok) {
          sedangMemulai = false;
          pesanGalat = (res && res.pesan) || 'Sesi 3 belum dapat dimulai sekarang.';
          lukis();
          return;
        }

        const rangkaianFinal = susunRangkaianFinalSesi3(
          muhimmah,
          petaKartuL3,
          kemajuanS3.ikonTeman,
          res.rangkaian_dipakai
        );

        kemajuanS3.sedangBerjalan = true;
        kemajuanS3.s12Sesi3Sudah = false;
        kemajuanS3.rangkaian = rangkaianFinal;
        kemajuanS3.putaranAktif = 1;
        kemajuanS3.indeksKartuAktif = 0;
        kemajuanS3.catatanPutaran = { 1: {}, 2: {}, 3: {} };
        kemajuanS3.ringkasanTerakhir = hitungRingkasanSesi3(kemajuanS3);

        await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
        if (!konteks.masihAktif()) return;

        arahKe('S-12', {
          konteks: 'sesi3',
          unit: unitId
        });
      });
    }
  }

  lukis();
}
