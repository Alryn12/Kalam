/**
 * Layar S-32: Sesi 2 Level 2 · Dengar-Balas (situs/js/layar/s32-level2.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: SRS-3 FR-021, FR-071, FR-072, FR-083; BP-1 S-32; BP-4 R-20..R-28; BP-5 K-10..K-18, K-35; KEPUTUSAN.md SL-BARU-10
 */

import { ambilRekamanLatihan } from '../antrean.js';
import { hentikanAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import { catatKendalaTeknis, escapeHtml } from './tahap0-bantu.js';
import {
  IKON_ADEGAN_SVG,
  buatPemutarRekamanLokal,
  buatPengelolaMandiriSesi2,
  buatPengendaliRekamSesi2,
  buatStateSlotRekam,
  kirimCatatanLatihan,
  nomorUnitDariId,
  normalisasiJenisItemL2,
  pasangNavigasiSesi2,
  perbaruiAkuBisaLokalBlok,
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

export async function renderS32({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi2('S-32', param, { minLevel: 2 });
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarL2 = Array.isArray(blokData.l2) ? blokData.l2 : [];
  if (daftarL2.length === 0) {
    arahKe('S-35', { unit: unitId, blok: blokId, level: 2 });
    return;
  }

  const levelState = kemajuan.level[2];
  let indeks = tentukanIndeksLanjutLevel(daftarL2, levelState, param);
  await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);

  const pengelolaMandiri = buatPengelolaMandiriSesi2(konteks, 2, 'S-32');
  const pemutarSuaraku = buatPemutarRekamanLokal();

  let item = daftarL2[indeks];
  let slot = null;
  let butuhDengarPrompt = true;
  let sudahDengar = false;
  let kendalaAudioCount = 0;
  let pesanAudio = '';
  let sedangSimpan = false;
  const gambarKendalaSet = new Set();

  async function siapkanButir(indeksBaru) {
    hentikanAudioModel();
    pemutarSuaraku.hentikan();
    indeks = indeksBaru;
    levelState.indeksAktif = indeks;
    item = daftarL2[indeks];
    const kunci = `s32_${kodeSiswa}_${blokId}_${item.id}`;
    slot = buatStateSlotRekam(kunci, item);
    const rekAda = await ambilRekamanLatihan(kunci).catch(() => null);
    if (rekAda && rekAda.blob) slot.sudahRekam = true;

    butuhDengarPrompt = Boolean(item.audio_prompt) && item.jenis !== 'situasi';
    sudahDengar = !butuhDengarPrompt;
    kendalaAudioCount = 0;
    pesanAudio = '';
    sedangSimpan = false;
    await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
  }

  await siapkanButir(indeks);
  if (!konteks.masihAktif()) return;

  const pengendaliRekam = buatPengendaliRekamSesi2({
    konteks,
    idLayar: 'S-32',
    pengelolaMandiri,
    pemutarSuaraku,
    dapatkanSlotAktif: () => slot,
    maksPercobaan: 3,
    padaPerubahan: () => {
      if (konteks.masihAktif()) lukis();
    }
  });

  async function putarAudioPrompt() {
    if (!item || !item.audio_prompt) return;
    const daftarAudio = pilihBentukAudio(item.audio_prompt, kemajuan.bentukLawan);
    const hasil = await putarAudioModelSesi2(daftarAudio, unitId, 1);
    if (!konteks.masihAktif()) return;
    if (hasil.kendalaOffline || hasil.status === 'kendala') {
      kendalaAudioCount += 1;
      await catatKendalaTeknis('audio_belum_termuat', 'S-32');
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

  async function putarAudioContohJawaban() {
    if (!item || !item.model || !item.model.audio) return;
    const daftarAudio = pilihBentukAudio(item.model.audio, kemajuan.bentukLawan);
    const hasil = await putarAudioModelSesi2(daftarAudio, unitId, 1);
    if (!konteks.masihAktif()) return;
    if (hasil.status === 'penanda') {
      pesanAudio = ambilTeks('S-20', 'penanda_audio_model') ||
        'Memutar nada bantu sementara (rekaman model sedang disiapkan).';
      lukis();
    }
  }

  async function selesaikanButirDanLanjut(payloadLatihan, ringkasanSimpan) {
    if (sedangSimpan) return;
    sedangSimpan = true;
    lukis();

    await kirimCatatanLatihan(payloadLatihan, `L2 ${item.id}`);
    tandaiItemSelesaiLevel(levelState, item.id, ringkasanSimpan);

    if (!Array.isArray(blokData.l3) || blokData.l3.length === 0) {
      await perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, kemajuan);
    }

    if (indeks + 1 < daftarL2.length) {
      await siapkanButir(indeks + 1);
      if (konteks.masihAktif()) lukis();
    } else {
      levelState.ulangAktif = false;
      levelState.selesaiUlang = {};
      levelState.indeksAktif = 0;
      await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
      if (konteks.masihAktif()) {
        arahKe('S-35', { unit: unitId, blok: blokId, level: 2 });
      }
    }
  }

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const jenisNormal = normalisasiJenisItemL2(item.jenis);
    const lblButir = (ambilTeks('S-32', 'penanda_butir') || 'Latihan {n} dari {total}')
      .replace('{n}', String(indeks + 1))
      .replace('{total}', String(daftarL2.length));
    const lblPercobaan = (ambilTeks('S-31', 'penanda') || 'Percobaan ke-{n}')
      .replace('{n}', String(slot.percobaan));

    const labelJenis = jenisNormal === 'tanya'
      ? (ambilTeks('S-32', 'label_tanya') || 'Dengar dan tanya')
      : (jenisNormal === 'situasi'
        ? (ambilTeks('S-32', 'label_situasi') || 'Situasi')
        : (ambilTeks('S-32', 'label_jawab') || 'Dengar dan jawab'));

    const cadanganInstruksi = jenisNormal === 'tanya'
      ? (ambilTeks('S-32', 'instruksi_tanya') || 'Berikan pertanyaan yang sesuai.')
      : (jenisNormal === 'situasi'
        ? (ambilTeks('S-32', 'instruksi_situasi') || 'Ucapkan ungkapan yang sesuai.')
        : (ambilTeks('S-32', 'instruksi_jawab') || 'Berikan jawaban yang sesuai.'));
    const instruksi = item.instruksi || cadanganInstruksi;

    const lblDengarkan = ambilTeks('S-32', 'tombol_dengarkan') || 'Dengarkan';
    const lblMuatUlang = ambilTeks('S-31', 'tombol_muat_ulang_audio') || 'Muat ulang audio';
    const lblContoh = ambilTeks('S-31', 'tombol_dengar_contoh') || 'Dengar contoh';
    const judulContoh = ambilTeks('S-32', 'judul_contoh') || 'Contoh jawaban';
    const judulAlternatif = ambilTeks('S-32', 'judul_alternatif') || 'Jawaban lain yang juga bisa';
    const pesan3Kali = ambilTeks('S-32', 'pesan_3_kali') || 'Tidak apa-apa, kita lanjut. Dengarkan contoh jawabannya dulu.';
    const lblLanjut = ambilTeks('S-32', 'tombol_lanjut') || 'Lanjut';
    const lblLewatiTeknis = ambilTeks('S-31', 'tombol_lewati_teknis') || 'Lewati latihan (kendala teknis)';
    const pesanDengarDulu = ambilTeks('S-32', 'pesan_dengar_dulu') ||
      'Dengarkan suaranya dulu satu kali, lalu tombol Rekam akan aktif.';
    const teksGambarKosong = ambilTeks('S-32', 'penanda_gambar_kosong') || 'Ilustrasi situasi sedang disiapkan.';

    const { bingkaiHtml, lewatiKeadaanHtml } = renderBingkaiDanLewatiKeadaan(item, 's32');
    const penandaHtml = renderPenandaHasilDeteksi({ hasil: slot.penandaTampil, percobaan: slot.percobaan });

    const gambarKendala = Boolean(item.gambar && gambarKendalaSet.has(item.gambar));
    const pemicuHtml = butuhDengarPrompt ? `
      <div class="baris-kontrol">
        <button type="button" id="s32-tombol-dengar" class="tombol ${sudahDengar ? 'tombol--sekunder' : 'tombol--utama'}" ${slot.statusRekam === 'merekam' ? 'disabled' : ''}>
          &#128266; ${escapeHtml(lblDengarkan)}
        </button>
        ${(kendalaAudioCount > 0 || pesanAudio) ? `
          <button type="button" id="s32-tombol-muat-ulang" class="tombol tombol--sekunder" ${slot.statusRekam === 'merekam' ? 'disabled' : ''}>
            &#8635; ${escapeHtml(lblMuatUlang)}
          </button>
        ` : ''}
      </div>
      ${!sudahDengar ? `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(pesanDengarDulu)}</p>` : ''}
    ` : `
      <div class="kotak-adegan">
        <span class="lencana-penanda-audio">${escapeHtml(labelJenis)}</span>
        ${item.gambar && !gambarKendala ? `<img id="s32-gambar-situasi" class="kotak-adegan__gambar" src="${escapeHtml(item.gambar)}" alt="${escapeHtml(instruksi)}">` : ''}
        <div id="s32-pengganti-gambar" style="display: flex; flex-direction: column; align-items: center; gap: var(--jarak-1);" ${item.gambar && !gambarKendala ? 'hidden' : ''}>
          ${IKON_ADEGAN_SVG}
          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(teksGambarKosong)}</p>
        </div>
      </div>
    `;

    const tampilContohTiga = !slot.menungguMandiri && slot.selesaiDicoba && slot.hasil === 'tidak' && slot.percobaan >= 3;
    const tampilContohMandiri = slot.menungguMandiri && slot.sudahRekam;
    const tampilContohSukses = !slot.menungguMandiri && slot.selesaiDicoba && slot.hasil === 'terdeteksi';
    const tampilModelJawaban = tampilContohTiga || tampilContohMandiri || tampilContohSukses;

    const modelArab = item.model ? pilihBentukTeks(item.model.arab, bentuk) : '';
    const daftarAlternatif = (Array.isArray(item.diterima) ? item.diterima : [])
      .filter((t) => t && t !== modelArab);

    const kotakContohHtml = tampilModelJawaban ? `
      <div class="pesan-hangat" role="status">
        <p class="pesan-hangat__judul">${escapeHtml(judulContoh)}</p>
        ${tampilContohTiga ? `<p class="pesan-hangat__isi">${escapeHtml(pesan3Kali)}</p>` : ''}
        ${modelArab ? `
          <p class="teks-arab teks-arab--tengah" lang="ar" dir="rtl" style="margin: var(--jarak-2) 0;">
            ${escapeHtml(modelArab)}
          </p>
        ` : ''}
        ${item.model && item.model.audio ? `
          <button type="button" id="s32-tombol-contoh" class="tombol tombol--sekunder">
            ${escapeHtml(lblContoh)}
          </button>
        ` : ''}
        ${daftarAlternatif.length > 0 ? `
          <div style="margin-top: var(--jarak-3); border-top: 1px solid var(--warna-garis); padding-top: var(--jarak-2);">
            <p class="teks-keterangan" style="margin: 0; font-weight: 600;">${escapeHtml(judulAlternatif)}</p>
            ${daftarAlternatif.map((alt) => `
              <p class="teks-arab" lang="ar" dir="rtl" style="margin: var(--jarak-1) 0 0 0;">${escapeHtml(alt)}</p>
            `).join('')}
          </div>
        ` : ''}
      </div>
    ` : '';

    const kotakMandiriHtml = slot.menungguMandiri ? renderKotakModeMandiri({
      pertanyaan: ambilTeks('S-31', 'mode_mandiri') || 'Sudah mirip dengan contoh?',
      pilihanAktif: slot.pilihanMandiri,
      keterangan: ambilTeks('S-31', 'keterangan_mandiri'),
      idPrefix: 's32-mandiri'
    }) : '';

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-32', { levelAktif: 2 })}

        <article class="kartu-arab" aria-label="Latihan Level 2">
          ${bingkaiHtml}

          <div class="kartu-arab__kepala">
            <span class="kartu-arab__label">${escapeHtml(lblButir)}</span>
            <span class="kartu-arab__label">${escapeHtml(labelJenis)}</span>
            ${slot.percobaan > 0 ? `<span class="kartu-arab__label">${escapeHtml(lblPercobaan)}</span>` : ''}
          </div>

          <p class="teks-instruksi" style="margin: 0; font-weight: 600;">${escapeHtml(instruksi)}</p>

          ${pemicuHtml}
          ${pesanAudio ? `<p class="teks-keterangan" role="status" style="margin: 0;">${escapeHtml(pesanAudio)}</p>` : ''}

          ${renderKotakRekamSesi2({
            statusRekam: slot.statusRekam,
            sudahRekam: slot.sudahRekam,
            bolehRekam: sudahDengar,
            pesanStatus: slot.pesanStatus,
            idPrefix: 's32'
          })}

          ${penandaHtml}
          ${kotakContohHtml}
          ${kotakMandiriHtml}

          <div class="baris-tombol">
            ${slot.selesaiDicoba ? `
              <button type="button" id="s32-tombol-lanjut" class="tombol tombol--utama" ${sedangSimpan ? 'disabled' : ''}>
                ${escapeHtml(lblLanjut)}
              </button>
            ` : ''}
            ${lewatiKeadaanHtml}
            <button type="button" id="s32-tombol-lewati-teknis" class="tombol tombol--sekunder" ${sedangSimpan ? 'disabled' : ''}>
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

    const img = wadah.querySelector('#s32-gambar-situasi');
    const pengganti = wadah.querySelector('#s32-pengganti-gambar');
    if (img && pengganti) {
      img.addEventListener('error', () => {
        if (item.gambar) gambarKendalaSet.add(item.gambar);
        img.hidden = true;
        pengganti.hidden = false;
      }, { once: true });
    }

    const btnDengar = wadah.querySelector('#s32-tombol-dengar');
    if (btnDengar) btnDengar.addEventListener('click', putarAudioPrompt);

    const btnMuat = wadah.querySelector('#s32-tombol-muat-ulang');
    if (btnMuat) btnMuat.addEventListener('click', putarAudioPrompt);

    const btnContoh = wadah.querySelector('#s32-tombol-contoh');
    if (btnContoh) btnContoh.addEventListener('click', putarAudioContohJawaban);

    const btnRekam = wadah.querySelector('#s32-tombol-rekam');
    if (btnRekam) btnRekam.addEventListener('click', () => pengendaliRekam.toggleRekam());

    const btnSuaraku = wadah.querySelector('#s32-tombol-dengar-suaraku');
    if (btnSuaraku) btnSuaraku.addEventListener('click', () => pemutarSuaraku.putar(slot.kunciRekam));

    wadah.querySelectorAll('[data-pilihan-mandiri]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pil = btn.getAttribute('data-pilihan-mandiri');
        pengendaliRekam.pilihMandiri(slot, pil, { id_item: item.id, level: 'L2' });
      });
    });

    const jenisNormal = normalisasiJenisItemL2(item.jenis);

    const btnLanjut = wadah.querySelector('#s32-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        selesaikanButirDanLanjut(
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'L2',
            id_item: item.id,
            bagian: 0,
            konteks: 'sesi2',
            percobaan: Math.max(1, slot.percobaan),
            hasil: slot.hasil || 'tersimpan',
            durasi_bicara: slot.durasi_bicara,
            waktu_mulai_bicara: slot.waktu_mulai_bicara != null ? slot.waktu_mulai_bicara : '',
            skor_kata_kunci: slot.skor_kata_kunci !== '' ? slot.skor_kata_kunci : '',
            k_wajib: slot.k_wajib !== '' ? slot.k_wajib : '',
            jenis_item: jenisNormal
          },
          {
            hasil: slot.hasil || 'tersimpan',
            jenis_item: jenisNormal,
            percobaan: Math.max(1, slot.percobaan),
            durasi_bicara: slot.durasi_bicara,
            waktu_mulai_bicara: slot.waktu_mulai_bicara
          }
        );
      });
    }

    const btnLewatiKeadaan = wadah.querySelector('#s32-lewati-keadaan');
    if (btnLewatiKeadaan) {
      btnLewatiKeadaan.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        selesaikanButirDanLanjut(
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'L2',
            id_item: item.id,
            bagian: 0,
            konteks: 'sesi2',
            percobaan: slot.percobaan,
            hasil: 'tersimpan',
            jenis_item: jenisNormal
          },
          {
            hasil: 'tersimpan',
            dilewatiKeadaan: true,
            alasanLewatiKeadaan: (item.lewati_keadaan && item.lewati_keadaan.alasan) || 'keadaan',
            jenis_item: jenisNormal,
            percobaan: slot.percobaan
          }
        );
      });
    }

    const btnLewatiTeknis = wadah.querySelector('#s32-tombol-lewati-teknis');
    if (btnLewatiTeknis) {
      btnLewatiTeknis.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        selesaikanButirDanLanjut(
          {
            jenis: 'latihan',
            unit: nomorUnitDariId(unitId),
            blok: blokId,
            level: 'L2',
            id_item: item.id,
            bagian: 0,
            konteks: 'sesi2',
            percobaan: slot.percobaan,
            hasil: 'dilewati_teknis',
            jenis_item: jenisNormal
          },
          {
            hasil: 'dilewati_teknis',
            dilewatiTeknis: true,
            jenis_item: jenisNormal,
            percobaan: slot.percobaan
          }
        );
      });
    }
  }

  lukis();
}
