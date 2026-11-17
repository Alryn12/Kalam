/**
 * Layar S-42: Kesiapan dan Ketegangan Sebelum Bertemu Guru (situs/js/layar/s42-kesiapan.js)
 * Tugas M2-A: TB-M2-01
 * Acuan: SRS-3 FR-029; BP-1 S-42; BP-4 R-39; BP-6 S-42; IN-5 §7.3 & §9
 */

import { arahKe } from '../router.js';
import { ambilState, ambilTeks, buatIdIdempoten } from '../state.js';
import { escapeHtml, kirimAtauAntre } from './tahap0-bantu.js';
import { siapkanKonteksSesi3, simpanKemajuanSesi3 } from './sesi3-bantu.js';

export async function renderS42({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi3('S-42', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, noUnit, kemajuanS3, wadah } = konteks;
  const st = ambilState().status_server || {};
  const modeDuaU6 = noUnit === 6 && Number(st.konfig_publik && st.konfig_publik.mode_dua_setoran_unit6 || 0) === 1;
  const setoranSudah = Number((st.setoran_ke && st.setoran_ke[unitId]) || 0);
  const keSetoran = modeDuaU6
    ? Math.min(2, Math.max(1, Number((param && param.setoran) || (setoranSudah >= 1 ? 2 : 1))))
    : 1;

  let nilaiSiap = null;
  let nilaiTegang = null;
  let pesanPilih = '';
  let sedangSimpan = false;

  function lukis() {
    const judul = ambilTeks('S-42', 'judul') || 'Sebelum bertemu gurumu';
    const petunjuk = ambilTeks('S-42', 'petunjuk') || 'Pilih angka 1 sampai 5, atau ketuk Lewati.';
    const tanya1 = ambilTeks('S-42', 'pertanyaan_1') || 'Seberapa siap kamu bertemu gurumu?';
    const labelSkala1 = ambilTeks('S-42', 'label_skala_1') || '1 Belum siap · 5 Sangat siap';
    const tanya2 = ambilTeks('S-42', 'pertanyaan_2') || 'Seberapa tegang kamu sekarang?';
    const labelSkala2 = ambilTeks('S-42', 'label_skala_2') || '1 Santai · 5 Sangat tegang';
    const lblLanjut = ambilTeks('S-42', 'tombol_lanjut') || 'Lanjut';
    const lblLewati = ambilTeks('S-42', 'tombol_lewati') || 'Lewati';
    const penandaDua = modeDuaU6
      ? (ambilTeks('S-42', 'penanda_dua_setoran', { n: keSetoran }) || `Setoran ${keSetoran} dari 2`)
      : '';

    const skala1Html = [1, 2, 3, 4, 5].map((n) => `
      <button
        type="button"
        class="tombol-skala ${nilaiSiap === n ? 'tombol-skala--terpilih' : ''}"
        data-skala-siap="${n}"
        aria-pressed="${nilaiSiap === n}"
      >
        ${n}
      </button>
    `).join('');

    const skala2Html = [1, 2, 3, 4, 5].map((n) => `
      <button
        type="button"
        class="tombol-skala ${nilaiTegang === n ? 'tombol-skala--terpilih' : ''}"
        data-skala-tegang="${n}"
        aria-pressed="${nilaiTegang === n}"
      >
        ${n}
      </button>
    `).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-labelledby="judul-s42">
        <section class="kartu">
          <div class="daftar-status" style="justify-content: space-between; align-items: center;">
            <span class="kartu-unit__nomor">Unit ${noUnit}</span>
            ${penandaDua ? `<span class="kartu-arab__label">${escapeHtml(penandaDua)}</span>` : ''}
          </div>
          <h1 id="judul-s42" class="judul-layar" style="margin-bottom: 0;">${escapeHtml(judul)}</h1>
          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(petunjuk)}</p>
        </section>

        <section class="kartu" aria-labelledby="tanya-siap-s42">
          <h2 id="tanya-siap-s42" class="subjudul-layar" style="margin: 0;">${escapeHtml(tanya1)}</h2>
          <div class="kelompok-skala">
            <div class="baris-skala-5" role="group" aria-label="${escapeHtml(tanya1)}">
              ${skala1Html}
            </div>
            <p class="daftar-label-skala">${escapeHtml(labelSkala1)}</p>
          </div>
        </section>

        <section class="kartu" aria-labelledby="tanya-tegang-s42">
          <h2 id="tanya-tegang-s42" class="subjudul-layar" style="margin: 0;">${escapeHtml(tanya2)}</h2>
          <div class="kelompok-skala">
            <div class="baris-skala-5" role="group" aria-label="${escapeHtml(tanya2)}">
              ${skala2Html}
            </div>
            <p class="daftar-label-skala">${escapeHtml(labelSkala2)}</p>
          </div>
        </section>

        <section class="kartu">
          ${pesanPilih ? `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi">${escapeHtml(pesanPilih)}</p>
            </div>
          ` : ''}

          <div class="baris-tombol">
            <button type="button" id="s42-tombol-lanjut" class="tombol tombol--utama" ${sedangSimpan ? 'disabled' : ''}>
              ${escapeHtml(lblLanjut)}
            </button>
            <button type="button" id="s42-tombol-lewati" class="tombol tombol--sekunder" ${sedangSimpan ? 'disabled' : ''}>
              ${escapeHtml(lblLewati)}
            </button>
          </div>
        </section>
      </section>
    `;

    pasangEvent();
  }

  async function kirimDanLanjut(dilewati) {
    if (sedangSimpan) return;
    sedangSimpan = true;
    pesanPilih = '';
    lukis();

    const siapFinal = !dilewati && nilaiSiap !== null ? nilaiSiap : '';
    const tegangFinal = !dilewati && nilaiTegang !== null ? nilaiTegang : '';

    const peristiwa = [
      {
        id_idempoten: buatIdIdempoten(kodeSiswa),
        jenis: 'kejadian',
        isi: {
          tahap: 'UNIT',
          unit: noUnit,
          aspek: 'kesiapan',
          butir: 'UT-01',
          nilai: siapFinal,
          flag: siapFinal === '' ? 'lewati' : ''
        }
      },
      {
        id_idempoten: buatIdIdempoten(kodeSiswa),
        jenis: 'kejadian',
        isi: {
          tahap: 'UNIT',
          unit: noUnit,
          aspek: 'ketegangan',
          butir: 'UT-02',
          nilai: tegangFinal,
          flag: tegangFinal === '' ? 'lewati' : ''
        }
      }
    ];

    if (modeDuaU6) {
      peristiwa.push({
        id_idempoten: buatIdIdempoten(kodeSiswa),
        jenis: 'kejadian',
        isi: {
          tahap: 'UNIT',
          unit: noUnit,
          aspek: 'setoran_ke',
          butir: 'UT-01',
          nilai: keSetoran
        }
      });
    }

    await kirimAtauAntre('catat', { peristiwa }, `Kesiapan Unit ${noUnit}`);

    kemajuanS3.kesiapan = siapFinal;
    kemajuanS3.ketegangan_sebelum = tegangFinal;
    kemajuanS3.ke_setoran = keSetoran;
    await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);

    if (konteks.masihAktif()) {
      arahKe('S-43', {
        unit: unitId,
        ...(modeDuaU6 ? { setoran: String(keSetoran) } : {})
      });
    }
  }

  function pasangEvent() {
    wadah.querySelectorAll('[data-skala-siap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nilaiSiap = Number(btn.getAttribute('data-skala-siap'));
        pesanPilih = '';
        lukis();
      });
    });

    wadah.querySelectorAll('[data-skala-tegang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nilaiTegang = Number(btn.getAttribute('data-skala-tegang'));
        pesanPilih = '';
        lukis();
      });
    });

    const btnLanjut = wadah.querySelector('#s42-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        if (nilaiSiap === null && nilaiTegang === null) {
          pesanPilih = ambilTeks('S-42', 'pesan_pilih_dulu') ||
            'Pilih minimal satu angka terlebih dahulu atau ketuk Lewati.';
          lukis();
          return;
        }
        kirimDanLanjut(false);
      });
    }

    const btnLewati = wadah.querySelector('#s42-tombol-lewati');
    if (btnLewati) {
      btnLewati.addEventListener('click', () => kirimDanLanjut(true));
    }
  }

  lukis();
}
