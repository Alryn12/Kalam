/**
 * Pembantu Layar Sesi 3 & Muhimmah Sisi Siswa (situs/js/layar/sesi3-bantu.js)
 * Tugas M2-A: TB-M2-01 & TB-M2-02
 * Acuan: SRS-3 FR-022, FR-027..030, FR-065; BP-1 S-33, S-34, S-40..S-43;
 *        BP-4 R-06, R-14, R-30..R-39; BP-5 K-36, K-45..K-47; KEPUTUSAN.md SL-BARU-03
 */

import {
  ambilSemuaAntrean,
  ambilSesi,
  simpanSesi,
  tambahAntrean
} from '../antrean.js';
import { panggilApi } from '../api.js';
import { hentikanAudioModel } from '../audio-model.js';
import {
  muatUnitLengkap,
  normalkanIdUnit
} from '../pemuat-konten.js';
import { arahKe } from '../router.js';
import {
  ambilState,
  ambilTeks,
  buatIdIdempoten,
  muatKontenJson,
  perbaruiStatusServer
} from '../state.js';
import { KATALOG_UNIT_KALAM } from './s02-beranda.js';
import { nomorUnitDariId } from './sesi1-bantu.js';
import {
  ambilKalibrasiLatar,
  siapkanWadahLayar
} from './tahap0-bantu.js';

export function kunciKemajuanSesi3(kodeSiswa, unitId) {
  return `sesi3_${kodeSiswa || 'tamu'}_${normalkanIdUnit(unitId)}`;
}

export function apakahSesi3UnitTerbuka(stServer, unitId) {
  if (!stServer || typeof stServer !== 'object') return true;
  const noUnit = nomorUnitDariId(unitId);
  const unitSelesai = Array.isArray(stServer.unit_selesai) ? stServer.unit_selesai.map(Number) : [];
  const sesi3Terbuka = Array.isArray(stServer.sesi3_terbuka) ? stServer.sesi3_terbuka.map(Number) : [];
  const sesi3Selesai = Array.isArray(stServer.sesi3_selesai) ? stServer.sesi3_selesai.map(Number) : [];
  const blokSelesai = Array.isArray(stServer.blok_selesai) ? stServer.blok_selesai : [];

  if (unitSelesai.includes(noUnit) || sesi3Terbuka.includes(noUnit) || sesi3Selesai.includes(noUnit)) {
    return true;
  }

  const infoUnit = KATALOG_UNIT_KALAM.find((u) => u.no === noUnit);
  if (!infoUnit) return false;
  return infoUnit.blok.filter((b) => b.wajib).every((b) => blokSelesai.includes(b.id));
}

export async function muatKonteksUnitSesi3(unitId, opsi = {}) {
  const unitNormal = normalkanIdUnit(unitId);
  const dataUnit = await muatUnitLengkap(unitNormal, {
    arahkanKeS91: true,
    asal: opsi.asal || 'S-03',
    tujuan: opsi.tujuan || 'S-03',
    unit: unitNormal,
    ...opsi
  });
  if (!dataUnit) return null;

  const petaKartuL3 = {};
  (dataUnit.daftarBlok || []).forEach((blok) => {
    (blok.l3 || []).forEach((kartu) => {
      petaKartuL3[String(kartu.id).toUpperCase()] = {
        kartu,
        blokId: blok.id,
        blokData: blok
      };
    });
  });

  return {
    unitId: unitNormal,
    noUnit: nomorUnitDariId(unitNormal),
    unitInfo: dataUnit.unit,
    muhimmah: dataUnit.muhimmah,
    daftarBlok: dataUnit.daftarBlok,
    petaBlok: dataUnit.blok,
    petaKartuL3
  };
}

export function susunRangkaianFinalSesi3(muhimmahData, petaKartuL3 = {}, ikonTeman = 'putra', rangkaianServer = null) {
  const daftarDasar = Array.isArray(rangkaianServer) && rangkaianServer.length > 0
    ? rangkaianServer
    : ((muhimmahData && muhimmahData.sesi3 && Array.isArray(muhimmahData.sesi3.rangkaian))
      ? muhimmahData.sesi3.rangkaian
      : []);

  const sumberMuhimmah = (muhimmahData && muhimmahData.sesi3 && Array.isArray(muhimmahData.sesi3.rangkaian))
    ? muhimmahData.sesi3.rangkaian
    : [];

  return daftarDasar.map((item, idx) => {
    const cocokSumber = sumberMuhimmah.find((s) =>
      (item.pilih_satu && s.pilih_satu === item.pilih_satu) ||
      s.id_kartu === item.id_kartu ||
      (Array.isArray(s.opsi_kartu) && s.opsi_kartu.includes(item.id_kartu))
    ) || item;

    let idKartuFinal = String(item.id_kartu || '').toUpperCase();
    const pilihSatu = item.pilih_satu || cocokSumber.pilih_satu || null;

    if (pilihSatu === 'teman') {
      const opsi = Array.isArray(cocokSumber.opsi_kartu) && cocokSumber.opsi_kartu.length >= 2
        ? cocokSumber.opsi_kartu
        : ['U1-L3-07', 'U1-L3-08'];
      idKartuFinal = String(ikonTeman === 'putri' ? opsi[1] : opsi[0]).toUpperCase();
    }

    const entriPeta = petaKartuL3[idKartuFinal];
    const judulKartu = (entriPeta && entriPeta.kartu && entriPeta.kartu.fungsi) ||
      item.kartu ||
      cocokSumber.kartu ||
      idKartuFinal;

    return {
      urutan: idx + 1,
      id_kartu: idKartuFinal,
      kartu: judulKartu,
      pilih_satu: pilihSatu,
      prasyarat: item.prasyarat || cocokSumber.prasyarat || null,
      blok_id: (entriPeta && entriPeta.blokId) || ''
    };
  });
}

function buatKemajuanSesi3Bawaan(muhimmahData = null, petaKartuL3 = {}) {
  const st = ambilState().status_server || {};
  const bentukKonfig = (st.konfig_publik && st.konfig_publik.bentuk_sapaan_guru) || 'putra';
  const ikonBawaan = bentukKonfig === 'putri' ? 'putri' : 'putra';
  const rangkaianAwal = muhimmahData ? susunRangkaianFinalSesi3(muhimmahData, petaKartuL3, ikonBawaan) : [];

  return {
    sedangBerjalan: false,
    s12Sesi3Sudah: false,
    ikonTeman: ikonBawaan,
    rangkaian: rangkaianAwal,
    putaranAktif: 1,
    indeksKartuAktif: 0,
    catatanPutaran: { 1: {}, 2: {}, 3: {} },
    slotP3Diantrekan: {},
    rekorPribadiLokal: null,
    ringkasanTerakhir: null,
    kesiapan: '',
    ketegangan_sebelum: '',
    ke_setoran: 1,
    teksArabDibuka: []
  };
}

export async function ambilKemajuanSesi3(kodeSiswa, unitId, muhimmahData = null, petaKartuL3 = {}) {
  const bawaan = buatKemajuanSesi3Bawaan(muhimmahData, petaKartuL3);
  const tersimpan = await ambilSesi(kunciKemajuanSesi3(kodeSiswa, unitId)).catch(() => null);
  if (!tersimpan || typeof tersimpan !== 'object') return bawaan;

  const catatanTersimpan = tersimpan.catatanPutaran || {};
  const ikonFinal = tersimpan.ikonTeman === 'putri' ? 'putri' : (tersimpan.ikonTeman === 'putra' ? 'putra' : bawaan.ikonTeman);
  const rangkaianFinal = Array.isArray(tersimpan.rangkaian) && tersimpan.rangkaian.length > 0
    ? tersimpan.rangkaian
    : (muhimmahData ? susunRangkaianFinalSesi3(muhimmahData, petaKartuL3, ikonFinal) : bawaan.rangkaian);

  return {
    ...bawaan,
    ...tersimpan,
    ikonTeman: ikonFinal,
    rangkaian: rangkaianFinal,
    putaranAktif: [1, 2, 3].includes(Number(tersimpan.putaranAktif)) ? Number(tersimpan.putaranAktif) : 1,
    indeksKartuAktif: Math.max(0, Number(tersimpan.indeksKartuAktif || 0)),
    catatanPutaran: {
      1: { ...(catatanTersimpan[1] || {}) },
      2: { ...(catatanTersimpan[2] || {}) },
      3: { ...(catatanTersimpan[3] || {}) }
    },
    slotP3Diantrekan: { ...(tersimpan.slotP3Diantrekan || {}) },
    teksArabDibuka: Array.isArray(tersimpan.teksArabDibuka) ? tersimpan.teksArabDibuka : []
  };
}

export async function simpanKemajuanSesi3(kodeSiswa, unitId, kemajuan) {
  await simpanSesi(kunciKemajuanSesi3(kodeSiswa, unitId), kemajuan);
}

/**
 * Memeriksa apakah slot P3 pada unit ini sudah pernah diunggah atau berada di antrean lokal (R-36, AC-05-4, K-47)
 */
export async function apakahSlotP3SudahDiantrekan(state, kemajuanS3, unitId, idKartu, bagian) {
  const unitNormal = normalkanIdUnit(unitId);
  const noUnit = nomorUnitDariId(unitNormal);
  const idK = String(idKartu || '').trim().toUpperCase();
  const bag = Number(bagian || 1);
  const kunciSlot = `${idK}_S${bag}`;

  if (kemajuanS3 && kemajuanS3.slotP3Diantrekan && kemajuanS3.slotP3Diantrekan[kunciSlot]) {
    return true;
  }

  const p3Server = state && state.status_server && state.status_server.status_unggah_server &&
    state.status_server.status_unggah_server.P3;
  const daftarUnitSrv = p3Server && Array.isArray(p3Server[unitNormal]) ? p3Server[unitNormal] : [];
  if (daftarUnitSrv.includes(kunciSlot)) {
    return true;
  }

  const antrean = await ambilSemuaAntrean().catch(() => []);
  return antrean.some((item) =>
    item &&
    item.aksi === 'unggah_audio' &&
    item.data &&
    String(item.data.jenis || '').toUpperCase() === 'P3' &&
    Number(item.data.unit || 0) === noUnit &&
    String(item.data.id_kartu || '').toUpperCase() === idK &&
    Number(item.data.bagian || 0) === bag
  );
}

/**
 * Menghitung ringkasan perbandingan diri sendiri (P1 vs P3) untuk S-41 & sesi3_selesai
 */
export function hitungRingkasanSesi3(kemajuanS3) {
  const rangkaian = Array.isArray(kemajuanS3 && kemajuanS3.rangkaian) ? kemajuanS3.rangkaian : [];
  const p1Map = (kemajuanS3 && kemajuanS3.catatanPutaran && kemajuanS3.catatanPutaran[1]) || {};
  const p3Map = (kemajuanS3 && kemajuanS3.catatanPutaran && kemajuanS3.catatanPutaran[3]) || {};

  let totalWaktuP1 = 0;
  let totalWaktuP3 = 0;
  let bantuanP1 = 0;
  let bantuanP3 = 0;

  const daftarKartu = rangkaian.map((item) => {
    const c1 = p1Map[item.id_kartu] || {};
    const c3 = p3Map[item.id_kartu] || {};
    const w1 = Number(c1.waktu_kartu || 0);
    const w3 = Number(c3.waktu_kartu || 0);
    const b1 = c1.bantuan_dipakai !== undefined ? Number(c1.bantuan_dipakai ? 1 : 0) : 1;
    const b3 = Number(c3.bantuan_dipakai ? 1 : 0);

    totalWaktuP1 += w1;
    totalWaktuP3 += w3;
    bantuanP1 += b1;
    bantuanP3 += b3;

    return {
      urutan: item.urutan,
      id_kartu: item.id_kartu,
      kartu: item.kartu,
      waktu_p1: Number(w1.toFixed(1)),
      waktu_p3: Number(w3.toFixed(1)),
      bantuan_p1: b1,
      bantuan_p3: b3
    };
  });

  const nKartu = Math.max(1, daftarKartu.length);
  const totalP1Bulat = Number(totalWaktuP1.toFixed(1));
  const totalP3Bulat = Number(Math.max(0.5, totalWaktuP3).toFixed(1));

  return {
    daftarKartu,
    jumlahKartu: daftarKartu.length,
    totalWaktuP1: totalP1Bulat,
    totalWaktuP3: totalP3Bulat,
    waktuPerKartuP1: Number((totalP1Bulat / nKartu).toFixed(1)),
    waktuPerKartuP3: Number((totalP3Bulat / nKartu).toFixed(1)),
    bantuanP1,
    bantuanP3
  };
}

/**
 * Mengirim aksi sesi3_mulai ke server dengan cadangan antrean & penyusunan rangkaian lokal bila luring/sibuk
 */
export async function kirimSesi3MulaiDenganCadangan({ unitId, pilihanKartuKembar }) {
  const state = ambilState();
  const noUnit = nomorUnitDariId(unitId);
  const muatan = {
    unit: noUnit,
    pilihan_kartu_kembar: pilihanKartuKembar || []
  };
  const idIdempoten = buatIdIdempoten(state.kode_siswa);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  let resp = null;
  if (!offline) {
    resp = await panggilApi('sesi3_mulai', muatan, {
      id_idempoten: idIdempoten,
      tanpaTungguOnline: true
    });
  }

  if (resp && resp.ok && resp.data) {
    if (resp.data.status) {
      await perbaruiStatusServer(resp.data.status);
    }
    return {
      ok: true,
      rangkaian_dipakai: resp.data.rangkaian_dipakai || [],
      status: resp.data.status || state.status_server
    };
  }

  const galat = resp && resp.galat ? resp.galat : 'E_SERVER';
  const belumTerdaftar = galat === 'E_PARAM' && /belum terdaftar/i.test(String((resp && resp.pesan) || ''));
  if (offline || galat === 'E_SERVER' || galat === 'E_SIBUK' || belumTerdaftar) {
    await tambahAntrean({
      id_idempoten: idIdempoten,
      aksi: 'sesi3_mulai',
      kategori: 'ANGKA',
      unit: noUnit,
      data: muatan,
      label: `Mulai Sesi 3 Unit ${noUnit}`,
      status: 'Menunggu',
      percobaan_kirim: offline ? 0 : 1
    });
    return { ok: true, diantrekan: true, rangkaian_dipakai: null };
  }

  return { ok: false, galat, pesan: (resp && resp.pesan) || '' };
}

/**
 * Mengirim aksi sesi3_selesai ke server dengan cadangan antrean & pembaruan status lokal (rekor_pribadi)
 */
export async function kirimSesi3SelesaiDenganCadangan({ unitId, totalWaktuP3, ringkasan }) {
  const state = ambilState();
  const unitNormal = normalkanIdUnit(unitId);
  const noUnit = nomorUnitDariId(unitNormal);
  const waktuFinal = Number(Math.max(0.5, Number(totalWaktuP3 || 0)).toFixed(1));
  const muatan = {
    unit: noUnit,
    total_waktu_p3: waktuFinal,
    ringkasan: ringkasan || {}
  };
  const idIdempoten = buatIdIdempoten(state.kode_siswa);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  let resp = null;
  if (!offline) {
    resp = await panggilApi('sesi3_selesai', muatan, {
      id_idempoten: idIdempoten,
      tanpaTungguOnline: true
    });
  }

  if (resp && resp.ok && resp.data) {
    if (resp.data.status) {
      await perbaruiStatusServer(resp.data.status);
    }
    return {
      ok: true,
      rekor_pribadi: resp.data.rekor_pribadi || {},
      rekor_unit: resp.data.rekor_unit || waktuFinal,
      status: resp.data.status || state.status_server
    };
  }

  const galat = resp && resp.galat ? resp.galat : 'E_SERVER';
  const belumTerdaftar = galat === 'E_PARAM' && /belum terdaftar/i.test(String((resp && resp.pesan) || ''));
  if (offline || galat === 'E_SERVER' || galat === 'E_SIBUK' || belumTerdaftar) {
    await tambahAntrean({
      id_idempoten: idIdempoten,
      aksi: 'sesi3_selesai',
      kategori: 'ANGKA',
      unit: noUnit,
      data: muatan,
      label: `Selesai Sesi 3 Unit ${noUnit}`,
      status: 'Menunggu',
      percobaan_kirim: offline ? 0 : 1
    });

    const stLama = state.status_server || {};
    const sesi3Selesai = Array.isArray(stLama.sesi3_selesai) ? [...stLama.sesi3_selesai] : [];
    if (!sesi3Selesai.includes(noUnit)) sesi3Selesai.push(noUnit);

    const rekorMap = { ...(stLama.rekor_pribadi || {}) };
    const lama = rekorMap[unitNormal];
    const rekorBaru = (lama === undefined || lama === null || lama === '' || isNaN(Number(lama)) || waktuFinal < Number(lama))
      ? waktuFinal
      : Number(lama);
    rekorMap[unitNormal] = rekorBaru;

    const statusBaru = {
      ...stLama,
      sesi3_selesai: sesi3Selesai,
      rekor_pribadi: rekorMap
    };
    await perbaruiStatusServer(statusBaru);
    return {
      ok: true,
      diantrekan: true,
      rekor_pribadi: rekorMap,
      rekor_unit: rekorBaru,
      status: statusBaru
    };
  }

  return { ok: false, galat, pesan: (resp && resp.pesan) || '' };
}

/**
 * Menyiapkan konteks layar Sesi 3 / Muhimmah siswa (S-40..S-43, serta S-33/S-34 konteks p1..p3)
 */
export async function siapkanKonteksSesi3(idLayar, param = {}, opsi = {}) {
  hentikanAudioModel();
  const state = ambilState();
  const unitId = normalkanIdUnit((param && param.unit) || state.unit_aktif || 'U1');
  const noUnit = nomorUnitDariId(unitId);
  state.unit_aktif = unitId;

  const st = state.status_server;
  if (st && typeof st === 'object' && !apakahSesi3UnitTerbuka(st, unitId)) {
    arahKe('S-91', { jenis: 'belum_terbuka', asal: 'S-03', unit: unitId });
    return null;
  }

  const konteksUnit = await muatKonteksUnitSesi3(unitId, {
    asal: 'S-03',
    tujuan: idLayar
  });
  if (!konteksUnit) return null;

  const kodeSiswa = state.kode_siswa || 'tamu';
  const kemajuanS3 = await ambilKemajuanSesi3(
    kodeSiswa,
    unitId,
    konteksUnit.muhimmah,
    konteksUnit.petaKartuL3
  );
  const paramUmum = await muatKontenJson('konten/umum/parameter.json').catch(() => ({}));
  const kalibrasiLatar = await ambilKalibrasiLatar();

  const namaLayar = opsi.judulLayar || ambilTeks(idLayar, 'judul') || idLayar;
  const wadah = siapkanWadahLayar(idLayar, `Unit ${noUnit} — ${namaLayar}`);
  if (!wadah) return null;

  let aktif = true;
  const daftarPembersih = [];
  window.addEventListener('hashchange', () => {
    aktif = false;
    hentikanAudioModel();
    daftarPembersih.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }, { once: true });

  return {
    state,
    kodeSiswa,
    unitId,
    noUnit,
    unitInfo: konteksUnit.unitInfo,
    muhimmah: konteksUnit.muhimmah,
    daftarBlok: konteksUnit.daftarBlok,
    petaBlok: konteksUnit.petaBlok,
    petaKartuL3: konteksUnit.petaKartuL3,
    kemajuanS3,
    paramUmum,
    kalibrasiLatar,
    wadah,
    masihAktif: () => aktif,
    saatKeluar: (fn) => {
      if (typeof fn === 'function') daftarPembersih.push(fn);
    }
  };
}
