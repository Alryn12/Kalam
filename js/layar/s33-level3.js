/**
 * Layar S-33: Level 3 · Kunci (Konteks Sesi 2 & Sesi 3 Putaran 1-3) (situs/js/layar/s33-level3.js)
 * Tugas M1-I (TB-M1-09, TB-M1-10) & M2-A (TB-M2-02)
 * Acuan: SRS-3 FR-022, FR-071, FR-072, FR-074, FR-083; BP-1 S-33 & Bagian C;
 *        BP-4 R-22..R-28, R-30..R-38; BP-5 K-10..K-18, K-35, K-36, K-45, K-47;
 *        DESAIN.md (.penghitung-santai); KEPUTUSAN.md SL-BARU-03, SL-BARU-10
 */

import { ambilRekamanLatihan } from '../antrean.js';
import { hentikanAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks, buatIdIdempoten } from '../state.js';
import {
  buatPengelolaModeMandiri,
  cekDukunganPengenalanSuara
} from '../suara.js';
import {
  antrekanUnggahAudio,
  blobKeBase64,
  catatKendalaTeknis,
  escapeHtml,
  kirimAtauAntre
} from './tahap0-bantu.js';
import {
  ambilKemajuanSesi2,
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
import {
  apakahSlotP3SudahDiantrekan,
  siapkanKonteksSesi3,
  simpanKemajuanSesi3,
  susunRangkaianFinalSesi3
} from './sesi3-bantu.js';

function buatPengelolaMandiriSesi3(konteksS3, putaranNo) {
  const { state, kodeSiswa, unitId, kemajuanS3 } = konteksS3;
  const st = state.status_server || {};
  let dukunganOverride;
  if (st.dukungan_pengenalan_suara !== undefined && st.dukungan_pengenalan_suara !== '') {
    dukunganOverride = Number(st.dukungan_pengenalan_suara) === 1 ? 1 : 0;
  }
  if (Number(st.mode_penilaian_mandiri || 0) === 1) {
    dukunganOverride = 0;
  }
  const cekBrowser = cekDukunganPengenalanSuara();
  const dukunganFinal = dukunganOverride === 0 ? 0 : cekBrowser.dukungan_pengenalan_suara;
  const paksa = Boolean(kemajuanS3.modeMandiri || kemajuanS3.konflikSpeechPermanen);

  return buatPengelolaModeMandiri({
    dukunganPengenalanSuara: dukunganFinal,
    paksaMandiri: paksa,
    alasanAwal: kemajuanS3.konflikSpeechPermanen
      ? 'konflik_rekam_speech'
      : (kemajuanS3.modeMandiri ? 'hasil_kosong_2x' : (dukunganFinal === 0 ? 'tanpa_dukungan_speech' : null)),
    onKendala: ({ jenis_kendala }) => {
      catatKendalaTeknis(jenis_kendala, `S-33-P${putaranNo}`);
      if (jenis_kendala === 'konflik_rekam_pengenalan_suara') {
        kemajuanS3.konflikSpeechPermanen = true;
      }
      kemajuanS3.modeMandiri = true;
      simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3).catch(() => {});
    },
    onPerubahanMode: () => {
      kemajuanS3.modeMandiri = true;
      simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3).catch(() => {});
    }
  });
}

export async function renderS33({ param = {} } = {}) {
  const konteksLayar = String((param && param.konteks) || 'sesi2').trim().toLowerCase();
  const adalahSesi3 = ['p1', 'p2', 'p3'].includes(konteksLayar);
  const putaranNo = adalahSesi3 ? Number(konteksLayar.slice(1)) : 0;

  let konteks = null;
  let konteksS3 = null;
  let kodeSiswa = 'tamu';
  let unitId = 'U1';
  let blokId = '';
  let blokData = null;
  let daftarKartu = [];
  let indeks = 0;
  let kartu = null;
  let itemRangkaian = null;
  let pengelolaMandiri = null;
  let bentukAwal = 'putra';

  if (adalahSesi3) {
    konteksS3 = await siapkanKonteksSesi3('S-33', param, {
      judulLayar: ambilTeks('S-33', 'judul_putaran', { n: putaranNo }) || `Putaran ${putaranNo}`
    });
    if (!konteksS3) return;
    konteks = konteksS3;
    kodeSiswa = konteksS3.kodeSiswa;
    unitId = konteksS3.unitId;

    const { muhimmah, petaKartuL3, kemajuanS3, state } = konteksS3;
    if (!Array.isArray(kemajuanS3.rangkaian) || kemajuanS3.rangkaian.length === 0) {
      kemajuanS3.rangkaian = susunRangkaianFinalSesi3(muhimmah, petaKartuL3, kemajuanS3.ikonTeman);
    }
    daftarKartu = kemajuanS3.rangkaian;
    if (daftarKartu.length === 0) {
      arahKe('S-40', { unit: unitId });
      return;
    }

    if (param.item !== undefined && param.item !== '') {
      const idxParam = Number(param.item);
      indeks = !Number.isNaN(idxParam) && Number.isInteger(idxParam) && idxParam >= 0 && idxParam < daftarKartu.length
        ? idxParam
        : 0;
    } else if (kemajuanS3.sedangBerjalan && Number(kemajuanS3.putaranAktif) === putaranNo) {
      indeks = Math.min(Math.max(0, Number(kemajuanS3.indeksKartuAktif || 0)), daftarKartu.length - 1);
    } else {
      indeks = 0;
    }

    kemajuanS3.sedangBerjalan = true;
    kemajuanS3.s12Sesi3Sudah = true;
    kemajuanS3.putaranAktif = putaranNo;
    kemajuanS3.indeksKartuAktif = indeks;
    await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);

    itemRangkaian = daftarKartu[indeks];
    const entriPeta = petaKartuL3[String(itemRangkaian.id_kartu).toUpperCase()];
    if (!entriPeta || !entriPeta.kartu) {
      arahKe('S-40', { unit: unitId });
      return;
    }

    kartu = normalisasiKartuL3(entriPeta.kartu);
    blokId = itemRangkaian.blok_id || entriPeta.blokId;
    blokData = entriPeta.blokData;
    pengelolaMandiri = buatPengelolaMandiriSesi3(konteksS3, putaranNo);

    const bentukGuru = (state.status_server && state.status_server.konfig_publik &&
      state.status_server.konfig_publik.bentuk_sapaan_guru) === 'putri' ? 'putri' : 'putra';
    bentukAwal = itemRangkaian.pilih_satu === 'teman' || kartu.pilih_satu === 'teman'
      ? kemajuanS3.ikonTeman
      : bentukGuru;
  } else {
    konteks = await siapkanKonteksSesi2('S-33', param, { minLevel: 3 });
    if (!konteks) return;
    kodeSiswa = konteks.kodeSiswa;
    unitId = konteks.unitId;
    blokId = konteks.blokId;
    blokData = konteks.blokData;
    const daftarL3 = Array.isArray(blokData.l3) ? blokData.l3 : [];
    if (daftarL3.length === 0) {
      arahKe('S-35', { unit: unitId, blok: blokId, level: 3 });
      return;
    }
    const levelState = konteks.kemajuan.level[3];
    indeks = tentukanIndeksLanjutLevel(daftarL3, levelState, param);
    await simpanKemajuanSesi2(kodeSiswa, blokId, konteks.kemajuan);
    daftarKartu = daftarL3;
    kartu = normalisasiKartuL3(daftarL3[indeks]);
    pengelolaMandiri = buatPengelolaMandiriSesi2(konteks, 3, 'S-33');
    bentukAwal = konteks.kemajuan.bentukLawan;
  }

  const pemutarSuaraku = buatPemutarRekamanLokal();
  const prefikRekam = adalahSesi3
    ? `s33_${kodeSiswa}_${unitId}_${konteksLayar}_${kartu.id}`
    : `s33_${kodeSiswa}_${blokId}_${kartu.id}`;
  const kunciSlot1 = `${prefikRekam}_S1`;
  const kunciSlot2 = `${prefikRekam}_S2`;

  const slot1 = buatStateSlotRekam(kunciSlot1, kartu.slot1);
  const slot2 = buatStateSlotRekam(kunciSlot2, kartu.slot2);

  if (!adalahSesi3) {
    const [rek1, rek2] = await Promise.all([
      ambilRekamanLatihan(kunciSlot1).catch(() => null),
      ambilRekamanLatihan(kunciSlot2).catch(() => null)
    ]);
    if (rek1 && rek1.blob) slot1.sudahRekam = true;
    if (rek2 && rek2.blob) slot2.sudahRekam = true;
    if (!konteks.masihAktif()) return;
  }

  // Penghitung waktu per kartu (K-36: dimulai ulang untuk kartu ini saat dibuka kembali)
  const waktuKartuMulaiMs = Date.now();
  let detikSantai = 0;

  let bagianAktif = 1;
  // R-32: Putaran 1 menampilkan teks Arab & petunjuk penuh; P2/P3 & Sesi 2 tersembunyi di awal
  let bantuanDipakai1 = putaranNo === 1 ? 1 : 0;
  let bantuanDipakai2 = putaranNo === 1 ? 1 : 0;
  let bantuanTerbuka1 = putaranNo === 1;
  let bantuanTerbuka2 = putaranNo === 1;
  let pesanAudio = '';
  let sedangSimpan = false;

  if (adalahSesi3 && putaranNo === 3) {
    const intervalSantai = setInterval(() => {
      if (!konteks.masihAktif()) return;
      detikSantai = Math.floor((Date.now() - waktuKartuMulaiMs) / 1000);
      const el = konteks.wadah.querySelector('#s33-penghitung-santai');
      if (el) {
        el.textContent = ambilTeks('S-33', 'penghitung_p3', { detik: detikSantai }) ||
          `Waktumu: ${detikSantai} detik`;
      }
    }, 250);
    konteks.saatKeluar(() => clearInterval(intervalSantai));
  }

  const pengendaliRekam = buatPengendaliRekamSesi2({
    konteks,
    idLayar: 'S-33',
    pengelolaMandiri,
    pemutarSuaraku,
    dapatkanSlotAktif: () => (bagianAktif === 1 ? slot1 : slot2),
    maksPercobaan: adalahSesi3 ? 0 : 3,
    modeSesi3: adalahSesi3,
    padaPerubahan: () => {
      if (konteks.masihAktif()) lukis();
    }
  });

  function bentukSaatIni() {
    if (adalahSesi3) return bentukAwal;
    return konteks.kemajuan.bentukLawan;
  }

  async function putarAudioSlot(daftarAudio) {
    const daftarId = pilihBentukAudio(daftarAudio, bentukSaatIni());
    const hasil = await putarAudioModelSesi2(daftarId, unitId, 1);
    if (!konteks.masihAktif()) return;
    pesanAudio = hasil.status === 'penanda'
      ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
      : '';
    lukis();
  }

  function bangunDataLatihanSlot(bagianNo, slotData, bantuanFlag, waktuKartuDetik, paksaHasil = '') {
    const hasilFinal = paksaHasil || slotData.hasil || 'tersimpan';
    const slotModel = bagianNo === 1 ? kartu.slot1 : kartu.slot2;
    const kWajibLen = Array.isArray(slotModel.kata_wajib) ? slotModel.kata_wajib.length : 0;
    const data = {
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
    if (konteksLayar === 'p3') {
      data.waktu_kartu = waktuKartuDetik;
    }
    return data;
  }

  async function antrekanSlotP3JikaPertama(bagianNo, slotData, dataLatihan) {
    if (!adalahSesi3 || putaranNo !== 3) return;
    const { state, kemajuanS3 } = konteksS3;
    const sudahAda = await apakahSlotP3SudahDiantrekan(state, kemajuanS3, unitId, kartu.id, bagianNo);
    if (sudahAda) return;

    const rek = await ambilRekamanLatihan(slotData.kunciRekam).catch(() => null);
    if (!rek || !rek.blob) return;

    let base64 = '';
    try {
      base64 = await blobKeBase64(rek.blob);
    } catch (_) {
      return;
    }
    if (!base64 || base64.length > 400 * 1024) return;

    const noUnit = nomorUnitDariId(unitId);
    const durasiTotal = Number((rek.durasi || slotData.durasi_total || dataLatihan.durasi_bicara || 0).toFixed(2));
    await antrekanUnggahAudio(
      {
        jenis: 'P3',
        unit: noUnit,
        id_kartu: kartu.id,
        bagian: bagianNo,
        mime: rek.mime || slotData.mime || 'audio/webm',
        durasi_total: durasiTotal,
        flag: '',
        metrik: {
          durasi_bersuara_20: Number(dataLatihan.durasi_bicara || 0),
          durasi_bersuara_tambahan: 0,
          waktu_mulai_bicara: dataLatihan.waktu_mulai_bicara === '' ? null : Number(dataLatihan.waktu_mulai_bicara),
          dilewati: 0,
          jumlah_ulang: Math.max(0, Number(dataLatihan.percobaan || 1) - 1),
          batas_detik: 15
        },
        base64
      },
      `Putaran 3 Unit ${noUnit} · ${kartu.id} S${bagianNo}`
    );

    if (!kemajuanS3.slotP3Diantrekan) kemajuanS3.slotP3Diantrekan = {};
    kemajuanS3.slotP3Diantrekan[`${kartu.id}_S${bagianNo}`] = true;
  }

  async function simpanDanKeS34({ dilewatiKeadaan = false, lewatiBagianAktifTeknis = false } = {}) {
    if (sedangSimpan) return;
    sedangSimpan = true;
    lukis();

    const waktuKartuDetik = Number(Math.max(0.5, (Date.now() - waktuKartuMulaiMs) / 1000).toFixed(1));
    const paksaS1 = dilewatiKeadaan ? 'tersimpan' : (lewatiBagianAktifTeknis && (bagianAktif === 1 || !slot1.selesaiDicoba) ? 'dilewati_teknis' : '');
    const paksaS2 = dilewatiKeadaan ? 'tersimpan' : (lewatiBagianAktifTeknis && (bagianAktif === 2 || !slot2.selesaiDicoba) ? 'dilewati_teknis' : '');

    const dataS1 = bangunDataLatihanSlot(1, slot1, bantuanDipakai1, waktuKartuDetik, paksaS1);
    const dataS2 = bangunDataLatihanSlot(2, slot2, bantuanDipakai2, waktuKartuDetik, paksaS2);

    const durasiTotal = Number(
      (Number(dataS1.durasi_bicara || 0) + Number(dataS2.durasi_bicara || 0)).toFixed(2)
    );
    const mulaiValid = [dataS1.waktu_mulai_bicara, dataS2.waktu_mulai_bicara]
      .filter((v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map(Number);
    const waktuMulaiKartu = mulaiValid.length > 0 ? mulaiValid[0] : '';
    const adaBantuan = bantuanDipakai1 === 1 || bantuanDipakai2 === 1 ? 1 : 0;
    const butirKejadian = adalahSesi3 ? `${kartu.id}-P${putaranNo}` : `${kartu.id}-P0`;

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

    await kirimAtauAntre('catat', { peristiwa }, `L3 ${kartu.id}${adalahSesi3 ? ` (P${putaranNo})` : ''}`);

    if (adalahSesi3) {
      const { kemajuanS3 } = konteksS3;
      if (!kemajuanS3.catatanPutaran) kemajuanS3.catatanPutaran = { 1: {}, 2: {}, 3: {} };
      if (!kemajuanS3.catatanPutaran[putaranNo]) kemajuanS3.catatanPutaran[putaranNo] = {};
      kemajuanS3.catatanPutaran[putaranNo][kartu.id] = {
        selesai: true,
        waktu_kartu: waktuKartuDetik,
        durasi_bicara: durasiTotal,
        bantuan_dipakai: adaBantuan,
        waktu_mulai_bicara: waktuMulaiKartu
      };

      // FR-022 & R-36: Putaran 3 pertama per unit per slot diantrekan unggah
      if (putaranNo === 3 && !dilewatiKeadaan && !lewatiBagianAktifTeknis) {
        await antrekanSlotP3JikaPertama(1, slot1, dataS1);
        await antrekanSlotP3JikaPertama(2, slot2, dataS2);
      }

      // FR-075 & SL-BARU-03: Putaran 3 ikut memperbarui Aku Bisa lokal tanpa pernah mencabut kunci yang sudah 1
      if (putaranNo === 3 && blokData) {
        const kemBlok = await ambilKemajuanSesi2(kodeSiswa, blokId);
        tandaiItemSelesaiLevel(kemBlok.level[3], kartu.id, {
          dilewatiKeadaan,
          bantuan_dipakai: adaBantuan,
          slot1: { hasil: dataS1.hasil, percobaan: dataS1.percobaan, durasi_bicara: dataS1.durasi_bicara, waktu_mulai_bicara: dataS1.waktu_mulai_bicara },
          slot2: { hasil: dataS2.hasil, percobaan: dataS2.percobaan, durasi_bicara: dataS2.durasi_bicara, waktu_mulai_bicara: dataS2.waktu_mulai_bicara }
        });
        await perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, kemBlok);
        await simpanKemajuanSesi2(kodeSiswa, blokId, kemBlok);
      }

      await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
    } else {
      const levelState = konteks.kemajuan.level[3];
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
      await perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, konteks.kemajuan);
      await simpanKemajuanSesi2(kodeSiswa, blokId, konteks.kemajuan);
    }

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

  function renderKepalaSesi3() {
    const lblKembali = ambilTeks('S-40', 'tombol_kembali_unit') || 'Kembali ke pengantar Sesi 3';
    const judulPutaran = ambilTeks('S-33', 'judul_putaran', { n: putaranNo }) || `Putaran ${putaranNo} dari 3`;
    const pesanPutaran = ambilTeks('S-33', `pesan_putaran_${putaranNo}`) || '';
    const teksPenghitung = ambilTeks('S-33', 'penghitung_p3', { detik: detikSantai }) ||
      `Waktumu: ${detikSantai} detik`;

    return `
      <section class="kartu" aria-labelledby="judul-layar-s33-s3">
        <div class="daftar-status" style="justify-content: space-between; align-items: center;">
          <button type="button" id="s33-kembali-s40" class="tautan-aksi" style="width: auto; padding-inline: 0; background: transparent; border: none; cursor: pointer;">
            &larr; ${escapeHtml(lblKembali)}
          </button>
          <span class="kartu-arab__label">Sesi 3 · Unit ${nomorUnitDariId(unitId)}</span>
        </div>
        <div class="daftar-status" style="justify-content: space-between; align-items: center;">
          <h1 id="judul-layar-s33-s3" class="judul-layar" style="margin: 0;">${escapeHtml(judulPutaran)}</h1>
          ${putaranNo === 3 ? `
            <span id="s33-penghitung-santai" class="penghitung-santai" role="timer" aria-live="off">
              ${escapeHtml(teksPenghitung)}
            </span>
          ` : ''}
        </div>
        ${pesanPutaran ? `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(pesanPutaran)}</p>` : ''}
      </section>
    `;
  }

  function lukis() {
    const bentuk = bentukSaatIni();
    const slotAktif = bagianAktif === 1 ? slot1 : slot2;
    const modelSlotAktif = bagianAktif === 1 ? kartu.slot1 : kartu.slot2;
    const bantuanTerbukaAktif = bagianAktif === 1 ? bantuanTerbuka1 : bantuanTerbuka2;

    const lblKartu = (ambilTeks('S-33', 'penanda_kartu') || 'Kartu {n} dari {total}')
      .replace('{n}', String(indeks + 1))
      .replace('{total}', String(daftarKartu.length));
    const lblPercobaan = (ambilTeks('S-31', 'penanda') || 'Percobaan ke-{n}')
      .replace('{n}', String(slotAktif.percobaan));

    const judulBagian = bagianAktif === 1
      ? (ambilTeks('S-33', 'judul_bagian_1') || 'Bagian 1')
      : (ambilTeks('S-33', 'judul_bagian_2') || 'Bagian 2');
    const langkahTeks = bagianAktif === 1
      ? (modelSlotAktif.instruksiRekam || `Rekam bagian pertama: ${kartu.instruksi || ''}`)
      : (modelSlotAktif.instruksiRekam || 'Sekarang rekam bagian kedua.');

    const lblBantuan = adalahSesi3
      ? (ambilTeks('S-33', 'tombol_petunjuk_sesi_3') || 'Lihat petunjuk')
      : (ambilTeks('S-33', 'tombol_bantuan_sesi_2') || 'Bantuan');
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

    const pilihTemanHtml = (!adalahSesi3 && kartu.pilih_satu === 'teman') ? `
      <div class="panel-pilihan-sesi">
        <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
          ${escapeHtml(ambilTeks('S-33', 'pilih_ikon_teman') || 'Pilih temanmu')}
        </p>
        ${renderPemilihBentukLawan(blokData, bentuk, { paksaTampil: true })}
      </div>
    ` : '';

    // R-24 & R-32..34: Putaran 1 selalu tampil penuh; Putaran 2/3 & Sesi 2 tersembunyi hingga dibuka/dicoba
    const sudahCobaSlotAktif = slotAktif.selesaiDicoba || (slotAktif.menungguMandiri && slotAktif.sudahRekam);
    const bolehTampilModelAktif = putaranNo === 1
      ? true
      : (bagianAktif === 1
        ? (bantuanTerbuka1 || sudahCobaSlotAktif)
        : (bantuanTerbuka2 || (sudahCobaSlotAktif && (slotAktif.percobaan > 0 || slotAktif.sudahRekam))));

    const teksModelAktif = pilihBentukTeks(modelSlotAktif.model, bentuk);
    const teksPemicuAktif = modelSlotAktif.pemicuTeks ? pilihBentukTeks(modelSlotAktif.pemicuTeks, bentuk) : '';
    const responAwalTeks = bagianAktif === 1 && kartu.respons_awal ? pilihBentukTeks(kartu.respons_awal, bentuk) : '';

    const kotakBantuanAtauContohHtml = bolehTampilModelAktif ? `
      <div id="s33-kotak-petunjuk" class="pesan-hangat" role="status">
        <p class="pesan-hangat__judul">${escapeHtml(lblContohBagian)}</p>
        ${(!adalahSesi3 && !slotAktif.menungguMandiri && slotAktif.selesaiDicoba && slotAktif.hasil === 'tidak' && slotAktif.percobaan >= 3)
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

    const kepalaHtml = adalahSesi3
      ? renderKepalaSesi3()
      : renderKepalaSesi2(konteks, 'S-33', { levelAktif: 3, tanpaPemilihBentuk: kartu.pilih_satu === 'teman' });

    konteks.wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${kepalaHtml}

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

            ${putaranNo !== 1 && !bantuanTerbukaAktif && !sudahCobaSlotAktif ? `
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
    if (adalahSesi3) {
      const btnKembaliS40 = konteks.wadah.querySelector('#s33-kembali-s40');
      if (btnKembaliS40) {
        btnKembaliS40.addEventListener('click', () => {
          hentikanAudioModel();
          arahKe('S-40', { unit: unitId });
        });
      }
    } else {
      pasangNavigasiSesi2(konteks, () => lukis());
    }

    const btnBantuan = konteks.wadah.querySelector('#s33-tombol-bantuan');
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

    const btnDengarBantuan = konteks.wadah.querySelector('#s33-tombol-dengar-bantuan');
    if (btnDengarBantuan) {
      btnDengarBantuan.addEventListener('click', () => {
        const modelSlot = bagianAktif === 1 ? kartu.slot1 : kartu.slot2;
        if (modelSlot && modelSlot.audio) putarAudioSlot(modelSlot.audio);
      });
    }

    const btnDengarPemicu = konteks.wadah.querySelector('#s33-tombol-dengar-pemicu');
    if (btnDengarPemicu) {
      btnDengarPemicu.addEventListener('click', () => {
        const modelSlot = bagianAktif === 1 ? kartu.slot1 : kartu.slot2;
        if (modelSlot && modelSlot.pemicuAudio) putarAudioSlot(modelSlot.pemicuAudio);
      });
    }

    const btnRekam = konteks.wadah.querySelector('#s33-tombol-rekam');
    if (btnRekam) btnRekam.addEventListener('click', () => pengendaliRekam.toggleRekam());

    const btnSuaraku = konteks.wadah.querySelector('#s33-tombol-dengar-suaraku');
    if (btnSuaraku) {
      btnSuaraku.addEventListener('click', () => {
        const slotAktif = bagianAktif === 1 ? slot1 : slot2;
        pemutarSuaraku.putar(slotAktif.kunciRekam);
      });
    }

    konteks.wadah.querySelectorAll('[data-pilihan-mandiri]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pil = btn.getAttribute('data-pilihan-mandiri');
        const slotAktif = bagianAktif === 1 ? slot1 : slot2;
        pengendaliRekam.pilihMandiri(slotAktif, pil, { id_item: kartu.id, bagian: bagianAktif, level: 'L3', konteks: konteksLayar });
      });
    });

    const btnKeB2 = konteks.wadah.querySelector('#s33-ke-bagian-2');
    if (btnKeB2) {
      btnKeB2.addEventListener('click', () => {
        hentikanAudioModel();
        pemutarSuaraku.hentikan();
        pesanAudio = '';
        bagianAktif = 2;
        lukis();
      });
    }

    const btnKembaliB1 = konteks.wadah.querySelector('#s33-kembali-bagian-1');
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

    const btnLanjut = konteks.wadah.querySelector('#s33-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => simpanDanKeS34());
    }

    const btnLewatiKeadaan = konteks.wadah.querySelector('#s33-lewati-keadaan');
    if (btnLewatiKeadaan) {
      btnLewatiKeadaan.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        simpanDanKeS34({ dilewatiKeadaan: true });
      });
    }

    const btnLewatiTeknis = konteks.wadah.querySelector('#s33-tombol-lewati-teknis');
    if (btnLewatiTeknis) {
      btnLewatiTeknis.addEventListener('click', () => {
        if (pengendaliRekam.sedangAktif()) pengendaliRekam.bersihkan();
        simpanDanKeS34({ lewatiBagianAktifTeknis: true });
      });
    }
  }

  lukis();
}
