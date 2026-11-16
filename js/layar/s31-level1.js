/**
 * Layar S-31: Sesi 2 Level 1 · Ikut (situs/js/layar/s31-level1.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: SRS-3 FR-020, FR-071, FR-072, FR-083; BP-1 S-31; BP-4 R-20..R-28; BP-5 K-10..K-18, K-35; KEPUTUSAN.md SL-BARU-10
 */

import { ambilRekamanLatihan } from '../antrean.js';
import { hentikanAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import { catatKendalaTeknis, escapeHtml } from './tahap0-bantu.js';
import { tandaiS12Sesi2Dikunjungi } from './s30-pemanasan.js';
import {
  buatPemutarRekamanLokal,
  buatPengelolaMandiriSesi2,
  buatPengendaliRekamSesi2,
  buatStateSlotRekam,
  kirimCatatanLatihan,
  nomorUnitDariId,
  pasangNavigasiSesi2,
  pilihBentukAudio,
  pilihBentukTeks,
  putarAudioModelSesi2,
  renderBingkaiDanLewatiKeadaan,
  renderKepalaSesi2,
  renderKotakModeMandiri,
  renderKotakRekamSesi2,
  renderPenandaHasilDeteksi,
  siapkanKonteksSesi2,
  simpanKemajuanSesi2,
  tandaiItemSelesaiLevel,
  tentukanIndeksLanjutLevel
} from './sesi2-bantu.js';

export async function renderS31({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi2('S-31', param, { minLevel: 1 });
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  tandaiS12Sesi2Dikunjungi(kodeSiswa, blokId);
  if (!kemajuan.s12Sesi2Sudah) {
    kemajuan.s12Sesi2Sudah = true;
    await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
  }

  const daftarL1 = Array.isArray(blokData.l1) ? blokData.l1 : [];
  if (daftarL1.length === 0) {
    arahKe('S-35', { unit: unitId, blok: blokId, level: 1 });
    return;
  }

  const levelState = kemajuan.level[1];
  let indeks = tentukanIndeksLanjutLevel(daftarL1, levelState, param);
  await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);

  const pengelolaMandiri = buatPengelolaMandiriSesi2(konteks, 1, 'S-31');
  const pemutarSuaraku = buatPemutarRekamanLokal();

  let item = daftarL1[indeks];
  let slot = null;
  let sudahDengar = false;
  let kendalaAudioCount = 0;
  let pesanAudio = '';
  let sedangSimpan = false;

  async function siapkanButir(indeksBaru) {
    hentikanAudioModel();
    pemutarSuaraku.hentikan();
    indeks = indeksBaru;
    levelState.indeksAktif = indeks;
    item = daftarL1[indeks];
    const kunci = `s31_${kodeSiswa}_${blokId}_${item.id}`;
    slot = buatStateSlotRekam(kunci, item);
    const rekAda = await ambilRekamanLatihan(kunci).catch(() => null);
    if (rekAda && rekAda.blob) slot.sudahRekam = true;
    sudahDengar = false;
    kendalaAudioCount = 0;
    pesanAudio = '';
    sedangSimpan = false;
    await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
  }

  await siapkanButir(indeks);
  if (!konteks.masihAktif()) return;

  const pengendaliRekam = buatPengendaliRekamSesi2({
    konteks,
    idLayar: 'S-31',
    pengelolaMandiri,
    pemutarSuaraku,
    dapatkanSlotAktif: () => slot,
    maksPercobaan: 3,
    padaPerubahan: () => {
      if (konteks.masihAktif()) lukis();
    }
  });

  async function putarContohAudio() {
    if (!item) return;
    const daftarAudio = pilihBentukAudio(item.audio, kemajuan.bentukLawan);
    const hasil = await putarAudioModelSesi2(daftarAudio, unitId, 1);
    if (!konteks.masihAktif()) return;
    if (hasil.kendalaOffline || hasil.status === 'kendala') {
      kendalaAudioCount += 1;
      await catatKendalaTeknis('audio_belum_termuat', 'S-31');
      pesanAudio = kendalaAudioCount >= 2
        ? (ambilTeks('S-31', 'pesan_audio_kendala_2x') || 'Audio contoh masih belum termuat. Kamu boleh melewati latihan ini.')
        : (ambilTeks('S-31', 'pesan_audio_kendala') || 'Audio contoh belum termuat. Ketuk Muat ulang audio untuk mencoba lagi.');
    } else {
      sudahDengar = true;
      pesanAudio = hasil.status === 'penanda'
        ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
        : '';
    }
    lukis();
  }

  async function selesaikanButirDanLanjut(payloadLatihan, ringkasanSimpan) {
    if (sedangSimpan) return;
    sedangSimpan = true;
    lukis();

    await kirimCatatanLatihan(payloadLatihan, `L1 ${item.id}`);
    tandaiItemSelesaiLevel(levelState, item.id, ringkasanSimpan);

    if (indeks + 1 < daftarL1.length) {
      await siapkanButir(indeks + 1);
      if (konteks.masihAktif()) lukis();
    } else {
      levelState.ulangAktif = false;
      levelState.selesaiUlang = {};
      levelState.indeksAktif = 0;
      await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
      if (konteks.masihAktif()) {
        arahKe('S-35', { unit: unitId, blok: blokId, level: 1 });
      }
    }
  }

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const teksArab = pilihBentukTeks(item.arab, bentuk);
    const lblButir = (ambilTeks('S-31', 'penanda_butir') || 'Latihan {n} dari {total}')
      .replace('{n}', String(indeks + 1))
      .replace('{total}', String(daftarL1.length));
    const lblPercobaan = (ambilTeks('S-31', 'penanda') || 'Percobaan ke-{n}')
      .replace('{n}', String(slot.percobaan));
    const instruksi = ambilTeks('S-31', 'instruksi') || 'Dengarkan contohnya, lalu ucapkan.';
    const lblDengarkan = ambilTeks('S-31', 'tombol_dengarkan') || 'Dengarkan';
    const lblMuatUlang = ambilTeks('S-31', 'tombol_muat_ulang_audio') || 'Muat ulang audio';
    const lblContoh = ambilTeks('S-31', 'tombol_dengar_contoh') || 'Dengar contoh';
    const judulContoh = ambilTeks('S-31', 'judul_contoh') || 'Contoh ucapan';
    const setelah3 = ambilTeks('S-31', 'setelah_3_kali') || 'Tidak apa-apa, kita lanjut. Dengarkan contohnya dulu.';
    const lblLanjut = ambilTeks('S-31', 'tombol_lanjut') || 'Lanjut';
    const lblLewatiTeknis = ambilTeks('S-31', 'tombol_lewati_teknis') || 'Lewati latihan (kendala teknis)';
    const pesanDengarDulu = ambilTeks('S-31', 'pesan_dengar_dulu') ||
      'Dengarkan contohnya dulu satu kali, lalu tombol Rekam akan aktif.';

    const { bingkaiHtml, lewatiKeadaanHtml } = renderBingkaiDanLewatiKeadaan(item, 's31');
    const penandaHtml = renderPenandaHasilDeteksi({ hasil: slot.penandaTampil, percobaan: slot.percobaan });

    const tampilContohTiga = !slot.menungguMandiri && slot.selesaiDicoba && slot.hasil === 'tidak' && slot.percobaan >= 3;
    const tampilContohMandiri = slot.menungguMandiri && slot.sudahRekam;
    const tampilContohSukses = !slot.menungguMandiri && slot.selesaiDicoba && slot.hasil === 'terdeteksi';

    const kotakContohHtml = (tampilContohTiga || tampilContohMandiri || tampilContohSukses) ? `
      <div class="pesan-hangat" role="status">
        <p class="pesan-hangat__judul">${escapeHtml(judulContoh)}</p>
        ${tampilContohTiga ? `<p class="pesan-hangat__isi">${escapeHtml(setelah3)}</p>` : ''}
        <p class="teks-arab teks-arab--tengah" lang="ar" dir="rtl" style="margin: var(--jarak-2) 0;">
          ${escapeHtml(teksArab)}
        </p>
        <button type="button" id="s31-tombol-contoh" class="tombol tombol--sekunder">
          ${escapeHtml(lblContoh)}
        </button>
      </div>
    ` : '';

    const kotakMandiriHtml = slot.menungguMandiri ? renderKotakModeMandiri({
      pertanyaan: ambilTeks('S-31', 'mode_mandiri') || 'Sudah mirip dengan contoh?',
      pilihanAktif: slot.pilihanMandiri,
      keterangan: ambilTeks('S-31', 'keterangan_mandiri'),
      idPrefix: 's31-mandiri'
    }) : '';

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-31', { levelAktif: 1 })}

        <article class="kartu-arab" aria-label="Latihan Level 1">
          ${bingkaiHtml}

          <div class="kartu-arab__kepala">
            <span class="kartu-arab__label">${escapeHtml(lblButir)}</span>
            ${slot.percobaan > 0 ? `<span class="kartu-arab__label">${escapeHtml(lblPercobaan)}</span>` : ''}
          </div>

          <p class="teks-instruksi" style="margin: 0; font-weight: 600;">${escapeHtml(instruksi)}</p>

          <div class="kartu-arab__kotak-kalimat">
            <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">
              ${escapeHtml(teksArab)}
            </p>
          </div>

          <div class="baris-kontrol">
            <button type="button" id="s31-tombol-dengar" class="tombol ${sudahDengar ? 'tombol--sekunder' : 'tombol--utama'}" ${slot.statusRekam === 'merekam' ? 'disabled' : ''}>
              &#128266; ${escapeHtml(lblDengarkan)}
            </button>
            ${(kendalaAudioCount > 0 || pesanAudio) ? `
              <button type="button" id="s31-tombol-muat-ulang" class="tombol tombol--sekunder" ${slot.statusRekam === 'merekam' ? 'disabled' : ''}>
                &#8635; ${escapeHtml(lblMuatUlang)}
              </button>
            ` : ''}
          </div>

          ${!sudahDengar ? `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(pesanDengarDulu)}</p>` : ''}
          ${pesanAudio ? `<p class="teks-keterangan" role="status" style="margin: 0;">${escapeHtml(pesanAudio)}</p>` : ''}

          ${renderKotakRekamSesi2({
            statusRekam: slot.statusRekam,
            sudahRekam: slot.sudahRekam,
            bolehRekam: sudahDengar,
            pesanStatus: slot.pesanStatus,
            idPrefix: 's31'
          })}

          ${penandaHtml}
          ${kotakContohHtml}
          ${kotakMandiriHtml}

          <div class="baris-tombol">
            ${slot.selesaiDicoba ? `
              <button type="button" id="s31-tombol-lanjut" class="tombol tombol--utama" ${sedangSimpan ? 'disabled' : ''}>
                ${escapeHtml(lblLanjut)}
              </button>
            ` : ''}
            ${lewatiKeadaanHtml}
            <button type="button" id="s31-tombol-lewati-teknis" class="tombol tombol--sekunder" ${sedangSimpan ? 'disabled' : ''}>
              ${escapeHtml(lblLewatiTeknis)}
            </button>
          </div>
        </article>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi2(konteks, () => lukis());

    const btnDengar = wadah.querySelector('#s31-tombol-dengar');
    if (btnDengar) btnDengar.addEventListener('click', putarContohAudio);

    const btnMuat = wadah.querySelector('#s31-tombol-muat-ulang');
    if (btnMuat) btnMuat.addEventListener('click', putarContohAudio);

    const btnContoh = wadah.querySelector('#s31-tombol-contoh');
    if (btnContoh) btnContoh.addEventListener('click', putarContohAudio);

    const btnRekam = wadah.querySelector('#s31-tombol-rekam');
    if (btnRekam) btnRekam.addEventListener('click', () => pengendaliRekam.toggleRekam());

    const btnSuaraku = wadah.querySelector('#s31-tombol-dengar-suaraku');
    if (btnSuaraku) btnSuaraku.addEventListener('click', () => pemutarSuaraku.putar(slot.kunciRekam));

    wadah.querySelectorAll('[data-pilihan-mandiri]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pil = btn.getAttribute('data-pilihan-mandiri');
        pengendaliRekam.pilihMandiri(slot, pil, { id_item: item.id, level: 'L1' });
      });
    });

    const btnLanjut = wadah.querySelector('#s31-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        const kWajibLen = Array.isArray(item.kata_wajib) ? item.kata_wajib.length : 0;
        selesaikanButirDanLanjut(
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'L1',
            id_item: item.id,
            bagian: 0,
            konteks: 'sesi2',
            percobaan: Math.max(1, slot.percobaan),
            hasil: slot.hasil || 'tersimpan',
            durasi_bicara: slot.durasi_bicara,
            waktu_mulai_bicara: slot.waktu_mulai_bicara != null ? slot.waktu_mulai_bicara : '',
            skor_kata_kunci: slot.skor_kata_kunci !== '' ? slot.skor_kata_kunci : '',
            k_wajib: slot.k_wajib !== '' ? slot.k_wajib : kWajibLen
          },
          {
            hasil: slot.hasil || 'tersimpan',
            percobaan: Math.max(1, slot.percobaan),
            durasi_bicara: slot.durasi_bicara,
            waktu_mulai_bicara: slot.waktu_mulai_bicara
          }
        );
      });
    }

    const btnLewatiKeadaan = wadah.querySelector('#s31-lewati-keadaan');
    if (btnLewatiKeadaan) {
      btnLewatiKeadaan.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        selesaikanButirDanLanjut(
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'L1',
            id_item: item.id,
            bagian: 0,
            konteks: 'sesi2',
            percobaan: slot.percobaan,
            hasil: 'tersimpan'
          },
          {
            hasil: 'tersimpan',
            dilewatiKeadaan: true,
            alasanLewatiKeadaan: (item.lewati_keadaan && item.lewati_keadaan.alasan) || 'keadaan',
            percobaan: slot.percobaan
          }
        );
      });
    }

    const btnLewatiTeknis = wadah.querySelector('#s31-tombol-lewati-teknis');
    if (btnLewatiTeknis) {
      btnLewatiTeknis.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        selesaikanButirDanLanjut(
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'L1',
            id_item: item.id,
            bagian: 0,
            konteks: 'sesi2',
            percobaan: slot.percobaan,
            hasil: 'dilewati_teknis'
          },
          {
            hasil: 'dilewati_teknis',
            dilewatiTeknis: true,
            percobaan: slot.percobaan
          }
        );
      });
    }
  }

  lukis();
}
