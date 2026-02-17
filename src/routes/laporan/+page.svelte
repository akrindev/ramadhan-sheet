<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  type LaporanData = {
    rombel: string;
    total_siswa: number;
    total_laporan: number;
    avg_puasa_penuh: number;
    avg_sholat: number;
    avg_tadarus: number;
  };

  type SheetData = {
    id: number;
    tanggal: string;
    sholat_fardhu: string;
    status_puasa: string;
    alasan_tidak_puasa: string | null;
    ibadah_sunnah: string;
    tadarus: string;
    kebiasaan: string;
    created_at: string;
    nis: string;
    fullname: string;
    rombel: string;
  };

  let loading = $state(false);
  let selectedRombel = $state('');
  let selectedDate = $state(new Date().toISOString().split('T')[0]);
  let rombelList = $state<string[]>([]);
  let laporanByRombel = $state<LaporanData[]>([]);
  let detailSheets = $state<SheetData[]>([]);
  let viewMode = $state<'summary' | 'detail'>('summary');

  // Refs for animation
  let containerRef = $state<HTMLElement>();

  async function fetchRombelList() {
    try {
      const response = await fetch('/api/sheet/rombel');
      if (response.ok) {
        const data = await response.json() as { rombel: string[] };
        rombelList = data.rombel || [];
      }
    } catch (err) {
      console.error('Error fetching rombel:', err);
    }
  }

  async function fetchLaporanSummary() {
    loading = true;
    try {
      const response = await fetch('/api/sheet/summary');
      if (response.ok) {
        const data = await response.json() as { summary: LaporanData[] };
        laporanByRombel = data.summary || [];
        
        // Staggered entrance for rows
        setTimeout(() => {
          if (viewMode === 'summary') animateRows('.summary-row');
        }, 50);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      loading = false;
    }
  }

  async function fetchDetailByRombel() {
    if (!selectedRombel) return;
    loading = true;
    try {
      const response = await fetch(`/api/sheet?rombel=${encodeURIComponent(selectedRombel)}&tanggal=${selectedDate}`);
      if (response.ok) {
        const data = await response.json() as { sheets: SheetData[] };
        detailSheets = data.sheets || [];
        viewMode = 'detail';
        
        // Entrance animation for detail view
        setTimeout(() => {
          animateDetailEntrance();
        }, 50);
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      loading = false;
    }
  }

  function parseJSONField(field: string): string[] {
    if (!field) return [];
    try {
      if (Array.isArray(field)) return field;
      return JSON.parse(field) as string[];
    } catch {
      return [];
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'PENUH': return 'Puasa Penuh';
      case 'SETENGAH HARI': return 'Setengah Hari';
      case 'TIDAK PUASA': return 'Tidak Puasa';
      default: return status;
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'PENUH': return 'status-full';
      case 'SETENGAH HARI': return 'status-half';
      case 'TIDAK PUASA': return 'status-none';
      default: return '';
    }
  }

  function animateRows(selector: string) {
    const rows = document.querySelectorAll(selector);
    if (rows.length > 0) {
      gsap.fromTo(rows, 
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.5, ease: 'power2.out' }
      );
    }
  }

  function animateDetailEntrance() {
    const tl = gsap.timeline();
    tl.fromTo('.detail-header-info', 
      { opacity: 0, y: -20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
    tl.fromTo('.stat-card', 
      { opacity: 0, scale: 0.9 }, 
      { opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.7)' },
      "-=0.3"
    );
    tl.fromTo('.detail-row', 
      { opacity: 0, y: 10 }, 
      { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power2.out' },
      "-=0.2"
    );
  }

  function backToSummary() {
    viewMode = 'summary';
    fetchLaporanSummary();
  }

  onMount(() => {
    fetchRombelList();
    fetchLaporanSummary();
    
    gsap.fromTo('.page-header', 
      { opacity: 0, y: -30 }, 
      { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }
    );
  });
</script>

<svelte:head>
  <title>Laporan Ramadhan - SMK Diponegoro Karanganyar</title>
</svelte:head>

<div class="laporan-container" bind:this={containerRef}>
  <header class="page-header">
    <span class="badge">Monitoring Ibadah</span>
    <h1 class="page-title">Laporan Ramadhan</h1>
    <p class="page-subtitle">Transparansi dan Monitoring Amaliyah Siswa</p>
    
    <div class="header-nav">
      <a href="/" class="btn-nav">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        BERANDA
      </a>
      <a href="/laporan/siswa" class="btn-nav">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        CARI SISWA
      </a>
    </div>
  </header>

  {#if viewMode === 'summary'}
    <section class="summary-view">
      <div class="view-controls glass-card">
        <div class="filter-group">
          <label for="date-filter">Filter Tanggal</label>
          <input 
            id="date-filter" 
            type="date" 
            bind:value={selectedDate} 
            onchange={fetchLaporanSummary}
          />
        </div>
      </div>

      <div class="glass-card table-card">
        <div class="card-header">
          <h2 class="playfair">Ringkasan per Kelas</h2>
        </div>

        <div class="table-wrapper">
          <table class="cinematic-table">
            <thead>
              <tr>
                <th>Kelas</th>
                <th>Siswa</th>
                <th>Sudah Mengisi</th>
                <th>Puasa Penuh</th>
                <th>Sholat 5 Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#if loading && laporanByRombel.length === 0}
                <tr>
                  <td colspan="6" class="td-loading">
                    <div class="pulse-text">Mendata amaliyah siswa...</div>
                  </td>
                </tr>
              {:else if laporanByRombel.length === 0}
                <tr>
                  <td colspan="6" class="td-empty">Belum ada laporan masuk untuk tanggal ini.</td>
                </tr>
              {:else}
                {#each laporanByRombel as item}
                  <tr class="summary-row">
                    <td class="rombel-name">{item.rombel}</td>
                    <td>{item.total_siswa}</td>
                    <td>
                      <div class="fill-stat">
                        <span class="count">{item.total_laporan}</span>
                        <div class="mini-bar">
                          <div class="bar-progress" style="width: {(item.total_laporan/item.total_siswa)*100}%"></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="percentage-stat">
                        <span class="value">{item.avg_puasa_penuh.toFixed(0)}%</span>
                        <div class="mini-bar gold">
                          <div class="bar-progress" style="width: {item.avg_puasa_penuh}%"></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="percentage-stat">
                        <span class="value">{item.avg_sholat.toFixed(0)}%</span>
                        <div class="mini-bar blue">
                          <div class="bar-progress" style="width: {item.avg_sholat}%"></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button 
                        class="btn-detail"
                        onclick={() => { selectedRombel = item.rombel; fetchDetailByRombel(); }}
                      >
                        DETAIL
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  {:else}
    <section class="detail-view">
      <div class="detail-header glass-card">
        <div class="detail-header-info">
          <button class="btn-back" onclick={backToSummary}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Kembali
          </button>
          <div class="title-meta">
            <h2 class="playfair">Detail: {selectedRombel}</h2>
            <p class="date-text">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div class="detail-stats">
          <div class="stat-card">
            <span class="val">{detailSheets.length}</span>
            <span class="lbl">Siswa Mengisi</span>
          </div>
          <div class="stat-card gold">
            <span class="val">{detailSheets.filter(s => s.status_puasa === 'PENUH').length}</span>
            <span class="lbl">Puasa Penuh</span>
          </div>
          <div class="stat-card blue">
            <span class="val">{detailSheets.filter(s => parseJSONField(s.sholat_fardhu).length === 5).length}</span>
            <span class="lbl">Sholat 5 Waktu</span>
          </div>
        </div>
      </div>

      <div class="glass-card table-card">
        <div class="table-wrapper">
          <table class="cinematic-table detail-table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>Puasa</th>
                <th>Sholat Fardhu</th>
                <th>Sunnah & Kebiasaan</th>
                <th>Tadarus</th>
              </tr>
            </thead>
            <tbody>
              {#each detailSheets as sheet}
                <tr class="detail-row">
                  <td class="student-info">
                    <span class="name">{sheet.fullname}</span>
                    <span class="nis">{sheet.nis}</span>
                  </td>
                  <td>
                    <div class="status-wrap">
                      <span class="status-badge {getStatusClass(sheet.status_puasa)}">
                        {getStatusLabel(sheet.status_puasa)}
                      </span>
                      {#if sheet.alasan_tidak_puasa}
                        <p class="reason">{sheet.alasan_tidak_puasa}</p>
                      {/if}
                    </div>
                  </td>
                  <td>
                    <div class="pill-cloud">
                      {#each parseJSONField(sheet.sholat_fardhu) as sholat}
                        <span class="pill prayer">{sholat}</span>
                      {/each}
                    </div>
                  </td>
                  <td>
                    <div class="pill-cloud">
                      {#each parseJSONField(sheet.ibadah_sunnah) as sunnah}
                        <span class="pill sunnah">{sunnah}</span>
                      {/each}
                      {#each parseJSONField(sheet.kebiasaan) as habit}
                        <span class="pill habit">{habit}</span>
                      {/each}
                    </div>
                  </td>
                  <td class="tadarus-cell">
                    {sheet.tadarus || '-'}
                  </td>
                </tr>
              {:else}
                <tr>
                  <td colspan="5" class="td-empty">Belum ada detail laporan.</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .laporan-container {
    max-width: 1100px;
    margin: 0 auto;
    padding-bottom: 5rem;
  }

  /* Header */
  .page-header {
    text-align: center;
    margin-bottom: 3.5rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border: 1px solid rgba(197, 160, 89, 0.4);
    border-radius: 100px;
    color: #c5a059;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 1rem;
    background: rgba(197, 160, 89, 0.05);
  }

  .page-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.5rem;
    color: #fff;
    margin: 0;
    line-height: 1.1;
    text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }

  .page-subtitle {
    color: rgba(224, 216, 195, 0.6);
    font-size: 1.1rem;
    margin-top: 0.75rem;
    font-weight: 300;
  }

  .header-nav {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  .btn-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #e0d8c3;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    transition: all 0.3s ease;
  }

  .btn-nav:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #c5a059;
    color: #fff;
    transform: translateY(-2px);
  }

  /* Common UI */
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  }

  .playfair {
    font-family: 'Playfair Display', serif;
  }

  /* Summary View */
  .view-controls {
    display: flex;
    justify-content: center;
    padding: 1.5rem;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .filter-group label {
    font-size: 0.9rem;
    color: #c5a059;
    font-weight: 600;
  }

  .filter-group input {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 0.5rem 1rem;
    color: #fff;
    font-family: inherit;
    outline: none;
  }

  .filter-group input:focus {
    border-color: #c5a059;
  }

  .table-card {
    padding: 0;
    overflow: hidden;
  }

  .card-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .card-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #e0d8c3;
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
    padding: 1.25rem 2rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(224, 216, 195, 0.4);
    font-weight: 700;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(0,0,0,0.1);
  }

  .cinematic-table td {
    padding: 1.25rem 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    color: #e0d8c3;
    font-size: 0.95rem;
  }

  .cinematic-table tr:last-child td {
    border-bottom: none;
  }

  .cinematic-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .rombel-name {
    font-weight: 700;
    color: #fff;
    font-size: 1.1rem;
  }

  .fill-stat, .percentage-stat {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 120px;
  }

  .mini-bar {
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    overflow: hidden;
  }

  .bar-progress {
    height: 100%;
    background: #c5a059;
    border-radius: 10px;
  }

  .mini-bar.gold .bar-progress { background: linear-gradient(90deg, #c5a059, #e0d8c3); }
  .mini-bar.blue .bar-progress { background: linear-gradient(90deg, #3b82f6, #60a5fa); }

  .count, .value {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .btn-detail {
    background: transparent;
    border: 1px solid rgba(197, 160, 89, 0.4);
    color: #c5a059;
    padding: 0.4rem 1rem;
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-detail:hover {
    background: #c5a059;
    color: #000;
    box-shadow: 0 0 15px rgba(197, 160, 89, 0.3);
  }

  /* Detail View */
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 2rem;
  }

  .detail-header-info {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .btn-back {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: none;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(224, 216, 195, 0.6);
    padding: 0.5rem 1rem;
    border-radius: 100px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-back:hover {
    border-color: #fff;
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  .title-meta h2 {
    font-size: 2rem;
    margin: 0;
    color: #fff;
  }

  .date-text {
    margin: 0.25rem 0 0;
    color: #c5a059;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .detail-stats {
    display: flex;
    gap: 1.5rem;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 1rem 1.5rem;
    border-radius: 16px;
    min-width: 100px;
  }

  .stat-card .val {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
  }

  .stat-card .lbl {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.5rem;
    opacity: 0.5;
  }

  .stat-card.gold .val { color: #c5a059; }
  .stat-card.blue .val { color: #3b82f6; }

  .student-info {
    display: flex;
    flex-direction: column;
  }

  .student-info .name {
    font-weight: 700;
    color: #fff;
  }

  .student-info .nis {
    font-size: 0.75rem;
    opacity: 0.4;
    letter-spacing: 0.05em;
  }

  .status-badge {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.3rem 0.75rem;
    border-radius: 100px;
    display: inline-block;
  }

  .status-full { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
  .status-half { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
  .status-none { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

  .reason {
    margin: 0.4rem 0 0;
    font-size: 0.8rem;
    font-style: italic;
    color: #fca5a5;
    opacity: 0.8;
  }

  .pill-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: 300px;
  }

  .pill {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    background: rgba(255,255,255,0.05);
  }

  .pill.prayer { color: #818cf8; border: 1px solid rgba(129, 140, 248, 0.2); }
  .pill.sunnah { color: #f472b6; border: 1px solid rgba(244, 114, 182, 0.2); }
  .pill.habit { color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.2); }

  .tadarus-cell {
    font-style: italic;
    color: #e0d8c3;
    opacity: 0.9;
  }

  .td-loading, .td-empty {
    text-align: center;
    padding: 4rem !important;
    opacity: 0.5;
  }

  .pulse-text {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @media (max-width: 900px) {
    .detail-header { flex-direction: column; align-items: flex-start; }
    .detail-header-info { flex-direction: column; align-items: flex-start; gap: 1rem; }
  }

  @media (max-width: 600px) {
    .page-title { font-size: 2.5rem; }
    .stat-card { padding: 0.75rem 1rem; min-width: 80px; }
    .stat-card .val { font-size: 1.5rem; }
  }
</style>
