/**
 * Layar S-33: Level 3 · Kunci (Konteks Sesi 2) (situs/js/layar/s33-level3.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: SRS-3 FR-022, FR-071, FR-072, FR-074, FR-083; BP-1 S-33 & Bagian C;
 *        BP-4 R-22..R-28; BP-5 K-10..K-18, K-35; KEPUTUSAN.md SL-BARU-03, SL-BARU-10
 */

import { ambilRekamanLatihan } from '../antrean.js';
import { hentikanAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks, buatIdIdempoten } from '../state.js';
import { escapeHtml, kirimAtauAntre } from './tahap0-bantu.js';
import {
  buatPemutarRekamanLokal,
  buatPengelolaMandiriSesi2,
  buatPengendaliRekamSesi2,
  buatStateSlotRekam,
  normalisasiKartuL3,
  nomorUnitDariId,
  pasangNavigasiSesi2,
  perbaruiAkuBisaLokalBlok,
  pilihBentukAudio,
  pilihBentukTeks,
  putarAudioModelSesi2,
  renderBingkaiDanLewatiKeadaan,
  renderKepalaSesi2,
  renderKotakModeMandiri,
  renderKotakRekamSesi2,
  renderPemilihBentukLawan,
  renderPenandaHasilDeteksi,
  siapkanKonteksSesi2,
  simpanKemajuanSesi2,
  tandaiItemSelesaiLevel,
  tentukanIndeksLanjutLevel
} from './sesi2-bantu.js';

export async function renderS33({ param = {} } = {}) {
  const konteksLayar = String((param && param.konteks) || 'sesi2').trim().toLowerCase();
  const konteks = await siapkanKonteksSesi2('S-33', param, {
    minLevel: konteksLayar === 'sesi2' ? 3 : 1
  });
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarL3 = Array.isArray(blokData.l3) ? blokData.l3 : [];
  if (daftarL3.length === 0) {
    arahKe('S-35', { unit: unitId, blok: blokId, level: 3 });
    return;
  }

  const levelState = kemajuan.level[3];
  const indeks = tentukanIndeksLanjutLevel(daftarL3, levelState, param);
  await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);

  const kartuAsli = daftarL3[indeks];
  const kartu = normalisasiKartuL3(kartuAsli);

  const pengelolaMandiri = buatPengelolaMandiriSesi2(konteks, 3, 'S-33');
  const pemutarSuaraku = buatPemutarRekamanLokal();

  const kunciSlot1 = `s33_${kodeSiswa}_${blokId}_${kartu.id}_S1`;
  const kunciSlot2 = `s33_${kodeSiswa}_${blokId}_${kartu.id}_S2`;

  const slot1 = buatStateSlotRekam(kunciSlot1, kartu.slot1);
  const slot2 = buatStateSlotRekam(kunciSlot2, kartu.slot2);

  const [rek1, rek2] = await Promise.all([
    ambilRekamanLatihan(kunciSlot1).catch(() => null),
    ambilRekamanLatihan(kunciSlot2).catch(() => null)
  ]);
  if (rek1 && rek1.blob) slot1.sudahRekam = true;
  if (rek2 && rek2.blob) slot2.sudahRekam = true;
  if (!konteks.masihAktif()) return;

  let bagianAktif = 1;
  let bantuanDipakai1 = 0;
  let bantuanDipakai2 = 0;
  let bantuanTerbuka1 = false;
  let bantuanTerbuka2 = false;
  let pesanAudio = '';
  let sedangSimpan = false;

  const pengendaliRekam = buatPengendaliRekamSesi2({
    konteks,
    idLayar: 'S-33',
    pengelolaMandiri,
    pemutarSuaraku,
    dapatkanSlotAktif: () => (bagianAktif === 1 ? slot1 : slot2),
    maksPercobaan: 3,
    padaPerubahan: () => {
      if (konteks.masihAktif()) lukis();
    }
  });

  async function putarAudioSlot(daftarAudio) {
    const daftarId = pilihBentukAudio(daftarAudio, kemajuan.bentukLawan);
    const hasil = await putarAudioModelSesi2(daftarId, unitId, 1);
    if (!konteks.masihAktif()) return;
    pesanAudio = hasil.status === 'penanda'
      ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
      : '';
    lukis();
  }

  function bangunDataLatihanSlot(bagianNo, slotData, bantuanFlag, paksaHasil = '') {
    const hasilFinal = paksaHasil || slotData.hasil || 'tersimpan';
    const slotModel = bagianNo === 1 ? kartu.slot1 : kartu.slot2;
    const kWajibLen = Array.isArray(slotModel.kata_wajib) ? slotModel.kata_wajib.length : 0;
    return {
      jenis: 'latihan',
      unit: nomorUnitDariId(unitId),
      blok: blokId,
      level: 'L3',
      id_item: kartu.id,
      bagian: bagianNo,
      konteks: konteksLayar,
      percobaan: paksaHasil ? slotData.percobaan : Math.max(1, slotData.percobaan),
      hasil: hasilFinal,
      durasi_bicara: paksaHasil ? 0 : slotData.durasi_bicara,
      waktu_mulai_bicara: paksaHasil || slotData.waktu_mulai_bicara == null ? '' : slotData.waktu_mulai_bicara,
      skor_kata_kunci: paksaHasil || slotData.skor_kata_kunci === '' ? '' : slotData.skor_kata_kunci,
      k_wajib: paksaHasil ? '' : (slotData.k_wajib !== '' ? slotData.k_wajib : kWajibLen),
      bantuan_dipakai: bantuanFlag ? 1 : 0
    };
  }

  async function simpanDanKeS34({ dilewatiKeadaan = false, lewatiBagianAktifTeknis = false } = {}) {
    if (sedangSimpan) return;
    sedangSimpan = true;
    lukis();

    const paksaS1 = dilewatiKeadaan ? 'tersimpan' : (lewatiBagianAktifTeknis && (bagianAktif === 1 || !slot1.selesaiDicoba) ? 'dilewati_teknis' : '');
    const paksaS2 = dilewatiKeadaan ? 'tersimpan' : (lewatiBagianAktifTeknis && (bagianAktif === 2 || !slot2.selesaiDicoba) ? 'dilewati_teknis' : '');

    const dataS1 = bangunDataLatihanSlot(1, slot1, bantuanDipakai1, paksaS1);
    const dataS2 = bangunDataLatihanSlot(2, slot2, bantuanDipakai2, paksaS2);

    const durasiTotal = Number(
      (Number(dataS1.durasi_bicara || 0) + Number(dataS2.durasi_bicara || 0)).toFixed(2)
    );
    const mulaiValid = [dataS1.waktu_mulai_bicara, dataS2.waktu_mulai_bicara]
      .filter((v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map(Number);
    const waktuMulaiKartu = mulaiValid.length > 0 ? mulaiValid[0] : '';
    const adaBantuan = bantuanDipakai1 === 1 || bantuanDipakai2 === 1 ? 1 : 0;
    const butirKejadian = `${kartu.id}-P0`;

    const peristiwa = [
      { id_idempoten: buatIdIdempoten(kodeSiswa), jenis: 'latihan', isi: dataS1 },
      { id_idempoten: buatIdIdempoten(kodeSiswa), jenis: 'latihan', isi: dataS2 },
      {
        id_idempoten: buatIdIdempoten(kodeSiswa),
        jenis: 'kejadian',
        isi: {
          tahap: 'UNIT',
          unit: nomorUnitDariId(unitId),
          blok: blokId,
          aspek: 'kartu_bantuan',
          butir: butirKejadian,
          nilai: adaBantuan
        }
      },
      {
        id_idempoten: buatIdIdempoten(kodeSiswa),
        jenis: 'kejadian',
        isi: {
          tahap: 'UNIT',
          unit: nomorUnitDariId(unitId),
          blok: blokId,
          aspek: 'kartu_durasi',
          butir: butirKejadian,
          nilai: durasiTotal
        }
      },
      {
        id_idempoten: buatIdIdempoten(kodeSiswa),
        jenis: 'kejadian',
        isi: {
          tahap: 'UNIT',
          unit: nomorUnitDariId(unitId),
          blok: blokId,
          aspek: 'kartu_mulai',
          butir: butirKejadian,
          nilai: waktuMulaiKartu,
          flag: waktuMulaiKartu === '' ? 'lewati' : ''
        }
      }
    ];

    await kirimAtauAntre('catat', { peristiwa }, `L3 ${kartu.id}`);

    tandaiItemSelesaiLevel(levelState, kartu.id, {
      dilewatiKeadaan,
      alasanLewatiKeadaan: dilewatiKeadaan ? ((kartu.lewati_keadaan && kartu.lewati_keadaan.alasan) || 'keadaan') : '',
      bantuan_dipakai: adaBantuan,
      slot1: {
        hasil: dataS1.hasil,
        percobaan: dataS1.percobaan,
        durasi_bicara: dataS1.durasi_bicara,
        waktu_mulai_bicara: dataS1.waktu_mulai_bicara
      },
      slot2: {
        hasil: dataS2.hasil,
        percobaan: dataS2.percobaan,
        durasi_bicara: dataS2.durasi_bicara,
        waktu_mulai_bicara: dataS2.waktu_mulai_bicara
      }
    });

    levelState.indeksAktif = indeks;
    await perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, kemajuan);
    await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);

    if (konteks.masihAktif()) {
      arahKe('S-34', {
        unit: unitId,
        blok: blokId,
        kartu: kartu.id,
        indeks: String(indeks),
        konteks: konteksLayar
      });
    }
  }

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const slotAktif = bagianAktif === 1 ? slot1 : slot2;
    const modelSlotAktif = bagianAktif === 1 ? kartu.slot1 : kartu.slot2;
    const bantuanTerbukaAktif = bagianAktif === 1 ? bantuanTerbuka1 : bantuanTerbuka2;

    const lblKartu = (ambilTeks('S-33', 'penanda_kartu') || 'Kartu {n} dari {total}')
      .replace('{n}', String(indeks + 1))
      .replace('{total}', String(daftarL3.length));
    const lblPercobaan = (ambilTeks('S-31', 'penanda') || 'Percobaan ke-{n}')
      .replace('{n}', String(slotAktif.percobaan));

    const judulBagian = bagianAktif === 1
      ? (ambilTeks('S-33', 'judul_bagian_1') || 'Bagian 1')
      : (ambilTeks('S-33', 'judul_bagian_2') || 'Bagian 2');
    const langkahTeks = bagianAktif === 1
      ? (modelSlotAktif.instruksiRekam || `Rekam bagian pertama: ${kartu.instruksi || ''}`)
      : (modelSlotAktif.instruksiRekam || 'Sekarang rekam bagian kedua.');

    const lblBantuan = ambilTeks('S-33', 'tombol_bantuan_sesi_2') || 'Bantuan';
    const lblDengarBantuan = ambilTeks('S-33', 'tombol_dengar_bantuan') || 'Dengar contoh bagian ini';
    const lblDengarPemicu = ambilTeks('S-33', 'tombol_dengar_pemicu') || 'Dengar ucapan lawan bicara';
    const lblKembaliB1 = ambilTeks('S-33', 'kembali') || 'Kembali ke bagian pertama';
    const lblLanjutB2 = ambilTeks('S-33', 'tombol_lanjut_bagian2') || 'Lanjut ke bagian kedua';
    const lblLanjutS34 = ambilTeks('S-33', 'tombol_lanjut_s34') || 'Lanjut dengar pasangannya';
    const lblLewatiTeknis = ambilTeks('S-31', 'tombol_lewati_teknis') || 'Lewati latihan (kendala teknis)';
    const lblContohBagian = (ambilTeks('S-33', 'contoh') || 'Contoh bagian {n}').replace('{n}', String(bagianAktif));
    const pesan3Kali = ambilTeks('S-33', 'pesan_3_kali') || 'Tidak apa-apa, kita lanjut ke langkah berikutnya.';

    const { bingkaiHtml, lewatiKeadaanHtml } = renderBingkaiDanLewatiKeadaan(kartu, 's33');
    const penandaHtml = renderPenandaHasilDeteksi({ hasil: slotAktif.penandaTampil, percobaan: slotAktif.percobaan });

    const pilihTemanHtml = kartu.pilih_satu === 'teman' ? `
      <div class="panel-pilihan-sesi">
        <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
          ${escapeHtml(ambilTeks('S-33', 'pilih_ikon_teman') || 'Pilih temanmu')}
        </p>
        ${renderPemilihBentukLawan(blokData, bentuk, { paksaTampil: true })}
      </div>
    ` : '';

    // R-24: Model bagian 2 TIDAK boleh tampil sebelum siswa mencoba bagian 2 (atau membuka Bantuan secara eksplisit)
    const sudahCobaSlotAktif = slotAktif.selesaiDicoba || (slotAktif.menungguMandiri && slotAktif.sudahRekam);
    const bolehTampilModelAktif = bagianAktif === 1
      ? (bantuanTerbuka1 || sudahCobaSlotAktif)
      : (bantuanTerbuka2 || (sudahCobaSlotAktif && (slotAktif.percobaan > 0 || slotAktif.sudahRekam)));

    const teksModelAktif = pilihBentukTeks(modelSlotAktif.model, bentuk);
    const teksPemicuAktif = modelSlotAktif.pemicuTeks ? pilihBentukTeks(modelSlotAktif.pemicuTeks, bentuk) : '';
    const responAwalTeks = bagianAktif === 1 && kartu.respons_awal ? pilihBentukTeks(kartu.respons_awal, bentuk) : '';

    const kotakBantuanAtauContohHtml = bolehTampilModelAktif ? `
      <div class="pesan-hangat" role="status">
        <p class="pesan-hangat__judul">${escapeHtml(lblContohBagian)}</p>
        ${(!slotAktif.menungguMandiri && slotAktif.selesaiDicoba && slotAktif.hasil === 'tidak' && slotAktif.percobaan >= 3)
          ? `<p class="pesan-hangat__isi">${escapeHtml(pesan3Kali)}</p>`
          : ''}
        <p class="teks-arab teks-arab--tengah" lang="ar" dir="rtl" style="margin: var(--jarak-2) 0;">
          ${escapeHtml(teksModelAktif)}
        </p>
        ${modelSlotAktif.audio ? `
          <button type="button" id="s33-tombol-dengar-bantuan" class="tombol tombol--sekunder">
            &#128266; ${escapeHtml(lblDengarBantuan)}
          </button>
        ` : ''}
      </div>
    ` : '';

    const kotakMandiriHtml = slotAktif.menungguMandiri ? renderKotakModeMandiri({
      pertanyaan: ambilTeks('S-31', 'mode_mandiri') || 'Sudah mirip dengan contoh?',
      pilihanAktif: slotAktif.pilihanMandiri,
      keterangan: ambilTeks('S-31', 'keterangan_mandiri'),
      idPrefix: `s33-b${bagianAktif}-mandiri`
    }) : '';

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-33', { levelAktif: 3, tanpaPemilihBentuk: kartu.pilih_satu === 'teman' })}

        <article class="kartu-arab" aria-label="${escapeHtml(kartu.fungsi || 'Kartu Level 3')}">
          ${bingkaiHtml}

          <div class="kartu-arab__kepala">
            <div>
              <span class="kartu-unit__nomor">${escapeHtml(lblKartu)}</span>
              <h2 class="subjudul-layar" style="margin: 2px 0 0 0;">${escapeHtml(kartu.fungsi || '')}</h2>
            </div>
            <span class="kartu-arab__label">${escapeHtml(judulBagian)}</span>
          </div>

          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(kartu.instruksi || '')}</p>
          ${pilihTemanHtml}

          <div class="kartu-arab__kotak-kalimat" style="display: flex; flex-direction: column; gap: var(--jarak-3);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--jarak-2); flex-wrap: wrap;">
              <span class="kartu-arab__label">${escapeHtml(judulBagian)}</span>
              ${slotAktif.percobaan > 0 ? `<span class="kartu-arab__label">${escapeHtml(lblPercobaan)}</span>` : ''}
            </div>

            <p class="teks-instruksi" style="margin: 0; font-weight: 600;">${escapeHtml(langkahTeks)}</p>

            ${responAwalTeks ? `
              <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(responAwalTeks)}</p>
            ` : ''}

            ${(modelSlotAktif.pemicuAudio || teksPemicuAktif) ? `
              <div class="panel-pilihan-sesi">
                ${teksPemicuAktif ? `<p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(teksPemicuAktif)}</p>` : ''}
                ${modelSlotAktif.pemicuAudio ? `
                  <button type="button" id="s33-tombol-dengar-pemicu" class="tombol tombol--sekunder">
                    &#128266; ${escapeHtml(lblDengarPemicu)}
                  </button>
                ` : ''}
              </div>
            ` : ''}

            ${!bantuanTerbukaAktif && !sudahCobaSlotAktif ? `
              <button type="button" id="s33-tombol-bantuan" class="tombol tombol--sekunder">
                ${escapeHtml(lblBantuan)}
              </button>
            ` : ''}

            ${renderKotakRekamSesi2({
              statusRekam: slotAktif.statusRekam,
              sudahRekam: slotAktif.sudahRekam,
              bolehRekam: true,
              pesanStatus: slotAktif.pesanStatus,
              idPrefix: 's33'
            })}

            ${penandaHtml}
            ${pesanAudio ? `<p class="teks-keterangan" role="status" style="margin: 0;">${escapeHtml(pesanAudio)}</p>` : ''}
            ${kotakBantuanAtauContohHtml}
            ${kotakMandiriHtml}
          </div>

          <div class="baris-tombol">
            ${bagianAktif === 1 && slot1.selesaiDicoba ? `
              <button type="button" id="s33-ke-bagian-2" class="tombol tombol--utama">
                ${escapeHtml(lblLanjutB2)}
              </button>
            ` : ''}
            ${bagianAktif === 2 && slot2.selesaiDicoba ? `
              <button type="button" id="s33-tombol-lanjut" class="tombol tombol--utama" ${sedangSimpan ? 'disabled' : ''}>
                ${escapeHtml(lblLanjutS34)}
              </button>
            ` : ''}
            ${bagianAktif === 2 ? `
              <button type="button" id="s33-kembali-bagian-1" class="tombol tombol--sekunder" ${slotAktif.statusRekam === 'merekam' ? 'disabled' : ''}>
                &larr; ${escapeHtml(lblKembaliB1)}
              </button>
            ` : ''}
            ${lewatiKeadaanHtml}
            <button type="button" id="s33-tombol-lewati-teknis" class="tombol tombol--sekunder" ${sedangSimpan ? 'disabled' : ''}>
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

    const btnBantuan = wadah.querySelector('#s33-tombol-bantuan');
    if (btnBantuan) {
      btnBantuan.addEventListener('click', () => {
        if (bagianAktif === 1) {
          bantuanTerbuka1 = true;
          bantuanDipakai1 = 1;
        } else {
          bantuanTerbuka2 = true;
          bantuanDipakai2 = 1;
        }
        lukis();
      });
    }

    const btnDengarBantuan = wadah.querySelector('#s33-tombol-dengar-bantuan');
    if (btnDengarBantuan) {
      btnDengarBantuan.addEventListener('click', () => {
        const modelSlot = bagianAktif === 1 ? kartu.slot1 : kartu.slot2;
        if (modelSlot && modelSlot.audio) putarAudioSlot(modelSlot.audio);
      });
    }

    const btnDengarPemicu = wadah.querySelector('#s33-tombol-dengar-pemicu');
    if (btnDengarPemicu) {
      btnDengarPemicu.addEventListener('click', () => {
        const modelSlot = bagianAktif === 1 ? kartu.slot1 : kartu.slot2;
        if (modelSlot && modelSlot.pemicuAudio) putarAudioSlot(modelSlot.pemicuAudio);
      });
    }

    const btnRekam = wadah.querySelector('#s33-tombol-rekam');
    if (btnRekam) btnRekam.addEventListener('click', () => pengendaliRekam.toggleRekam());

    const btnSuaraku = wadah.querySelector('#s33-tombol-dengar-suaraku');
    if (btnSuaraku) {
      btnSuaraku.addEventListener('click', () => {
        const slotAktif = bagianAktif === 1 ? slot1 : slot2;
        pemutarSuaraku.putar(slotAktif.kunciRekam);
      });
    }

    wadah.querySelectorAll('[data-pilihan-mandiri]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pil = btn.getAttribute('data-pilihan-mandiri');
        const slotAktif = bagianAktif === 1 ? slot1 : slot2;
        pengendaliRekam.pilihMandiri(slotAktif, pil, { id_item: kartu.id, bagian: bagianAktif, level: 'L3' });
      });
    });

    const btnKeB2 = wadah.querySelector('#s33-ke-bagian-2');
    if (btnKeB2) {
      btnKeB2.addEventListener('click', () => {
        hentikanAudioModel();
        pemutarSuaraku.hentikan();
        pesanAudio = '';
        bagianAktif = 2;
        lukis();
      });
    }

    const btnKembaliB1 = wadah.querySelector('#s33-kembali-bagian-1');
    if (btnKembaliB1) {
      btnKembaliB1.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) return;
        hentikanAudioModel();
        pemutarSuaraku.hentikan();
        pesanAudio = '';
        bagianAktif = 1;
        lukis();
      });
    }

    const btnLanjut = wadah.querySelector('#s33-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => simpanDanKeS34());
    }

    const btnLewatiKeadaan = wadah.querySelector('#s33-lewati-keadaan');
    if (btnLewatiKeadaan) {
      btnLewatiKeadaan.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        simpanDanKeS34({ dilewatiKeadaan: true });
      });
    }

    const btnLewatiTeknis = wadah.querySelector('#s33-tombol-lewati-teknis');
    if (btnLewatiTeknis) {
      btnLewatiTeknis.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        simpanDanKeS34({ lewatiBagianAktifTeknis: true });
      });
    }
  }

  lukis();
}
