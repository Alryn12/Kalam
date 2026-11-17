/**
 * Layar S-43: Misi Muhimmah (Level 4) (situs/js/layar/s43-misi-muhimmah.js)
 * Tugas M2-A: TB-M2-01 & TB-M2-02
 * Acuan: SRS-3 FR-030; BP-1 S-43; BP-4 R-45; BP-6 S-43; situs/konten/u1/muhimmah.json
 */

import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import { pilihBentukTeks } from './sesi1-bantu.js';
import { escapeHtml, kirimAtauAntre } from './tahap0-bantu.js';
import { siapkanKonteksSesi3, simpanKemajuanSesi3 } from './sesi3-bantu.js';

export async function renderS43({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi3('S-43', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, noUnit, muhimmah, kemajuanS3, wadah } = konteks;
  const st = ambilState().status_server || {};
  const bentukGuru = (st.konfig_publik && st.konfig_publik.bentuk_sapaan_guru) === 'putri' ? 'putri' : 'putra';
  const modeDuaU6 = noUnit === 6 && Number(st.konfig_publik && st.konfig_publik.mode_dua_setoran_unit6 || 0) === 1;
  const keSetoran = modeDuaU6
    ? Math.min(2, Math.max(1, Number((param && param.setoran) || kemajuanS3.ke_setoran || 1)))
    : 1;

  const semuaLangkah = Array.isArray(muhimmah && muhimmah.langkah) ? muhimmah.langkah : [];
  const daftarLangkah = modeDuaU6
    ? semuaLangkah.filter((l, idx) => {
        if (l.setoran !== undefined && l.setoran !== null) return Number(l.setoran) === keSetoran;
        return keSetoran === 1 ? idx < 4 : idx >= 4;
      })
    : semuaLangkah;

  const arabTerbukaMap = {};
  const gambarTerbukaMap = {};
  const bentukLangkahMap = {};
  const arabTercatatSet = new Set(Array.isArray(kemajuanS3.teksArabDibuka) ? kemajuanS3.teksArabDibuka : []);

  kirimAtauAntre(
    'catat',
    {
      tahap: 'UNIT',
      unit: noUnit,
      aspek: 'misi_dibuka',
      butir: `${unitId}-M0`,
      nilai: 1
    },
    `Misi dibuka Unit ${noUnit}`,
    'ANGKA'
  ).catch(() => {});

  function tentukanBentukLangkah(langkah) {
    if (bentukLangkahMap[langkah.id]) return bentukLangkahMap[langkah.id];
    if (langkah.bentuk_ikut === 'ikon_orang_diperkenalkan' || langkah.bentuk_ikut === 'ikon_teman') {
      return kemajuanS3.ikonTeman === 'putri' ? 'putri' : 'putra';
    }
    return bentukGuru;
  }

  function punyaVarianGender(arabNilai) {
    return Boolean(
      arabNilai &&
      typeof arabNilai === 'object' &&
      !Array.isArray(arabNilai) &&
      ('putra' in arabNilai || 'putri' in arabNilai)
    );
  }

  function lukis() {
    const judul = ambilTeks('S-43', 'judul') || 'Misi bersama gurumu';
    const penjelasan = ambilTeks('S-43', 'penjelasan') ||
      'Gurumu akan mengajakmu bicara. Ini langkah-langkahnya.';
    const lblLihatArab = ambilTeks('S-43', 'tombol_teks_arab') || 'Lihat teks Arab';
    const lblTutupArab = ambilTeks('S-43', 'tombol_tutup_arab') || 'Sembunyikan teks Arab';
    const lblLihatGambar = ambilTeks('S-43', 'tombol_gambar_bantu') || 'Lihat gambar bantu';
    const lblTutupGambar = ambilTeks('S-43', 'tombol_tutup_gambar') || 'Sembunyikan gambar bantu';
    const lblAlatBantu = ambilTeks('S-43', 'label_alat_bantu') || 'Alat bantu gambar:';
    const lblSiap = ambilTeks('S-43', 'tombol') || 'Aku siap bertemu gurumu';
    const lblPutra = ambilTeks('S-43', 'label_putra') || 'Bentuk putra';
    const lblPutri = ambilTeks('S-43', 'label_putri') || 'Bentuk putri';
    const penandaDua = modeDuaU6
      ? (ambilTeks('S-43', 'penanda_dua_setoran', { n: keSetoran }) || `Setoran ${keSetoran} dari 2`)
      : '';

    const langkahHtml = daftarLangkah.map((langkah, idx) => {
      const labelLangkah = ambilTeks('S-43', 'label_langkah', {
        n: idx + 1,
        total: daftarLangkah.length
      }) || `Langkah ${idx + 1} dari ${daftarLangkah.length}`;
      const arabTerbuka = Boolean(arabTerbukaMap[langkah.id]);
      const gambarTerbuka = Boolean(gambarTerbukaMap[langkah.id]);
      const bentukAktif = tentukanBentukLangkah(langkah);
      const teksArab = pilihBentukTeks(langkah.arab, bentukAktif);
      const adaVarian = punyaVarianGender(langkah.arab);

      return `
        <article class="kartu-arab" data-id-langkah="${escapeHtml(langkah.id)}">
          <div class="kartu-arab__kepala">
            <span class="kartu-unit__nomor">${escapeHtml(labelLangkah)}</span>
            <span class="kartu-arab__label">${escapeHtml(langkah.id)}</span>
          </div>

          <p class="teks-instruksi" style="margin: 0; font-weight: 600;">${escapeHtml(langkah.instruksi)}</p>

          ${arabTerbuka ? `
            <div class="kartu-arab__kotak-kalimat" role="region" aria-label="Teks Arab ${escapeHtml(langkah.id)}">
              ${adaVarian ? `
                <div class="baris-pilihan-kecil" style="margin-bottom: var(--jarak-2);">
                  <button
                    type="button"
                    class="tombol tombol--sekunder ${bentukAktif === 'putra' ? 'tombol--terpilih' : ''}"
                    data-bentuk-langkah="${escapeHtml(langkah.id)}"
                    data-bentuk="putra"
                  >${escapeHtml(lblPutra)}</button>
                  <button
                    type="button"
                    class="tombol tombol--sekunder ${bentukAktif === 'putri' ? 'tombol--terpilih' : ''}"
                    data-bentuk-langkah="${escapeHtml(langkah.id)}"
                    data-bentuk="putri"
                  >${escapeHtml(lblPutri)}</button>
                </div>
              ` : ''}
              <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">
                ${escapeHtml(teksArab)}
              </p>
            </div>
          ` : ''}

          ${gambarTerbuka && langkah.alat_bantu ? `
            <div class="pesan-hangat" role="note">
              <p class="pesan-hangat__judul">${escapeHtml(lblAlatBantu)}</p>
              <p class="pesan-hangat__isi">${escapeHtml(langkah.alat_bantu)}</p>
            </div>
          ` : ''}

          <div class="baris-tombol">
            <button
              type="button"
              class="tombol tombol--sekunder"
              data-toggle-arab="${escapeHtml(langkah.id)}"
              aria-expanded="${arabTerbuka}"
            >
              ${escapeHtml(arabTerbuka ? lblTutupArab : lblLihatArab)}
            </button>
            ${langkah.alat_bantu ? `
              <button
                type="button"
                class="tombol tombol--sekunder"
                data-toggle-gambar="${escapeHtml(langkah.id)}"
                aria-expanded="${gambarTerbuka}"
              >
                ${escapeHtml(gambarTerbuka ? lblTutupGambar : lblLihatGambar)}
              </button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-labelledby="judul-s43">
        <section class="kartu">
          <div class="daftar-status" style="justify-content: space-between; align-items: center;">
            <span class="kartu-unit__nomor">Level 4 · Unit ${noUnit}</span>
            ${penandaDua ? `<span class="kartu-arab__label">${escapeHtml(penandaDua)}</span>` : ''}
          </div>
          <h1 id="judul-s43" class="judul-layar" style="margin-bottom: 0;">${escapeHtml(judul)}</h1>
          <h2 class="subjudul-layar" style="margin: 0;">${escapeHtml((muhimmah && muhimmah.judul) || '')}</h2>
          ${muhimmah && muhimmah.judul_ar ? `<p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${muhimmah.judul_ar}</p>` : ''}
          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(penjelasan)}</p>
        </section>

        ${langkahHtml}

        <section class="kartu">
          <button type="button" id="s43-tombol-siap" class="tombol tombol--utama">
            ${escapeHtml(lblSiap)}
          </button>
        </section>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    wadah.querySelectorAll('[data-toggle-arab]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idLangkah = btn.getAttribute('data-toggle-arab');
        if (!idLangkah) return;
        const akanTerbuka = !arabTerbukaMap[idLangkah];
        arabTerbukaMap[idLangkah] = akanTerbuka;

        if (akanTerbuka && !arabTercatatSet.has(idLangkah)) {
          arabTercatatSet.add(idLangkah);
          kemajuanS3.teksArabDibuka = Array.from(arabTercatatSet);
          simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3).catch(() => {});
          kirimAtauAntre(
            'catat',
            {
              tahap: 'UNIT',
              unit: noUnit,
              aspek: 'teks_arab_dibuka',
              butir: idLangkah,
              nilai: 1,
              catatan: idLangkah
            },
            `Lihat teks Arab ${idLangkah}`,
            'ANGKA'
          ).catch(() => {});
        }
        lukis();
      });
    });

    wadah.querySelectorAll('[data-toggle-gambar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idLangkah = btn.getAttribute('data-toggle-gambar');
        if (!idLangkah) return;
        gambarTerbukaMap[idLangkah] = !gambarTerbukaMap[idLangkah];
        lukis();
      });
    });

    wadah.querySelectorAll('[data-bentuk-langkah]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idLangkah = btn.getAttribute('data-bentuk-langkah');
        const bentuk = btn.getAttribute('data-bentuk') === 'putri' ? 'putri' : 'putra';
        if (!idLangkah) return;
        bentukLangkahMap[idLangkah] = bentuk;
        lukis();
      });
    });

    const btnSiap = wadah.querySelector('#s43-tombol-siap');
    if (btnSiap) {
      btnSiap.addEventListener('click', () => {
        arahKe('S-44', {
          unit: unitId,
          ...(modeDuaU6 ? { setoran: String(keSetoran) } : {})
        });
      });
    }
  }

  lukis();
}
