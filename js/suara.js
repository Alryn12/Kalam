/**
 * Mesin Deteksi Kata Kunci Arab & Pengelola Mode Penilaian Mandiri (situs/js/suara.js)
 * Tugas M1-H: Bagian dari TB-M1-09
 * Acuan: SRS-3 FR-071, FR-083; BP-4 R-23, R-28; BP-5 K-10, K-11, K-12;
 *        SRS-4 UJ-M0-01, UJ-M0-03; situs/konten/umum/parameter.json
 *
 * ATURAN PRIVASI (FR-071, FR-079, R-28):
 * - Transkrip Web Speech API hanya diproses di memori untuk menghitung skor_kata_kunci
 *   dan langsung dibuang (tidak disimpan di IndexedDB/localStorage dan tidak dikirim ke server).
 */

import { ambilState, ambilTeks } from './state.js';

export const PARAMETER_SUARA_BAWAAN = {
  bahasa: 'ar-SA',
  maks_alternatif: 5,
  ambang_deteksi: 0.5,
  jarak_edit_maks: 1,
  panjang_kata_min_jarak_edit: 4,
  batas_hasil_kosong_ke_mandiri: 2,
  batas_konflik_ke_mandiri: 2,
  mode_mandiri_otomatis_semua_hp: true,
  matikan_pengenalan_suara_di_hp: true
};

/**
 * Mengambil parameter deteksi kata kunci dari state (konten/umum/parameter.json)
 * dengan cadangan nilai bawaan spesifikasi.
 */
export function ambilParameterDeteksi(override = {}) {
  let dariState = {};
  try {
    const st = ambilState();
    if (st && st.parameter && st.parameter.deteksi_kata_kunci) {
      dariState = st.parameter.deteksi_kata_kunci;
    }
  } catch (_) {
    // Abaikan bila dipanggil di luar konteks state penuh
  }
  return Object.assign({}, PARAMETER_SUARA_BAWAAN, dariState, override || {});
}

/**
 * Menormalkan teks Arab sesuai SRS-3 FR-071:
 * 1. Buang harakat (U+064B s.d. U+0652 dan U+0670) serta tatwil (U+0640)
 * 2. Seragamkan variasi Alef (أ إ آ ٱ) -> ا
 * 3. Seragamkan Alif Maqshurah (ى) -> ي
 * 4. Seragamkan Ta Marbutah (ة) -> ه
 * 5. Buang tanda baca dan rapikan spasi
 */
export function normalisasiArab(teks) {
  if (!teks || typeof teks !== 'string') return '';
  return teks
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[،؛؟.,!?:;"'()\[\]\-_\/\\«»…⋯“”‘’—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Menghitung jarak edit Levenshtein antara dua string (FR-071)
 */
export function jarakLevenshtein(a, b) {
  const teksA = String(a || '');
  const teksB = String(b || '');
  if (teksA === teksB) return 0;

  const m = teksA.length;
  const n = teksB.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let barisLalu = new Array(n + 1);
  let barisKini = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) barisLalu[j] = j;

  for (let i = 1; i <= m; i += 1) {
    barisKini[0] = i;
    const chA = teksA[i - 1];
    for (let j = 1; j <= n; j += 1) {
      const biaya = chA === teksB[j - 1] ? 0 : 1;
      barisKini[j] = Math.min(
        barisLalu[j] + 1,
        barisKini[j - 1] + 1,
        barisLalu[j - 1] + biaya
      );
    }
    const tmp = barisLalu;
    barisLalu = barisKini;
    barisKini = tmp;
  }

  return barisLalu[n];
}

/**
 * Memeriksa kecocokan satu kata transkrip terhadap satu kata wajib (FR-071):
 * - Cocok bila sama persis setelah normalisasi kedua sisi
 * - Atau jarak Levenshtein <= jarakEditMaks (1) untuk kata wajib >= minHurufJarakEdit (4) huruf
 * - Mendukung pelepasan awalan "ال" atau "و" jika kata wajib tidak memakainya
 */
export function apakahKataCocok(kataTranskripMentah, kataWajibMentah, opsi = {}) {
  const param = ambilParameterDeteksi();
  const jarakEditMaks = opsi.jarakEditMaks != null ? Number(opsi.jarakEditMaks) : Number(param.jarak_edit_maks);
  const minHurufJarakEdit = opsi.minHurufJarakEdit != null
    ? Number(opsi.minHurufJarakEdit)
    : Number(param.panjang_kata_min_jarak_edit);

  const kt = normalisasiArab(kataTranskripMentah);
  const kw = normalisasiArab(kataWajibMentah);
  if (!kt || !kw) {
    return { cocok: false, jarak: 99, alasan: 'kosong' };
  }

  const kandidatList = [kt];
  if (!kw.startsWith('ال') && kt.startsWith('ال') && kt.length > 2) {
    kandidatList.push(kt.slice(2));
  }
  if (!kw.startsWith('و') && kt.startsWith('و') && kt.length > 2) {
    const tanpaWaw = kt.slice(1);
    kandidatList.push(tanpaWaw);
    if (!kw.startsWith('ال') && tanpaWaw.startsWith('ال') && tanpaWaw.length > 2) {
      kandidatList.push(tanpaWaw.slice(2));
    }
  }

  let jarakTerbaik = 99;
  for (const kand of kandidatList) {
    if (kand === kw) {
      return { cocok: true, jarak: 0, alasan: 'persis' };
    }
    const j = jarakLevenshtein(kand, kw);
    if (j < jarakTerbaik) jarakTerbaik = j;
    if (kw.length >= minHurufJarakEdit && j <= jarakEditMaks) {
      return { cocok: true, jarak: j, alasan: `jarak_edit_${j}` };
    }
  }

  return { cocok: false, jarak: jarakTerbaik, alasan: 'belum_cocok' };
}

/**
 * Mengekstrak daftar kata wajib unik ternormalisasi dari satu ungkapan/kalimat Arab utuh
 * (misalnya kalimat model atau alternatif `diterima[]` pada Level 2).
 */
export function ekstrakKataWajibDariTeks(teksArab) {
  const norm = normalisasiArab(teksArab);
  if (!norm) return [];
  const unik = [];
  const sudah = new Set();
  for (const kata of norm.split(' ')) {
    if (!kata || sudah.has(kata)) continue;
    sudah.add(kata);
    unik.push(kata);
  }
  return unik;
}

/**
 * Menghitung skor kata kunci dari daftar alternatif transkrip Web Speech API (FR-071).
 * Transkrip tidak dikembalikan ke objek pencatatan permanen; hanya ringkasan skor.
 */
export function hitungSkorKataKunci(alternatifList, kataWajibList, ambangDeteksiArg, opsi = {}) {
  const param = ambilParameterDeteksi();
  const ambangDeteksi = ambangDeteksiArg != null
    ? Number(ambangDeteksiArg)
    : Number(param.ambang_deteksi || 0.5);
  const maksAlternatif = opsi.maksAlternatif != null
    ? Number(opsi.maksAlternatif)
    : Number(param.maks_alternatif || 5);

  const kataWajibUnik = [];
  const sudahWajib = new Set();
  for (const kw of (Array.isArray(kataWajibList) ? kataWajibList : [])) {
    const kwNorm = normalisasiArab(String(kw || ''));
    if (!kwNorm || sudahWajib.has(kwNorm)) continue;
    sudahWajib.add(kwNorm);
    kataWajibUnik.push({ asli: String(kw || ''), norm: kwNorm });
  }

  const kWajib = kataWajibUnik.length;
  const syaratMinimal = kWajib > 0 ? Math.max(1, Math.ceil(ambangDeteksi * kWajib)) : 1;

  // Tokenisasi alternatif hanya di memori lokal lalu dibuang setelah fungsi selesai
  const tokenPerAlternatif = (Array.isArray(alternatifList) ? alternatifList : [])
    .slice(0, maksAlternatif)
    .map((alt, idx) => {
      const teksAsli = typeof alt === 'string' ? alt : String((alt && alt.transcript) || '');
      const teksNorm = normalisasiArab(teksAsli);
      return {
        indeks: idx + 1,
        kata_kata: teksNorm ? teksNorm.split(' ') : []
      };
    })
    .filter((a) => a.kata_kata.length > 0);

  const transkripKosong = tokenPerAlternatif.length === 0;
  let skor = 0;
  const rincianKata = [];

  for (const kw of kataWajibUnik) {
    let ditemukan = false;
    let info = null;

    for (const alt of tokenPerAlternatif) {
      for (const kt of alt.kata_kata) {
        const hasil = apakahKataCocok(kt, kw.norm, opsi);
        if (hasil.cocok) {
          ditemukan = true;
          info = {
            alternatif_ke: alt.indeks,
            jarak: hasil.jarak,
            alasan: hasil.alasan
          };
          break;
        }
      }
      if (ditemukan) break;
    }

    if (ditemukan) skor += 1;
    rincianKata.push({
      kata_wajib: kw.norm,
      panjang_huruf: kw.norm.length,
      cocok: ditemukan,
      jarak: info ? info.jarak : null,
      alasan: info ? info.alasan : 'tidak_ditemukan',
      alternatif_ke: info ? info.alternatif_ke : null
    });
  }

  const terdeteksi = kWajib > 0 && skor >= syaratMinimal;

  return {
    skor_kata_kunci: skor,
    k_wajib: kWajib,
    ambang_deteksi: ambangDeteksi,
    syarat_minimal: syaratMinimal,
    terdeteksi,
    transkrip_kosong: transkripKosong,
    rincian_kata: rincianKata
  };
}

/**
 * Mengevaluasi deteksi terhadap item latihan (Level 1 kata_wajib, Level 2 diterima[], atau Level 3 slot).
 */
export function evaluasiDeteksiItem(alternatifList, itemAtauKataWajib, ambangDeteksiArg, opsi = {}) {
  if (Array.isArray(itemAtauKataWajib)) {
    return hitungSkorKataKunci(alternatifList, itemAtauKataWajib, ambangDeteksiArg, opsi);
  }
  const item = itemAtauKataWajib || {};
  if (Array.isArray(item.kata_wajib) && item.kata_wajib.length > 0) {
    return hitungSkorKataKunci(alternatifList, item.kata_wajib, ambangDeteksiArg, opsi);
  }

  const daftarDiterima = Array.isArray(item.diterima) ? item.diterima : [];
  if (daftarDiterima.length > 0) {
    let terbaik = null;
    for (const kalimat of daftarDiterima) {
      const kwList = ekstrakKataWajibDariTeks(kalimat);
      if (kwList.length === 0) continue;
      const hasil = hitungSkorKataKunci(alternatifList, kwList, ambangDeteksiArg, opsi);
      if (!terbaik || (hasil.terdeteksi && !terbaik.terdeteksi) || hasil.skor_kata_kunci > terbaik.skor_kata_kunci) {
        terbaik = hasil;
      }
      if (hasil.terdeteksi && hasil.skor_kata_kunci === hasil.k_wajib) break;
    }
    if (terbaik) return terbaik;
  }

  return hitungSkorKataKunci(alternatifList, [], ambangDeteksiArg, opsi);
}

/**
 * Memeriksa dukungan pengenalan suara perangkat/peramban (FR-005, FR-071, FR-083, K-10, UJ-M0-03).
 */
export function cekDukunganPengenalanSuara(opsi = {}) {
  const param = ambilParameterDeteksi();
  const win = 'windowObj' in opsi
    ? opsi.windowObj
    : (typeof window !== 'undefined' ? window : null);

  let SpeechCtor = null;
  if ('SpeechRecognitionCtor' in opsi) {
    SpeechCtor = opsi.SpeechRecognitionCtor || null;
  } else if (win) {
    SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }

  const tersediaApi = typeof SpeechCtor === 'function';
  const ua = 'userAgent' in opsi
    ? String(opsi.userAgent || '')
    : (typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '');
  const adalahHp = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const matikanDiHp = Boolean(
    param.matikan_pengenalan_suara_di_hp || param.mode_mandiri_otomatis_semua_hp
  );

  if (!tersediaApi) {
    return {
      tersedia_api: false,
      SpeechRecognitionCtor: null,
      dukungan_pengenalan_suara: 0,
      aktif_dipakai: false,
      adalah_hp: adalahHp,
      alasan_mandiri: 'tanpa_dukungan_speech'
    };
  }

  if (adalahHp && matikanDiHp && !opsi.abaikanAturanHp) {
    return {
      tersedia_api: true,
      SpeechRecognitionCtor: SpeechCtor,
      dukungan_pengenalan_suara: 0,
      aktif_dipakai: false,
      adalah_hp: true,
      alasan_mandiri: 'perangkat_hp_mandiri'
    };
  }

  return {
    tersedia_api: true,
    SpeechRecognitionCtor: SpeechCtor,
    dukungan_pengenalan_suara: 1,
    aktif_dipakai: true,
    adalah_hp: adalahHp,
    alasan_mandiri: null
  };
}

/**
 * Pembungkus sesi Web Speech API ar-SA (FR-071) yang hanya menyimpan alternatif di memori lokal
 * lalu mengosongkannya segera setelah dihentikan.
 */
export function jalankanSesiPengenalanSuara(opsi = {}) {
  const param = ambilParameterDeteksi();
  const cek = cekDukunganPengenalanSuara(opsi);
  if (!cek.aktif_dipakai || !cek.SpeechRecognitionCtor) {
    return {
      aktif: false,
      alasan: cek.alasan_mandiri || 'tanpa_dukungan_speech',
      hentikan() {
        return [];
      },
      batalkan() {}
    };
  }

  let alternatifMemori = [];
  let pengenal = null;
  let sedangBerjalan = false;

  try {
    pengenal = new cek.SpeechRecognitionCtor();
    pengenal.lang = opsi.bahasa || param.bahasa || 'ar-SA';
    pengenal.continuous = opsi.continuous !== undefined ? Boolean(opsi.continuous) : true;
    pengenal.interimResults = opsi.interimResults !== undefined ? Boolean(opsi.interimResults) : true;
    pengenal.maxAlternatives = Number(opsi.maxAlternatives || param.maks_alternatif || 5);

    pengenal.onresult = (event) => {
      if (!event || !event.results) return;
      const maksAlt = Number(param.maks_alternatif || 5);
      const kumpulan = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const res = event.results[i];
        if (!res) continue;
        for (let j = 0; j < res.length; j += 1) {
          const alt = res[j];
          if (alt && alt.transcript) {
            kumpulan.push({
              transcript: String(alt.transcript),
              confidence: alt.confidence != null ? Number(alt.confidence) : null
            });
          }
        }
      }
      if (kumpulan.length > 0) {
        alternatifMemori = kumpulan.slice(0, maksAlt);
      }
    };

    pengenal.onerror = (ev) => {
      const jenis = ev && ev.error ? ev.error : '';
      console.info('[Log Teknis Suara] Catatan SpeechRecognition:', jenis || ev);
      if (typeof opsi.onKendalaSpeech === 'function' && (jenis === 'audio-capture' || jenis === 'aborted' || jenis === 'not-allowed' || jenis === 'service-not-allowed')) {
        opsi.onKendalaSpeech({ error: jenis });
      }
    };

    pengenal.start();
    sedangBerjalan = true;
  } catch (err) {
    console.info('[Log Teknis Suara] SpeechRecognition tidak dapat dimulai:', err);
    pengenal = null;
    sedangBerjalan = false;
    alternatifMemori = [];
    return {
      aktif: false,
      alasan: 'kendala_mulai_speech',
      hentikan() {
        return [];
      },
      batalkan() {}
    };
  }

  function tutupDanBuangMemori() {
    if (pengenal && sedangBerjalan) {
      try {
        pengenal.stop();
      } catch (_) {
        // Abaikan jika sudah berhenti
      }
    }
    sedangBerjalan = false;
    const salinan = alternatifMemori.slice();
    alternatifMemori = [];
    pengenal = null;
    return salinan;
  }

  return {
    aktif: true,
    alasan: null,
    hentikan: tutupDanBuangMemori,
    batalkan() {
      alternatifMemori = [];
      tutupDanBuangMemori();
    }
  };
}

/**
 * Pengelola Mode Penilaian Mandiri (FR-083, K-10, K-11, K-12, UJ-M0-03).
 * Mengelola peralihan otomatis tanpa galat apabila:
 * - dukungan_pengenalan_suara = 0 (K-10 / UJ-M0-03)
 * - hasil transkrip kosong 2 kali berturut-turut dalam satu level (K-11)
 * - konflik rekam + pengenalan suara 2 kali berturut-turut (K-12)
 */
export function buatPengelolaModeMandiri(opsi = {}) {
  const param = ambilParameterDeteksi();
  const dukungan = opsi.dukunganPengenalanSuara !== undefined
    ? (Number(opsi.dukunganPengenalanSuara) === 0 || opsi.dukunganPengenalanSuara === false ? 0 : 1)
    : (opsi.dukunganSpeech && typeof opsi.dukunganSpeech === 'object'
      ? (Number(opsi.dukunganSpeech.dukungan_pengenalan_suara) === 1 ? 1 : 0)
      : cekDukunganPengenalanSuara(opsi).dukungan_pengenalan_suara);

  const batasKosong = Number(opsi.batasHasilKosong || param.batas_hasil_kosong_ke_mandiri || 2);
  const batasKonflik = Number(opsi.batasKonflik || param.batas_konflik_ke_mandiri || 2);
  const onKendala = typeof opsi.onKendala === 'function' ? opsi.onKendala : null;
  const onPerubahanMode = typeof opsi.onPerubahanMode === 'function' ? opsi.onPerubahanMode : null;

  const paksaMandiri = Boolean(opsi.paksaMandiri || opsi.mulaiDalamMandiri);
  const aktifSejakAwal = paksaMandiri || dukungan === 0;
  const alasanAwal = paksaMandiri
    ? (opsi.alasanAwal || 'paksa_mandiri')
    : (dukungan === 0 ? (opsi.alasanAwal || 'tanpa_dukungan_speech') : null);

  const stateMandiri = {
    dukungan_pengenalan_suara: dukungan,
    mode_mandiri: aktifSejakAwal,
    alasan_aktif: alasanAwal,
    alasan_permanen: paksaMandiri || dukungan === 0,
    hitung_kosong_berturut: 0,
    hitung_konflik_berturut: 0,
    riwayat_mandiri: []
  };

  function picuAktif(alasan, permanen = false, jenisKendala = '') {
    const baruAktif = !stateMandiri.mode_mandiri;
    stateMandiri.mode_mandiri = true;
    stateMandiri.alasan_aktif = alasan;
    if (permanen) stateMandiri.alasan_permanen = true;
    if (jenisKendala && onKendala) {
      onKendala({ jenis_kendala: jenisKendala, alasan });
    }
    if (baruAktif && onPerubahanMode) {
      onPerubahanMode({ ...stateMandiri });
    }
  }

  return {
    apakahModeMandiri() {
      return stateMandiri.mode_mandiri;
    },

    ambilStatus() {
      return {
        dukungan_pengenalan_suara: stateMandiri.dukungan_pengenalan_suara,
        mode_mandiri: stateMandiri.mode_mandiri,
        alasan_aktif: stateMandiri.alasan_aktif,
        alasan_permanen: stateMandiri.alasan_permanen,
        hitung_kosong_berturut: stateMandiri.hitung_kosong_berturut,
        hitung_konflik_berturut: stateMandiri.hitung_konflik_berturut,
        jumlah_catatan_mandiri: stateMandiri.riwayat_mandiri.length,
        riwayat_mandiri: stateMandiri.riwayat_mandiri.slice()
      };
    },

    aktifkanMandiri(alasan = 'mode_mandiri_aktif', permanen = false) {
      picuAktif(alasan, permanen, '');
      return this.ambilStatus();
    },

    /**
     * Memperbarui penghitung hasil kosong berturut (K-11) dan konflik rekam + speech (K-12)
     */
    catatHasilSpeech({
      transkripKosong = false,
      rekamanSunyiSaatSpeech = false,
      konflikTerjadi = false,
      izinMikrofonAda = true
    } = {}) {
      if (stateMandiri.mode_mandiri) {
        return { beralih_ke_mandiri: false, ...this.ambilStatus() };
      }

      if (konflikTerjadi && izinMikrofonAda) {
        stateMandiri.hitung_konflik_berturut = Math.max(batasKonflik, stateMandiri.hitung_konflik_berturut + 1);
        stateMandiri.hitung_kosong_berturut = 0;
        picuAktif('konflik_rekam_speech', true, 'konflik_rekam_pengenalan_suara');
        return { beralih_ke_mandiri: true, ...this.ambilStatus() };
      }

      if (rekamanSunyiSaatSpeech && izinMikrofonAda) {
        stateMandiri.hitung_konflik_berturut += 1;
        stateMandiri.hitung_kosong_berturut = 0;
        if (stateMandiri.hitung_konflik_berturut >= batasKonflik) {
          picuAktif('konflik_rekam_speech', true, 'konflik_rekam_pengenalan_suara');
          return { beralih_ke_mandiri: true, ...this.ambilStatus() };
        }
        return { beralih_ke_mandiri: false, ...this.ambilStatus() };
      }

      if (transkripKosong) {
        stateMandiri.hitung_konflik_berturut = 0;
        stateMandiri.hitung_kosong_berturut += 1;
        if (stateMandiri.hitung_kosong_berturut >= batasKosong) {
          picuAktif('hasil_kosong_2x', false, 'pengenalan_suara_kosong_2x');
          return { beralih_ke_mandiri: true, ...this.ambilStatus() };
        }
        return { beralih_ke_mandiri: false, ...this.ambilStatus() };
      }

      stateMandiri.hitung_kosong_berturut = 0;
      stateMandiri.hitung_konflik_berturut = 0;
      return { beralih_ke_mandiri: false, ...this.ambilStatus() };
    },

    /**
     * Mencatat jawaban penilaian mandiri Ya / Belum (FR-083)
     */
    catatPilihanMandiri(pilihan, meta = {}) {
      const nilaiStr = String(pilihan || '').trim().toLowerCase();
      const apakahYa = pilihan === true || pilihan === 1 || nilaiStr === 'ya' || nilaiStr === 'mandiri_ya';
      const catatan = Object.assign({}, meta, {
        hasil: apakahYa ? 'mandiri_ya' : 'mandiri_belum',
        terpenuhi: apakahYa,
        flag: 'mode_mandiri',
        mode_mandiri: true,
        sumber_mesin: 'penilaian_mandiri',
        alasan_mandiri: stateMandiri.alasan_aktif || 'mode_mandiri',
        waktu: Date.now()
      });
      stateMandiri.riwayat_mandiri.push(catatan);
      return catatan;
    },

    /**
     * Mereset penghitung peralihan level (K-11 berlaku per level, sedangkan K-10/K-12 tetap aktif).
     */
    resetLevel() {
      stateMandiri.hitung_kosong_berturut = 0;
      if (!stateMandiri.alasan_permanen) {
        stateMandiri.mode_mandiri = false;
        stateMandiri.alasan_aktif = null;
      }
      return this.ambilStatus();
    }
  };
}

/**
 * Merender komponen HTML Mode Penilaian Mandiri sesuai docs/DESAIN.md & teks-ui.json (FR-083).
 */
export function renderKotakModeMandiri({
  pertanyaan = '',
  labelYa = '',
  labelBelum = '',
  pilihanAktif = '',
  keterangan = '',
  idPrefix = 'mandiri'
} = {}) {
  const teksTanya = pertanyaan || ambilTeks('S-31', 'mode_mandiri') || 'Sudah mirip dengan model?';
  const opsiTeks = (ambilTeks('S-31', 'pilihan_mandiri') || 'Ya · Belum')
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);
  const teksYa = labelYa || opsiTeks[0] || 'Ya';
  const teksBelum = labelBelum || opsiTeks[1] || 'Belum';
  const ket = keterangan || 'Jawab dengan jujur sesuai latihanmu. Ini untuk membantumu belajar, bukan nilai.';

  const aman = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const yaAktif = pilihanAktif === 'ya' || pilihanAktif === 'mandiri_ya';
  const belumAktif = pilihanAktif === 'belum' || pilihanAktif === 'mandiri_belum';

  return `
    <div class="pesan-hangat" data-kotak-mandiri="${aman(idPrefix)}">
      <p class="pesan-hangat__judul">${aman(teksTanya)}</p>
      <p class="teks-keterangan" style="margin: 0;">${aman(ket)}</p>
      <div class="baris-pilihan-kecil" role="group" aria-label="${aman(teksTanya)}">
        <button
          type="button"
          id="${aman(idPrefix)}-ya"
          class="tombol ${yaAktif ? 'tombol--terpilih' : 'tombol--sekunder'}"
          data-pilihan-mandiri="ya"
          aria-pressed="${yaAktif}"
        >
          ${yaAktif ? '✓ ' : ''}${aman(teksYa)}
        </button>
        <button
          type="button"
          id="${aman(idPrefix)}-belum"
          class="tombol ${belumAktif ? 'tombol--terpilih' : 'tombol--sekunder'}"
          data-pilihan-mandiri="belum"
          aria-pressed="${belumAktif}"
        >
          ${aman(teksBelum)}
        </button>
      </div>
    </div>
  `;
}
