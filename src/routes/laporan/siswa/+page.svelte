<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import gsap from 'gsap';

  type ActivityData = {
    id: number;
    tanggal: string;
    sholat_fardhu: string;
    status_puasa: string;
    alasan_tidak_puasa: string | null;
    ibadah_sunnah: string;
    tadarus: string;
    kebiasaan: string;
    created_at: string | number;
    nis: string;
    fullname: string;
    rombel: string;
  };

  let loading = $state(false);
  let error = $state('');
  let selectedNis = $state('');
  let selectedRombel = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let rombelList = $state<string[]>([]);
  let activitySheets = $state<ActivityData[]>([]);
  let showFullDetails = $state(true);
  let reducedMotion = $state(false);
  let hasMore = $state(false);
  let loadingMore = $state(false);
  let exportLoading = $state(false);
  let sentinelRef = $state<HTMLElement>();

  let observer: IntersectionObserver | null = null;
  const pageLimit = 20;

  function buildQuery(basePath: string, params: Record<string, string>) {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value.trim().length > 0) {
        q.set(key, value.trim());
      }
    }
    return q.size > 0 ? `${basePath}?${q.toString()}` : basePath;
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

  function getStatusLabel(status: string) {
    switch (status) {
      case 'PENUH':
        return 'Puasa Penuh';
      case 'SETENGAH HARI':
        return 'Setengah Hari';
      case 'TIDAK PUASA':
        return 'Tidak Puasa';
      default:
        return status;
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'PENUH':
        return 'status-full';
      case 'SETENGAH HARI':
        return 'status-half';
      case 'TIDAK PUASA':
        return 'status-none';
      default:
        return '';
    }
  }

  function formatDate(dateString: string) {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  }

  function formatCreatedAt(value: string | number) {
    if (typeof value === 'number') {
      const date = value < 1000000000000 ? new Date(value * 1000) : new Date(value);
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }

    if (/^\d+$/.test(value)) {
      const numeric = Number(value);
      const date = numeric < 1000000000000 ? new Date(numeric * 1000) : new Date(numeric);
      return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }

    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
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

  function getUniqueStudentCount() {
    return new Set(activitySheets.map((sheet) => sheet.nis)).size;
  }

  function getFullFastingCount() {
    return activitySheets.filter((sheet) => sheet.status_puasa === 'PENUH').length;
  }

  function getFivePrayerCount() {
    return activitySheets.filter((sheet) => parseArrayField(sheet.sholat_fardhu).length === 5).length;
  }

  function formatDateForFile(value: string) {
    if (!value) {
      return 'semua_tanggal';
    }
    return value.replace(/[^0-9-]/g, '');
  }

  function animateHeader() {
    gsap.fromTo('.header-section', { opacity: 0, y: -22 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
    gsap.fromTo('.filter-section', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.65, delay: 0.15 });
  }

  function animateCards() {
    const cards = document.querySelectorAll('.activity-card');
    if (cards.length === 0) {
      return;
    }
    gsap.fromTo(
      cards,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
    );
  }

  async function toggleAllDetails() {
    showFullDetails = !showFullDetails;
    await tick();

    if (reducedMotion || !showFullDetails) {
      return;
    }

    const details = document.querySelectorAll('.detail-body');
    if (details.length > 0) {
      gsap.fromTo(details, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' });
    }
  }

  async function fetchRombelList() {
    try {
      const response = await fetch('/api/sheet/rombel');
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { rombel: string[] };
      rombelList = data.rombel || [];
    } catch {
      rombelList = [];
    }
  }

  async function fetchActivities(reset = true) {
    if (reset) {
      loading = true;
      error = '';
    } else {
      loadingMore = true;
    }

    const offset = reset ? 0 : activitySheets.length;

    try {
      const response = await fetch(
        buildQuery('/api/sheet', {
          flat: '1',
          nis: selectedNis,
          rombel: selectedRombel,
          date_from: dateFrom,
          date_to: dateTo,
          limit: String(pageLimit),
          offset: String(offset)
        })
      );

      if (!response.ok) {
        throw new Error('Gagal mengambil aktivitas siswa');
      }

      const data = (await response.json()) as {
        sheets: ActivityData[];
        pagination?: { hasMore?: boolean };
      };

      const nextRows = data.sheets || [];
      activitySheets = reset ? nextRows : [...activitySheets, ...nextRows];
      hasMore = data.pagination?.hasMore === true;

      if (!reducedMotion && reset) {
        setTimeout(() => animateCards(), 40);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data';
      if (reset) {
        activitySheets = [];
        hasMore = false;
      }
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  async function fetchAllActivitiesForExport(filters: {
    nis?: string;
    rombel?: string;
    date_from?: string;
    date_to?: string;
  }) {
    let offset = 0;
    let allRows: ActivityData[] = [];
    let shouldContinue = true;

    while (shouldContinue) {
      const response = await fetch(
        buildQuery('/api/sheet', {
          flat: '1',
          nis: filters.nis || '',
          rombel: filters.rombel || '',
          date_from: filters.date_from || '',
          date_to: filters.date_to || '',
          limit: '200',
          offset: String(offset)
        })
      );

      if (!response.ok) {
        throw new Error('Gagal mengambil data export');
      }

      const data = (await response.json()) as {
        sheets: ActivityData[];
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

  async function exportStudentXlsx() {
    if (!selectedNis.trim()) {
      error = 'Isi NIS terlebih dahulu untuk export per siswa.';
      return;
    }

    exportLoading = true;
    error = '';

    try {
      const rows = await fetchAllActivitiesForExport({
        nis: selectedNis,
        date_from: dateFrom,
        date_to: dateTo
      });

      if (rows.length === 0) {
        error = 'Tidak ada data untuk diexport.';
        return;
      }

      const xlsx = await import('xlsx');
      const workbook = xlsx.utils.book_new();
      const mapped = rows.map((sheet) => ({
        tanggal: sheet.tanggal,
        nis: sheet.nis,
        fullname: sheet.fullname,
        rombel: sheet.rombel,
        status_puasa: sheet.status_puasa,
        alasan_tidak_puasa: sheet.alasan_tidak_puasa || '',
        sholat_fardhu: parseArrayField(sheet.sholat_fardhu).join(', '),
        ibadah_sunnah: parseArrayField(sheet.ibadah_sunnah).join(', '),
        kebiasaan: parseArrayField(sheet.kebiasaan).join(', '),
        tadarus: sheet.tadarus || '',
        created_at: formatCreatedAt(sheet.created_at)
      }));

      const worksheet = xlsx.utils.json_to_sheet(mapped);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Aktivitas Siswa');
      xlsx.writeFile(
        workbook,
        `laporan_siswa_${selectedNis}_${formatDateForFile(dateFrom)}_${formatDateForFile(dateTo)}.xlsx`
      );
    } catch (err) {
      error = err instanceof Error ? err.message : 'Gagal export data siswa.';
    } finally {
      exportLoading = false;
    }
  }

  function setupInfiniteObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (!sentinelRef) {
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (!target?.isIntersecting) {
          return;
        }

        if (!loading && !loadingMore && hasMore) {
          fetchActivities(false);
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 }
    );

    observer.observe(sentinelRef);
  }

  function applyFilters() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      error = 'Rentang tanggal tidak valid. Tanggal akhir harus setelah tanggal awal.';
      return;
    }
    fetchActivities();
  }

  function resetFilters() {
    selectedNis = '';
    selectedRombel = '';
    dateFrom = '';
    dateTo = '';
    fetchActivities();
  }

  async function logoutTeacher() {
    await fetch('/api/auth/logout', {
      method: 'POST'
    });
    await goto('/laporan/login', { invalidateAll: true });
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params = new URLSearchParams(window.location.search);
    selectedNis = params.get('nis') || '';
    selectedRombel = params.get('rombel') || '';
    dateFrom = params.get('date_from') || params.get('tanggal') || '';
    dateTo = params.get('date_to') || params.get('tanggal') || '';
    fetchRombelList();
    fetchActivities();

    if (!reducedMotion) {
      animateHeader();
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  $effect(() => {
    if (sentinelRef) {
      setupInfiniteObserver();
    }
  });
</script>

<svelte:head>
  <title>Aktivitas Siswa - Laporan Ramadhan</title>
</svelte:head>

<div class="page-container">
  <section class="header-section">
    <div class="brand-line">
      <img src="/logo.png" alt="Logo SMK Diponegoro" class="brand-logo" loading="lazy" />
      <span class="badge">Laporan Siswa</span>
    </div>
    <h1 class="page-title">Aktivitas Siswa</h1>
    <p class="page-subtitle">Akses khusus guru untuk melihat detail aktivitas harian siswa berdasarkan NIS, kelas, dan rentang tanggal.</p>
    <div class="header-nav">
      <a href="/laporan" class="btn-nav">RINGKASAN KELAS</a>
      <a href="/" class="btn-nav">BERANDA</a>
      <button type="button" class="btn-nav" onclick={logoutTeacher}>KELUAR</button>
    </div>
  </section>

  <section class="filter-section glass-card">
    <div class="filter-grid">
      <label class="field">
        <span>NIS</span>
        <input type="text" bind:value={selectedNis} placeholder="Contoh: 125261" />
      </label>

      <label class="field">
        <span>Kelas</span>
        <select bind:value={selectedRombel}>
          <option value="">Semua kelas</option>
          {#each rombelList as rombel}
            <option value={rombel}>{rombel}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span>Tanggal Awal</span>
        <input type="date" bind:value={dateFrom} />
      </label>

      <label class="field">
        <span>Tanggal Akhir</span>
        <input type="date" bind:value={dateTo} />
      </label>

      <div class="actions">
        <button class="btn-primary" onclick={applyFilters} disabled={loading}>Terapkan</button>
        <button class="btn-secondary" onclick={resetFilters} disabled={loading}>Reset</button>
        <button class="btn-secondary" onclick={toggleAllDetails} disabled={loading}>
          {showFullDetails ? 'Sembunyikan Detail Lengkap' : 'Tampilkan Detail Lengkap'}
        </button>
        <button class="btn-secondary" onclick={exportStudentXlsx} disabled={loading || exportLoading}>
          {exportLoading ? 'Menyiapkan XLSX...' : 'Export XLSX Siswa'}
        </button>
      </div>
    </div>
    <p class="hint">Rentang aktif: {getDateRangeLabel()}</p>
  </section>

  <section class="stats-grid">
    <article class="glass-card stat-card">
      <span class="label">Total Aktivitas</span>
      <strong>{activitySheets.length}</strong>
    </article>
    <article class="glass-card stat-card">
      <span class="label">Total Siswa</span>
      <strong>{getUniqueStudentCount()}</strong>
    </article>
    <article class="glass-card stat-card">
      <span class="label">Puasa Penuh</span>
      <strong>{getFullFastingCount()}</strong>
    </article>
    <article class="glass-card stat-card">
      <span class="label">Sholat 5 Waktu</span>
      <strong>{getFivePrayerCount()}</strong>
    </article>
  </section>

  {#if error}
    <div class="glass-card error-card">{error}</div>
  {/if}

  {#if loading && activitySheets.length === 0}
    <article class="glass-card empty-card">Mengambil aktivitas siswa...</article>
  {:else if activitySheets.length === 0}
    <article class="glass-card empty-card">Tidak ada aktivitas untuk filter ini.</article>
  {:else}
    <section class="cards-wrap">
      {#each activitySheets as sheet}
        {@const sholatList = parseArrayField(sheet.sholat_fardhu)}
        {@const sunnahList = parseArrayField(sheet.ibadah_sunnah)}
        {@const kebiasaanList = parseArrayField(sheet.kebiasaan)}

        <article class="glass-card activity-card">
          <div class="card-head">
            <div>
              <h3>{sheet.fullname}</h3>
              <p class="meta">{sheet.nis} · {sheet.rombel}</p>
            </div>
            <span class="date-pill">{formatDate(sheet.tanggal)}</span>
          </div>

          <div class="quick-grid">
            <div>
              <span class="label">Status Puasa</span>
              <span class="status-badge {getStatusClass(sheet.status_puasa)}">{getStatusLabel(sheet.status_puasa)}</span>
            </div>
            <div>
              <span class="label">Sholat Fardhu</span>
              <strong>{sholatList.length}/5</strong>
            </div>
            <div>
              <span class="label">Tadarus</span>
              <strong>{sheet.tadarus || '-'}</strong>
            </div>
          </div>

          {#if showFullDetails}
            <div class="detail-body">
              <div class="detail-section">
                <span class="label">Sholat Fardhu</span>
                <div class="chip-wrap">
                  {#each sholatList as item}
                    <span class="chip">{item}</span>
                  {:else}
                    <span class="chip empty">Tidak ada data</span>
                  {/each}
                </div>
              </div>

              <div class="detail-section">
                <span class="label">Ibadah Sunnah</span>
                <div class="chip-wrap">
                  {#each sunnahList as item}
                    <span class="chip">{item}</span>
                  {:else}
                    <span class="chip empty">Tidak ada data</span>
                  {/each}
                </div>
              </div>

              <div class="detail-section">
                <span class="label">Kebiasaan Baik</span>
                <div class="chip-wrap">
                  {#each kebiasaanList as item}
                    <span class="chip">{item}</span>
                  {:else}
                    <span class="chip empty">Tidak ada data</span>
                  {/each}
                </div>
              </div>

              <div class="detail-section">
                <span class="label">Waktu Kirim</span>
                <p class="reason-text">{formatCreatedAt(sheet.created_at)}</p>
              </div>

              {#if sheet.alasan_tidak_puasa}
                <div class="detail-section">
                  <span class="label">Alasan Tidak Puasa Penuh</span>
                  <p class="reason-text">{sheet.alasan_tidak_puasa}</p>
                </div>
              {/if}
            </div>
          {/if}
        </article>
      {/each}
    </section>

    {#if hasMore}
      <div class="load-anchor" bind:this={sentinelRef}>
        {#if loadingMore}
          Memuat aktivitas berikutnya...
        {:else}
          Scroll untuk memuat lebih banyak
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .page-container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 1rem 0.9rem 3rem;
  }

  .header-section {
    text-align: center;
    margin-bottom: 1.2rem;
  }

  .brand-line {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.7rem;
  }

  .brand-logo {
    width: 52px;
    height: 52px;
    border-radius: 8px;
    object-fit: cover;
  }

  .badge {
    padding: 0.25rem 0.72rem;
    border-radius: 999px;
    border: 1px solid rgba(197, 160, 89, 0.4);
    color: #c5a059;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: rgba(197, 160, 89, 0.07);
  }

  .page-title {
    margin: 0;
    color: #fff;
    font-family: 'Playfair Display', serif;
    font-size: 2.2rem;
    line-height: 1.08;
  }

  .page-subtitle {
    margin: 0.55rem 0 0;
    color: rgba(224, 216, 195, 0.74);
    font-size: 0.94rem;
  }

  .header-nav {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .btn-nav {
    padding: 0.56rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #e0d8c3;
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    background: rgba(255, 255, 255, 0.03);
    font-family: inherit;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    padding: 1rem;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.16);
  }

  .filter-section {
    margin-bottom: 0.9rem;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
  }

  .field span,
  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #c5a059;
    font-weight: 700;
  }

  .field input,
  .field select {
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(0, 0, 0, 0.34);
    color: #fff;
    padding: 0.74rem 0.85rem;
    font-family: inherit;
    font-size: 0.95rem;
  }

  .field input:focus,
  .field select:focus {
    outline: none;
    border-color: #c5a059;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-secondary,
  .btn-detail {
    border-radius: 10px;
    padding: 0.66rem 0.84rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    cursor: pointer;
  }

  .btn-primary {
    border: none;
    color: #000;
    background: linear-gradient(135deg, #d3b370, #c5a059);
  }

  .btn-secondary,
  .btn-detail {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e0d8c3;
  }

  .hint {
    margin: 0.7rem 0 0;
    color: rgba(224, 216, 195, 0.65);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    margin-bottom: 0.9rem;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    text-align: center;
  }

  .stat-card strong {
    color: #fff;
    font-size: 1.3rem;
    font-family: 'Playfair Display', serif;
  }

  .error-card {
    margin-bottom: 0.9rem;
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.34);
  }

  .empty-card {
    margin-top: 0.2rem;
    text-align: center;
    color: rgba(224, 216, 195, 0.74);
  }

  .cards-wrap {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .load-anchor {
    margin-top: 0.9rem;
    text-align: center;
    color: rgba(224, 216, 195, 0.72);
    font-size: 0.84rem;
    padding: 0.85rem;
  }

  .activity-card {
    padding: 1rem;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .card-head h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }

  .meta {
    margin: 0.3rem 0 0;
    color: rgba(224, 216, 195, 0.68);
    font-size: 0.78rem;
  }

  .date-pill {
    background: rgba(197, 160, 89, 0.14);
    border: 1px solid rgba(197, 160, 89, 0.34);
    color: #d8b870;
    border-radius: 999px;
    padding: 0.32rem 0.6rem;
    font-size: 0.69rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .quick-grid {
    margin-top: 0.8rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .quick-grid div:last-child {
    grid-column: 1 / -1;
  }

  .quick-grid strong {
    display: block;
    color: #fff;
    margin-top: 0.25rem;
    font-size: 0.94rem;
  }

  .status-badge {
    margin-top: 0.25rem;
    display: inline-block;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.66rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    border: 1px solid transparent;
    font-weight: 700;
  }

  .status-full {
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.24);
  }

  .status-half {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.24);
  }

  .status-none {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.24);
  }

  .btn-detail {
    margin-top: 0.78rem;
    width: 100%;
    text-align: center;
  }

  .detail-body {
    margin-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.75rem;
    display: grid;
    gap: 0.7rem;
  }

  .detail-section {
    display: grid;
    gap: 0.34rem;
  }

  .chip-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .chip {
    padding: 0.28rem 0.56rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.04);
    color: #e7e2d3;
    font-size: 0.74rem;
  }

  .chip.empty {
    opacity: 0.7;
  }

  .reason-text {
    margin: 0;
    color: #fca5a5;
    font-size: 0.84rem;
    line-height: 1.45;
  }

  @media (min-width: 760px) {
    .page-container {
      padding: 1.4rem 1.4rem 3.4rem;
    }

    .page-title {
      font-size: 2.8rem;
    }

    .filter-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      align-items: end;
    }

    .actions {
      grid-column: span 2;
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .cards-wrap {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .quick-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .quick-grid div:last-child {
      grid-column: auto;
    }
  }
</style>
