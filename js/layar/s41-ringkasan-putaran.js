/**
 * Layar S-41: Sesi 3 · Ringkasan Putaran (hanya membandingkan dengan diri sendiri) (situs/js/layar/s41-ringkasan-putaran.js)
 * Tugas M2-A: TB-M2-02
 * Acuan: SRS-3 FR-028; BP-1 S-41; BP-4 R-14, R-35, R-38; BP-5 K-47; BP-6 S-41
 */

import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import { escapeHtml, kirimAtauAntre } from './tahap0-bantu.js';
import {
  hitungRingkasanSesi3,
  kirimSesi3SelesaiDenganCadangan,
  siapkanKonteksSesi3,
  simpanKemajuanSesi3
} from './sesi3-bantu.js';

export async function renderS41({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi3('S-41', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, noUnit, kemajuanS3, wadah } = konteks;

  const ringkasanHitung = hitungRingkasanSesi3(kemajuanS3);
  const ringkasan = (kemajuanS3.ringkasanTerakhir && Number(kemajuanS3.ringkasanTerakhir.totalWaktuP3 || 0) > 0 &&
    Object.keys((kemajuanS3.catatanPutaran && kemajuanS3.catatanPutaran[3]) || {}).length === 0)
    ? kemajuanS3.ringkasanTerakhir
    : ringkasanHitung;

  kemajuanS3.sedangBerjalan = false;
  kemajuanS3.ringkasanTerakhir = ringkasan;

  const rekorSebelumnya = (ambilState().status_server && ambilState().status_server.rekor_pribadi &&
    ambilState().status_server.rekor_pribadi[unitId]) || kemajuanS3.rekorPribadiLokal || null;

  let rekorUnitTampil = (rekorSebelumnya !== null && rekorSebelumnya !== undefined && !Number.isNaN(Number(rekorSebelumnya)))
    ? Math.min(Number(rekorSebelumnya), ringkasan.totalWaktuP3)
    : ringkasan.totalWaktuP3;
  rekorUnitTampil = Number(Number(rekorUnitTampil).toFixed(1));
  kemajuanS3.rekorPribadiLokal = rekorUnitTampil;
  await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);

  function formatAngkaDetik(nilai) {
    return String(Number(nilai || 0).toFixed(1)).replace('.', ',');
  }

  function lukis() {
    const judul = ambilTeks('S-41', 'judul') || 'Perjalananmu di sesi ini';
    const barisWaktu = ambilTeks('S-41', 'baris_waktu', {
      a: formatAngkaDetik(ringkasan.waktuPerKartuP1),
      b: formatAngkaDetik(ringkasan.waktuPerKartuP3)
    }) || `Waktu per kartu: Putaran 1 ${formatAngkaDetik(ringkasan.waktuPerKartuP1)} detik, Putaran 3 ${formatAngkaDetik(ringkasan.waktuPerKartuP3)} detik`;
    const barisBantuan = ambilTeks('S-41', 'baris_bantuan', {
      a: String(ringkasan.bantuanP1),
      b: String(ringkasan.bantuanP3)
    }) || `Memakai bantuan: Putaran 1 ${ringkasan.bantuanP1} kali, Putaran 3 ${ringkasan.bantuanP3} kali`;
    const barisRekor = ambilTeks('S-41', 'baris_rekor', {
      detik: formatAngkaDetik(rekorUnitTampil)
    }) || `Rekor pribadimu: ${formatAngkaDetik(rekorUnitTampil)} detik`;
    const pembanding = ambilTeks('S-41', 'pembanding') || 'Ini hanya dibandingkan dengan dirimu sendiri.';
    const judulRincian = ambilTeks('S-41', 'rincian_kartu') || 'Perbandingan waktumu tiap kartu';
    const lblLanjut = ambilTeks('S-41', 'tombol') || 'Lanjut';
    const lblUlangi = ambilTeks('S-41', 'tombol_ulangi_sesi3') || 'Ulangi Sesi 3';

    const rincianHtml = (ringkasan.daftarKartu || []).map((it) => {
      const teksKartu = ambilTeks('S-41', 'label_putaran_kartu', {
        a: formatAngkaDetik(it.waktu_p1),
        b: formatAngkaDetik(it.waktu_p3)
      }) || `Putaran 1: ${formatAngkaDetik(it.waktu_p1)} detik · Putaran 3: ${formatAngkaDetik(it.waktu_p3)} detik`;
      return `
        <li class="butir-aku-bisa">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--jarak-2); flex-wrap: wrap;">
            <span class="teks-instruksi" style="margin: 0; font-weight: 600;">${escapeHtml(it.kartu)}</span>
            <span class="kartu-arab__label">${escapeHtml(it.id_kartu)}</span>
          </div>
          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(teksKartu)}</p>
        </li>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-labelledby="judul-s41">
        <section class="kartu">
          <div class="daftar-status" style="justify-content: space-between; align-items: center;">
            <span class="kartu-unit__nomor">Sesi 3 · Unit ${noUnit}</span>
            <span class="penanda-status penanda-status--terdeteksi">
              <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
              <span>Selesai</span>
            </span>
          </div>
          <h1 id="judul-s41" class="judul-layar" style="margin-bottom: 0;">${escapeHtml(judul)}</h1>

          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi" style="font-weight: 600;">${escapeHtml(barisWaktu)}</p>
            <p class="pesan-hangat__isi">${escapeHtml(barisBantuan)}</p>
          </div>

          <div class="kotak-penyebut-aku-bisa" role="status">
            <span class="teks-keterangan" style="margin: 0; font-weight: 600;">Unit ${noUnit}</span>
            <p id="s41-baris-rekor" class="subjudul-layar" style="margin: 0;">${escapeHtml(barisRekor)}</p>
          </div>

          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(pembanding)}</p>
        </section>

        ${rincianHtml ? `
          <section class="kartu" aria-labelledby="judul-rincian-s41">
            <h2 id="judul-rincian-s41" class="subjudul-layar" style="margin: 0;">${escapeHtml(judulRincian)}</h2>
            <ul class="daftar-aku-bisa">
              ${rincianHtml}
            </ul>
          </section>
        ` : ''}

        <section class="kartu">
          <div class="baris-tombol">
            <button type="button" id="s41-tombol-lanjut" class="tombol tombol--utama">
              ${escapeHtml(lblLanjut)}
            </button>
            <button type="button" id="s41-tombol-ulangi" class="tombol tombol--sekunder">
              ${escapeHtml(lblUlangi)}
            </button>
          </div>
        </section>
      </section>
    `;

    const btnLanjut = wadah.querySelector('#s41-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        arahKe('S-42', { unit: unitId });
      });
    }

    const btnUlangi = wadah.querySelector('#s41-tombol-ulangi');
    if (btnUlangi) {
      btnUlangi.addEventListener('click', () => {
        arahKe('S-40', { unit: unitId });
      });
    }
  }

  lukis();

  kirimAtauAntre(
    'catat',
    { jenis: 'aktivitas', aktivitas: 'ringkasan_dilihat', unit: noUnit },
    `Ringkasan Sesi 3 Unit ${noUnit}`,
    'ANGKA'
  ).catch(() => {});

  const hasilSelesai = await kirimSesi3SelesaiDenganCadangan({
    unitId,
    totalWaktuP3: ringkasan.totalWaktuP3,
    ringkasan: {
      waktu_per_kartu_p1: ringkasan.waktuPerKartuP1,
      waktu_per_kartu_p3: ringkasan.waktuPerKartuP3,
      bantuan_p1: ringkasan.bantuanP1,
      bantuan_p3: ringkasan.bantuanP3,
      total_waktu_p1: ringkasan.totalWaktuP1,
      total_waktu_p3: ringkasan.totalWaktuP3
    }
  });

  if (konteks.masihAktif() && hasilSelesai && hasilSelesai.ok && hasilSelesai.rekor_unit != null) {
    rekorUnitTampil = Number(Number(hasilSelesai.rekor_unit).toFixed(1));
    kemajuanS3.rekorPribadiLokal = rekorUnitTampil;
    await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
    lukis();
  }
}
