/**
 * Layar S-35: Penutup Level (situs/js/layar/s35-penutup-level.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: SRS-3 FR-024; BP-1 S-35; BP-4 R-04, R-12..R-15; BP-5 K-40, K-41; BP-6 S-35; KEPUTUSAN.md SL-BARU-03
 */

import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  hitungKemajuanLevel,
  kirimLevelAksiDenganCadangan,
  pasangNavigasiSesi2,
  renderKepalaSesi2,
  siapkanKonteksSesi2,
  simpanKemajuanSesi2
} from './sesi2-bantu.js';

function layarUntukLevel(level) {
  if (level === 2) return 'S-32';
  if (level === 3) return 'S-33';
  return 'S-31';
}

export async function renderS35({ param = {} } = {}) {
  const level = Math.min(3, Math.max(1, Number((param && param.level) || 1)));
  const konteks = await siapkanKonteksSesi2('S-35', param, { minLevel: level });
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarItem = level === 1
    ? (blokData.l1 || [])
    : (level === 2 ? (blokData.l2 || []) : (blokData.l3 || []));
  const levelState = kemajuan.level[level];
  const { dikerjakan, total } = hitungKemajuanLevel(daftarItem, levelState);
  const semuaDicoba = dikerjakan >= total;

  let sedangKirim = false;
  let pesanPeringatan = '';

  function lukis() {
    const namaLevel = `Level ${level}`;
    const pesanUtama = semuaDicoba
      ? (ambilTeks('S-35', 'pesan') || 'Kamu sudah mencoba semua latihan di level ini.')
      : (ambilTeks('S-35', 'pesan_belum_lengkap', { dikerjakan, total }) ||
        `Masih ada latihan yang belum dicoba (${dikerjakan} dari ${total}). Yuk coba semua latihan dulu satu kali.`);
    const ringkasanTeks = ambilTeks('S-35', 'ringkasan', {
      dikerjakan,
      total,
      nama_level: namaLevel
    }) || `Kamu sudah mencoba ${dikerjakan} dari ${total} latihan di ${namaLevel}.`;

    const lblAkuSiap = ambilTeks('S-35', 'tombol_aku_siap') || 'Aku siap, naik level';
    const lblNonaktif = ambilTeks('S-35', 'tombol_nonaktif') || 'Coba semua latihan dulu satu kali';
    const lblUlangi = ambilTeks('S-35', 'tombol_ulangi') || 'Ulangi level';
    const lblTurun = level === 1
      ? (ambilTeks('S-35', 'tombol_ke_pemanasan') || 'Kembali ke Pemanasan')
      : (ambilTeks('S-35', 'tombol_turun') || 'Turun satu level');
    const lblLanjutSisa = ambilTeks('S-35', 'tombol_lanjut_latihan') || 'Lanjutkan latihan yang tersisa';

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-35', { levelAktif: level, tanpaPemilihBentuk: true })}

        <section class="kartu" aria-label="Ringkasan level">
          <div class="pesan-hangat ${semuaDicoba ? '' : 'pesan-hangat--aksen'}" role="status">
            <p class="pesan-hangat__judul">${escapeHtml(ringkasanTeks)}</p>
            <p class="pesan-hangat__isi">${escapeHtml(pesanUtama)}</p>
          </div>

          ${!semuaDicoba ? `
            <p class="teks-keterangan" style="margin: 0;">${escapeHtml(lblNonaktif)}</p>
          ` : ''}

          ${pesanPeringatan ? `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi">${escapeHtml(pesanPeringatan)}</p>
            </div>
          ` : ''}

          <div class="baris-tombol">
            <button
              type="button"
              id="s35-tombol-aku-siap"
              class="tombol ${semuaDicoba ? 'tombol--utama' : 'tombol--nonaktif'}"
              ${semuaDicoba && !sedangKirim ? '' : 'disabled aria-disabled="true"'}
            >
              ${escapeHtml(lblAkuSiap)}
            </button>

            ${!semuaDicoba ? `
              <button type="button" id="s35-tombol-lanjut-sisa" class="tombol tombol--utama" ${sedangKirim ? 'disabled' : ''}>
                ${escapeHtml(lblLanjutSisa)}
              </button>
            ` : ''}

            <button type="button" id="s35-tombol-ulangi" class="tombol tombol--sekunder" ${sedangKirim ? 'disabled' : ''}>
              ${escapeHtml(lblUlangi)}
            </button>

            <button type="button" id="s35-tombol-turun" class="tombol tombol--sekunder" ${sedangKirim ? 'disabled' : ''}>
              ${escapeHtml(lblTurun)}
            </button>
          </div>
        </section>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi2(konteks);

    const btnAkuSiap = wadah.querySelector('#s35-tombol-aku-siap');
    if (btnAkuSiap) {
      btnAkuSiap.addEventListener('click', async () => {
        if (!semuaDicoba || sedangKirim) return;
        sedangKirim = true;
        pesanPeringatan = '';
        lukis();

        const res = await kirimLevelAksiDenganCadangan({
          unitId,
          blokId,
          level,
          aksi: 'aku_siap',
          itemDikerjakan: dikerjakan,
          itemTotal: total
        });

        if (!konteks.masihAktif()) return;
        if (!res || !res.ok) {
          sedangKirim = false;
          pesanPeringatan = (res && res.pesan) || lblNonaktifSaatGalat(res);
          lukis();
          return;
        }

        if (level === 1) {
          arahKe('S-32', { unit: unitId, blok: blokId });
        } else if (level === 2) {
          arahKe('S-33', { unit: unitId, blok: blokId, konteks: 'sesi2' });
        } else {
          arahKe('S-36', { unit: unitId, blok: blokId });
        }
      });
    }

    const btnLanjutSisa = wadah.querySelector('#s35-tombol-lanjut-sisa');
    if (btnLanjutSisa) {
      btnLanjutSisa.addEventListener('click', () => {
        const layar = layarUntukLevel(level);
        arahKe(layar, {
          unit: unitId,
          blok: blokId,
          ...(level === 3 ? { konteks: 'sesi2' } : {})
        });
      });
    }

    const btnUlangi = wadah.querySelector('#s35-tombol-ulangi');
    if (btnUlangi) {
      btnUlangi.addEventListener('click', async () => {
        if (sedangKirim) return;
        sedangKirim = true;
        lukis();

        await kirimLevelAksiDenganCadangan({
          unitId,
          blokId,
          level,
          aksi: 'ulang',
          itemDikerjakan: dikerjakan,
          itemTotal: total
        });

        levelState.ulangAktif = true;
        levelState.selesaiUlang = {};
        levelState.indeksAktif = 0;
        await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);

        if (!konteks.masihAktif()) return;
        arahKe(layarUntukLevel(level), {
          unit: unitId,
          blok: blokId,
          ulang: '1',
          ...(level === 3 ? { konteks: 'sesi2' } : {})
        });
      });
    }

    const btnTurun = wadah.querySelector('#s35-tombol-turun');
    if (btnTurun) {
      btnTurun.addEventListener('click', async () => {
        if (sedangKirim) return;
        sedangKirim = true;
        lukis();

        if (level === 1) {
          arahKe('S-30', { unit: unitId, blok: blokId });
          return;
        }

        await kirimLevelAksiDenganCadangan({
          unitId,
          blokId,
          level,
          aksi: 'turun',
          itemDikerjakan: dikerjakan,
          itemTotal: total
        });

        if (!konteks.masihAktif()) return;
        arahKe(layarUntukLevel(level - 1), { unit: unitId, blok: blokId });
      });
    }
  }

  function lblNonaktifSaatGalat(res) {
    if (res && res.galat === 'E_URUTAN') {
      return ambilTeks('S-35', 'tombol_nonaktif') || 'Coba semua latihan dulu satu kali';
    }
    return ambilTeks('S-91', 'penjelasan_belum_terbuka') ||
      'Selesaikan bagian sebelumnya atau tanyakan ke gurumu.';
  }

  lukis();
}
