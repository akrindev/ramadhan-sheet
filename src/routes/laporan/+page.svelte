<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  function getLocaleDateTime(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  type LaporanData = {
    rombel: string;
    total_siswa: number;
    total_laporan: number;
    avg_puasa_penuh: number;
    avg_sholat: number;
    avg_tadarus: number;
  };

  let loading = $state(false);
  let error = $state('');
  const today = getLocaleDateTime();
  let dateFrom = $state(today);
  let dateTo = $state(today);
  let selectedRombel = $state('');
  let laporanByRombel = $state<LaporanData[]>([]);
  let reducedMotion = $state(false);
  let exportLoading = $state(false);

  function buildQuery(basePath: string, params: Record<string, string>) {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value.trim().length > 0) {
        q.set(key, value.trim());
      }
    }
    return q.size > 0 ? `${basePath}?${q.toString()}` : basePath;
  }

  function toPercent(value: number) {
    return `${Math.round(value)}%`;
  }

  function getVisibleSummary() {
    if (!selectedRombel) {
      return laporanByRombel;
    }
    return laporanByRombel.filter((item) => item.rombel === selectedRombel);
  }

  function getRombelOptions() {
    return [...new Set(laporanByRombel.map((item) => item.rombel))].sort();
  }

  function getDateRangeLabel() {
    if (dateFrom && dateTo) {
      return `${new Date(dateFrom).toLocaleDateString('id-ID')} - ${new Date(dateTo).toLocaleDateString('id-ID')}`;
    }
    if (dateFrom) {
      return `Mulai ${new Date(dateFrom).toLocaleDateString('id-ID')}`;
    }
    if (dateTo) {
      return `Sampai ${new Date(dateTo).toLocaleDateString('id-ID')}`;
    }
    return 'Semua tanggal';
  }

  function formatDateForFile(value: string) {
    if (!value) {
      return 'semua_tanggal';
    }
    return value.replace(/[^0-9-]/g, '');
  }

  function parseArrayField(field: unknown): string[] {
    if (Array.isArray(field)) {
      return field.filter((item): item is string => typeof item === 'string');
    }
    if (typeof field !== 'string' || field.trim().length === 0) {
      return [];
    }
    try {
      const parsed = JSON.parse(field) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  function animateHeader() {
    gsap.fromTo('.page-header', { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
    gsap.fromTo('.filter-panel', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.65, delay: 0.12 });
  }

  function animateSummary() {
    const targets = document.querySelectorAll('.summary-row, .summary-card');
    if (targets.length === 0) {
      return;
    }
    gsap.fromTo(
      targets,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
    );
  }

  async function fetchSummary() {
    loading = true;
    error = '';

    try {
      const response = await fetch(
        buildQuery('/api/sheet/summary', {
          date_from: dateFrom,
          date_to: dateTo
        })
      );
      if (!response.ok) {
        throw new Error('Gagal mengambil ringkasan laporan');
      }

      const data = (await response.json()) as { summary: LaporanData[] };
      laporanByRombel = (data.summary || []).map((item) => ({
        ...item,
        total_siswa: Number(item.total_siswa),
        total_laporan: Number(item.total_laporan),
        avg_puasa_penuh: Number(item.avg_puasa_penuh),
        avg_sholat: Number(item.avg_sholat),
        avg_tadarus: Number(item.avg_tadarus)
      }));

      if (!reducedMotion) {
        setTimeout(() => animateSummary(), 40);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data';
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      error = 'Rentang tanggal tidak valid. Tanggal akhir harus setelah tanggal awal.';
      return;
    }
    fetchSummary();
  }

  function resetFilters() {
    dateFrom = '';
    dateTo = '';
    selectedRombel = '';
    fetchSummary();
  }

  async function fetchAllActivitiesForExport() {
    let offset = 0;
    let allRows: Array<Record<string, unknown>> = [];
    let shouldContinue = true;

    while (shouldContinue) {
      const response = await fetch(
        buildQuery('/api/sheet', {
          flat: '1',
          rombel: selectedRombel,
          date_from: dateFrom,
          date_to: dateTo,
          limit: '200',
          offset: String(offset)
        })
      );

      if (!response.ok) {
        throw new Error('Gagal mengambil data kelas untuk export');
      }

      const data = (await response.json()) as {
        sheets: Array<Record<string, unknown>>;
        pagination?: { hasMore?: boolean; nextOffset?: number };
      };

      const chunk = data.sheets || [];
      allRows = [...allRows, ...chunk];

      shouldContinue = data.pagination?.hasMore === true;
      offset = data.pagination?.nextOffset ?? offset + chunk.length;
      if (chunk.length === 0) {
        shouldContinue = false;
      }
    }

    return allRows;
  }

  async function exportClassXlsx() {
    if (!selectedRombel.trim()) {
      error = 'Pilih kelas terlebih dahulu untuk export per kelas.';
      return;
    }

    exportLoading = true;
    error = '';

    try {
      const rows = await fetchAllActivitiesForExport();
      if (rows.length === 0) {
        error = 'Tidak ada data untuk diexport.';
        return;
      }

      const xlsx = await import('xlsx');
      const workbook = xlsx.utils.book_new();

      const mapped = rows.map((raw) => ({
        tanggal: String(raw.tanggal || ''),
        nis: String(raw.nis || ''),
        fullname: String(raw.fullname || ''),
        rombel: String(raw.rombel || ''),
        status_puasa: String(raw.status_puasa || ''),
        alasan_tidak_puasa: String(raw.alasan_tidak_puasa || ''),
        sholat_fardhu: parseArrayField(raw.sholat_fardhu).join(', '),
        ibadah_sunnah: parseArrayField(raw.ibadah_sunnah).join(', '),
        kebiasaan: parseArrayField(raw.kebiasaan).join(', '),
        tadarus: String(raw.tadarus || ''),
        created_at: String(raw.created_at || '')
      }));

      const worksheet = xlsx.utils.json_to_sheet(mapped);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Laporan Kelas');
      xlsx.writeFile(
        workbook,
        `laporan_kelas_${selectedRombel}_${formatDateForFile(dateFrom)}_${formatDateForFile(dateTo)}.xlsx`
      );
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal export data kelas.';
    } finally {
      exportLoading = false;
    }
  }

  async function logoutTeacher() {
    await fetch('/api/auth/logout', {
      method: 'POST'
    });
    await goto('/laporan/login', { invalidateAll: true });
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fetchSummary();
    if (!reducedMotion) {
      animateHeader();
    }
  });
</script>

<svelte:head>
  <title>Laporan Ramadhan - Ringkasan Kelas</title>
</svelte:head>

<div class="laporan-container">
  <header class="page-header">
    <div class="brand-line">
      <img src="/logo.png" alt="Logo SMK Diponegoro" class="brand-logo" loading="lazy" />
      <span class="badge">Monitoring Ibadah</span>
    </div>
    <h1 class="page-title">Ringkasan Per Kelas</h1>
    <p class="page-subtitle">Halaman ini hanya dapat diakses oleh guru untuk monitoring ringkasan dan aktivitas siswa.</p>

    <div class="header-nav">
      <a href="/" class="btn-nav">BERANDA</a>
      <button type="button" class="btn-nav" onclick={logoutTeacher}>KELUAR</button>
    </div>
  </header>

  <section class="filter-panel glass-card">
    <div class="filters-grid">
      <label class="field">
        <span>Tanggal Awal</span>
        <input type="date" bind:value={dateFrom} />
      </label>

      <label class="field">
        <span>Tanggal Akhir</span>
        <input type="date" bind:value={dateTo} />
      </label>

      <label class="field">
        <span>Kelas</span>
        <select bind:value={selectedRombel}>
          <option value="">Semua kelas</option>
          {#each getRombelOptions() as rombel}
            <option value={rombel}>{rombel}</option>
          {/each}
        </select>
      </label>

      <div class="actions">
        <button class="btn-primary" onclick={applyFilters} disabled={loading}>Terapkan</button>
        <button class="btn-secondary" onclick={resetFilters} disabled={loading}>Reset</button>
        <button class="btn-secondary" onclick={exportClassXlsx} disabled={loading || exportLoading}>
          {exportLoading ? 'Menyiapkan XLSX...' : 'Export XLSX Kelas'}
        </button>
      </div>
    </div>
    <p class="hint">Rentang aktif: {getDateRangeLabel()}</p>
  </section>

  {#if error}
    <div class="glass-card error-card">{error}</div>
  {/if}

  <section class="glass-card table-card desktop-summary">
    <div class="card-header">
      <h2 class="playfair">Data Ringkasan Kelas</h2>
    </div>
    <div class="table-wrapper">
      <table class="cinematic-table">
        <thead>
          <tr>
            <th>Kelas</th>
            <th>Total Siswa</th>
            <th>Sudah Mengisi</th>
            <th>Puasa Penuh</th>
            <th>Sholat 5 Waktu</th>
            <th>Aktivitas</th>
          </tr>
        </thead>
        <tbody>
          {#if loading && getVisibleSummary().length === 0}
            <tr>
              <td colspan="6" class="td-empty">Mengambil data ringkasan...</td>
            </tr>
          {:else if getVisibleSummary().length === 0}
            <tr>
              <td colspan="6" class="td-empty">Tidak ada data untuk filter ini.</td>
            </tr>
          {:else}
            {#each getVisibleSummary() as item}
              <tr class="summary-row">
                <td class="rombel-name">{item.rombel}</td>
                <td>{item.total_siswa}</td>
                <td>{item.total_laporan}</td>
                <td>{toPercent(item.avg_puasa_penuh)}</td>
                <td>{toPercent(item.avg_sholat)}</td>
                <td>
                  <a
                    class="btn-detail"
                    href={buildQuery('/laporan/siswa', { rombel: item.rombel, date_from: dateFrom, date_to: dateTo })}
                  >
                    Lihat Aktivitas
                  </a>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>

  <section class="mobile-summary">
    {#if loading && getVisibleSummary().length === 0}
      <article class="glass-card summary-card td-empty">Mengambil data ringkasan...</article>
    {:else if getVisibleSummary().length === 0}
      <article class="glass-card summary-card td-empty">Tidak ada data untuk filter ini.</article>
    {:else}
      {#each getVisibleSummary() as item}
        <article class="glass-card summary-card">
          <div class="card-top">
            <h3>{item.rombel}</h3>
            <a class="btn-detail" href={buildQuery('/laporan/siswa', { rombel: item.rombel, date_from: dateFrom, date_to: dateTo })}>
              Aktivitas
            </a>
          </div>
          <div class="card-grid">
            <div>
              <span class="label">Total Siswa</span>
              <strong>{item.total_siswa}</strong>
            </div>
            <div>
              <span class="label">Sudah Mengisi</span>
              <strong>{item.total_laporan}</strong>
            </div>
            <div>
              <span class="label">Puasa Penuh</span>
              <strong>{toPercent(item.avg_puasa_penuh)}</strong>
            </div>
            <div>
              <span class="label">Sholat 5 Waktu</span>
              <strong>{toPercent(item.avg_sholat)}</strong>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </section>
</div>

<style>
  .laporan-container {
    max-width: 1120px;
    margin: 0 auto;
    padding-bottom: 4.5rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .brand-line {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.8rem;
  }

  .brand-logo {
    width: 52px;
    height: 52px;
    border-radius: 8px;
    object-fit: cover;
  }

  .badge {
    display: inline-block;
    padding: 0.28rem 0.72rem;
    border: 1px solid rgba(197, 160, 89, 0.4);
    border-radius: 100px;
    color: #c5a059;
    font-size: 0.74rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: rgba(197, 160, 89, 0.05);
  }

  .page-title {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    color: #fff;
    margin: 0;
    line-height: 1.08;
  }

  .page-subtitle {
    color: rgba(224, 216, 195, 0.74);
    font-size: 1rem;
    margin-top: 0.58rem;
  }

  .header-nav {
    display: flex;
    justify-content: center;
    margin-top: 1.2rem;
  }

  .btn-nav {
    padding: 0.56rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #e0d8c3;
    text-decoration: none;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    font-family: inherit;
    transition: all 0.24s ease;
  }

  .btn-nav:hover {
    border-color: #c5a059;
    color: #fff;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 1.2rem;
    margin-bottom: 1rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.16);
  }

  .filter-panel {
    padding: 1rem;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.8rem;
    align-items: end;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.36rem;
  }

  .field span {
    font-size: 0.78rem;
    color: #c5a059;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-weight: 700;
  }

  .field input,
  .field select {
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(0, 0, 0, 0.32);
    color: #fff;
    padding: 0.65rem 0.8rem;
    font-family: inherit;
  }

  .field input:focus,
  .field select:focus {
    outline: none;
    border-color: #c5a059;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-detail {
    border-radius: 10px;
    padding: 0.64rem 0.86rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    cursor: pointer;
    text-decoration: none;
  }

  .btn-primary {
    border: none;
    color: #000;
    background: linear-gradient(135deg, #d4b472, #c5a059);
  }

  .btn-secondary,
  .btn-detail {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e0d8c3;
  }

  .btn-detail:hover,
  .btn-secondary:hover {
    border-color: #c5a059;
    color: #fff;
  }

  .hint {
    margin: 0.78rem 0 0;
    color: rgba(224, 216, 195, 0.64);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .error-card {
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.35);
  }

  .table-card {
    padding: 0;
    overflow: hidden;
  }

  .card-header {
    padding: 1rem 1.2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .playfair {
    font-family: 'Playfair Display', serif;
    margin: 0;
    font-size: 1.44rem;
    color: #f8f2e1;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .cinematic-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .cinematic-table th {
    padding: 0.95rem 1rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(224, 216, 195, 0.55);
    background: rgba(0, 0, 0, 0.14);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .cinematic-table td {
    padding: 0.95rem 1rem;
    color: #e9e4d7;
    font-size: 0.92rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .cinematic-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .rombel-name {
    font-weight: 700;
    color: #fff;
  }

  .td-empty {
    text-align: center;
    padding: 2rem !important;
    color: rgba(224, 216, 195, 0.72);
  }

  .mobile-summary {
    display: none;
  }

  .summary-card {
    margin-bottom: 0.85rem;
  }

  .summary-card .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.8rem;
  }

  .summary-card h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .card-grid .label {
    display: block;
    font-size: 0.72rem;
    color: rgba(224, 216, 195, 0.68);
    margin-bottom: 0.22rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .card-grid strong {
    color: #fff;
    font-size: 1rem;
  }

  @media (max-width: 900px) {
    .filters-grid {
      grid-template-columns: 1fr 1fr;
    }

    .actions {
      grid-column: span 2;
      width: 100%;
    }

    .actions button {
      flex: 1;
    }

    .brand-logo {
      width: 46px;
      height: 46px;
    }
  }

  @media (max-width: 760px) {
    .laporan-container {
      padding-bottom: 3rem;
    }

    .page-title {
      font-size: 2.2rem;
    }

    .page-subtitle {
      font-size: 0.92rem;
    }

    .filters-grid {
      grid-template-columns: 1fr;
    }

    .actions {
      grid-column: auto;
    }

    .desktop-summary {
      display: none;
    }

    .mobile-summary {
      display: block;
    }

    .glass-card {
      padding: 1rem;
    }
  }
</style>
