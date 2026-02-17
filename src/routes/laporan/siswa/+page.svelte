<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	let nis = $state('');
	let loading = $state(false);
	let error = $state('');
	let studentData = $state<any>(null);
	let searchInput = $state<HTMLInputElement>();
	let profileCard = $state<HTMLElement>();
	let sheetsContainer = $state<HTMLElement>();

	async function searchStudent() {
		if (!nis.trim()) {
			error = 'Masukkan NIS terlebih dahulu';
			return;
		}

		loading = true;
		error = '';
		studentData = null;

		try {
			const response = await fetch(`/api/sheet?nis=${encodeURIComponent(nis)}`);
			
			if (!response.ok) {
				throw new Error('Siswa tidak ditemukan');
			}

		const data = await response.json() as { student: any };
		studentData = data.student;

			// Animate entrance
			setTimeout(() => {
				if (profileCard) {
					gsap.fromTo(
						profileCard,
						{ opacity: 0, y: -30 },
						{ opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
					);
				}
				if (sheetsContainer) {
					const cards = sheetsContainer.querySelectorAll('.sheet-card');
					gsap.fromTo(
						cards,
						{ opacity: 0, y: 20 },
						{
							opacity: 1,
							y: 0,
							duration: 0.5,
							stagger: 0.1,
							ease: 'power2.out',
							delay: 0.2
						}
					);
				}
			}, 50);
		} catch (err: any) {
			error = err.message || 'Terjadi kesalahan saat mengambil data';
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			searchStudent();
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('id-ID', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(date);
	}

	function getSholatSummary(sholatFardhu: any) {
		if (!sholatFardhu) return 'Tidak ada data';
		const sholats = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
		const completed = sholats.filter(s => sholatFardhu[s] === true).length;
		return `${completed}/5 sholat`;
	}

	function getIbadahSunnahList(ibadahSunnah: any) {
		if (!ibadahSunnah || typeof ibadahSunnah !== 'object') return [];
		return Object.entries(ibadahSunnah)
			.filter(([_, value]) => value === true)
			.map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
	}

	function getKebiasaanList(kebiasaan: any) {
		if (!kebiasaan || typeof kebiasaan !== 'object') return [];
		return Object.entries(kebiasaan)
			.filter(([_, value]) => value === true)
			.map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
	}

	onMount(() => {
		// Animate search bar entrance
		if (searchInput) {
			gsap.fromTo(
				'.search-container',
				{ opacity: 0, scale: 0.95 },
				{ opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }
			);
		}
	});
</script>

<svelte:head>
	<title>Laporan Siswa - Ramadhan Sheet</title>
</svelte:head>

<div class="page-container">
	<div class="header-section">
		<h1 class="page-title">Laporan Siswa</h1>
		<p class="page-subtitle">Cari dan lihat catatan harian siswa berdasarkan NIS</p>
	</div>

	<div class="search-container">
		<div class="search-box">
			<input
				bind:this={searchInput}
				bind:value={nis}
				onkeypress={handleKeyPress}
				type="text"
				placeholder="Masukkan NIS siswa..."
				class="search-input"
			/>
			<button onclick={searchStudent} disabled={loading} class="search-button">
				{#if loading}
					<span class="spinner"></span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="11" cy="11" r="8"></circle>
						<path d="m21 21-4.35-4.35"></path>
					</svg>
					Cari
				{/if}
			</button>
		</div>
	</div>

	{#if error}
		<div class="error-message">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			{error}
		</div>
	{/if}

	{#if studentData}
		<div class="content-section">
			<div bind:this={profileCard} class="profile-card">
				<div class="profile-header">
					<div class="profile-avatar">
						<span class="avatar-text">{studentData.nama_lengkap?.charAt(0) || 'S'}</span>
					</div>
					<div class="profile-info">
						<h2 class="student-name">{studentData.nama_lengkap}</h2>
						<div class="student-meta">
							<span class="meta-item">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
									<circle cx="9" cy="7" r="4"></circle>
									<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
									<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
								</svg>
								NIS: {studentData.nis}
							</span>
							<span class="meta-item">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
									<path d="M6 12v5c3 3 9 3 12 0v-5"></path>
								</svg>
								Rombel: {studentData.rombel}
							</span>
						</div>
					</div>
				</div>
				<div class="profile-stats">
					<div class="stat-item">
						<span class="stat-value">{studentData.sheets?.length || 0}</span>
						<span class="stat-label">Total Catatan</span>
					</div>
					<div class="stat-divider"></div>
					<div class="stat-item">
						<span class="stat-value">
							{studentData.sheets?.filter((s: any) => s.status_puasa === 'puasa').length || 0}
						</span>
						<span class="stat-label">Hari Puasa</span>
					</div>
				</div>
			</div>

			<div bind:this={sheetsContainer} class="sheets-section">
				<h3 class="section-title">Catatan Harian</h3>

				{#if studentData.sheets && studentData.sheets.length > 0}
					<div class="timeline">
						{#each studentData.sheets as sheet, index}
							<div class="sheet-card">
								<div class="timeline-marker">
									<div class="marker-dot"></div>
									{#if index < studentData.sheets.length - 1}
										<div class="marker-line"></div>
									{/if}
								</div>

								<div class="sheet-content">
									<div class="sheet-date">{formatDate(sheet.tanggal)}</div>

									<div class="sheet-grid">
										<div class="sheet-item">
											<div class="item-icon sholat">🕌</div>
											<div class="item-details">
												<span class="item-label">Sholat Fardhu</span>
												<span class="item-value">{getSholatSummary(sheet.sholat_fardhu)}</span>
											</div>
										</div>

										<div class="sheet-item">
											<div class="item-icon puasa">🌙</div>
											<div class="item-details">
												<span class="item-label">Status Puasa</span>
												<span class="item-value status-{sheet.status_puasa}">
													{sheet.status_puasa === 'puasa' ? 'Puasa' : 'Tidak Puasa'}
												</span>
												{#if sheet.status_puasa === 'tidak_puasa' && sheet.alasan_tidak_puasa}
													<span class="item-reason">{sheet.alasan_tidak_puasa}</span>
												{/if}
											</div>
										</div>

										{#if sheet.tadarus}
											<div class="sheet-item">
												<div class="item-icon tadarus">📖</div>
												<div class="item-details">
													<span class="item-label">Tadarus</span>
													<span class="item-value">{sheet.tadarus}</span>
												</div>
											</div>
										{/if}

										{#if getIbadahSunnahList(sheet.ibadah_sunnah).length > 0}
											<div class="sheet-item full-width">
												<div class="item-icon ibadah">✨</div>
												<div class="item-details">
													<span class="item-label">Ibadah Sunnah</span>
													<div class="tag-list">
														{#each getIbadahSunnahList(sheet.ibadah_sunnah) as ibadah}
															<span class="tag">{ibadah}</span>
														{/each}
													</div>
												</div>
											</div>
										{/if}

										{#if getKebiasaanList(sheet.kebiasaan).length > 0}
											<div class="sheet-item full-width">
												<div class="item-icon kebiasaan">🌟</div>
												<div class="item-details">
													<span class="item-label">Kebiasaan Baik</span>
													<div class="tag-list">
														{#each getKebiasaanList(sheet.kebiasaan) as habit}
															<span class="tag">{habit}</span>
														{/each}
													</div>
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="64"
							height="64"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
							<polyline points="14 2 14 8 20 8"></polyline>
							<line x1="12" y1="18" x2="12" y2="12"></line>
							<line x1="9" y1="15" x2="15" y2="15"></line>
						</svg>
						<p>Belum ada catatan harian untuk siswa ini</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	}

	.page-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
		padding: 3rem 1.5rem;
		position: relative;
	}

	.page-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: radial-gradient(circle at 20% 30%, rgba(147, 197, 253, 0.05) 0%, transparent 50%),
			radial-gradient(circle at 80% 70%, rgba(196, 181, 253, 0.05) 0%, transparent 50%);
		pointer-events: none;
	}

	.header-section {
		max-width: 1200px;
		margin: 0 auto 3rem;
		text-align: center;
		position: relative;
		z-index: 1;
	}

	.page-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 3.5rem;
		font-weight: 700;
		color: #f8fafc;
		margin: 0 0 0.5rem;
		letter-spacing: -0.02em;
		text-shadow: 0 2px 20px rgba(148, 163, 184, 0.3);
	}

	.page-subtitle {
		font-size: 1.125rem;
		color: #cbd5e1;
		margin: 0;
		font-weight: 400;
	}

	.search-container {
		max-width: 600px;
		margin: 0 auto 3rem;
		position: relative;
		z-index: 1;
	}

	.search-box {
		display: flex;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(20px);
		padding: 0.5rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}

	.search-input {
		flex: 1;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		color: #f8fafc;
		font-size: 1rem;
		font-weight: 500;
		outline: none;
		transition: all 0.3s ease;
	}

	.search-input::placeholder {
		color: #94a3b8;
	}

	.search-input:focus {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(147, 197, 253, 0.4);
		box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.1);
	}

	.search-button {
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		border: none;
		border-radius: 12px;
		color: white;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.3s ease;
		box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
	}

	.search-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
	}

	.search-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.search-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-message {
		max-width: 600px;
		margin: 0 auto 2rem;
		padding: 1rem 1.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 12px;
		color: #fca5a5;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-weight: 500;
		position: relative;
		z-index: 1;
	}

	.content-section {
		max-width: 1200px;
		margin: 0 auto;
		position: relative;
		z-index: 1;
	}

	.profile-card {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 2.5rem;
		margin-bottom: 3rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}

	.profile-header {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.profile-avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
		flex-shrink: 0;
	}

	.avatar-text {
		font-size: 2.5rem;
		font-weight: 700;
		color: white;
		font-family: 'Playfair Display', serif;
	}

	.profile-info {
		flex: 1;
	}

	.student-name {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 2rem;
		font-weight: 700;
		color: #f8fafc;
		margin: 0 0 0.75rem;
		letter-spacing: -0.01em;
	}

	.student-meta {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #cbd5e1;
		font-size: 0.95rem;
		font-weight: 500;
	}

	.meta-item svg {
		color: #94a3b8;
	}

	.profile-stats {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #f8fafc;
		font-family: 'Playfair Display', serif;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.stat-divider {
		width: 1px;
		height: 48px;
		background: rgba(255, 255, 255, 0.1);
	}

	.sheets-section {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		padding: 2.5rem;
	}

	.section-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.75rem;
		font-weight: 700;
		color: #f8fafc;
		margin: 0 0 2rem;
		letter-spacing: -0.01em;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.sheet-card {
		display: flex;
		gap: 1.5rem;
		position: relative;
	}

	.timeline-marker {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 0.5rem;
		flex-shrink: 0;
	}

	.marker-dot {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
		flex-shrink: 0;
	}

	.marker-line {
		width: 2px;
		flex: 1;
		min-height: 100%;
		background: linear-gradient(180deg, #3b82f6 0%, rgba(59, 130, 246, 0.2) 100%);
		margin-top: 0.5rem;
	}

	.sheet-content {
		flex: 1;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 1.75rem;
		margin-bottom: 1.5rem;
		transition: all 0.3s ease;
	}

	.sheet-content:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
		transform: translateX(4px);
	}

	.sheet-date {
		font-size: 1rem;
		font-weight: 600;
		color: #93c5fd;
		margin-bottom: 1.25rem;
		letter-spacing: 0.01em;
	}

	.sheet-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.25rem;
	}

	.sheet-item {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.sheet-item.full-width {
		grid-column: 1 / -1;
	}

	.item-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.item-icon.sholat {
		background: rgba(34, 197, 94, 0.15);
	}

	.item-icon.puasa {
		background: rgba(147, 51, 234, 0.15);
	}

	.item-icon.tadarus {
		background: rgba(59, 130, 246, 0.15);
	}

	.item-icon.ibadah {
		background: rgba(251, 191, 36, 0.15);
	}

	.item-icon.kebiasaan {
		background: rgba(236, 72, 153, 0.15);
	}

	.item-details {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex: 1;
	}

	.item-label {
		font-size: 0.8125rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.item-value {
		font-size: 1rem;
		color: #f8fafc;
		font-weight: 600;
	}

	.item-value.status-puasa {
		color: #86efac;
	}

	.item-value.status-tidak_puasa {
		color: #fca5a5;
	}

	.item-reason {
		font-size: 0.875rem;
		color: #cbd5e1;
		font-style: italic;
		margin-top: 0.25rem;
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.tag {
		padding: 0.375rem 0.875rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		font-size: 0.8125rem;
		color: #e2e8f0;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.tag:hover {
		background: rgba(255, 255, 255, 0.12);
		transform: translateY(-1px);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-state svg {
		color: #475569;
		margin-bottom: 1.5rem;
	}

	.empty-state p {
		font-size: 1.125rem;
		color: #94a3b8;
		margin: 0;
	}

	@media (max-width: 768px) {
		.page-container {
			padding: 2rem 1rem;
		}

		.page-title {
			font-size: 2.5rem;
		}

		.page-subtitle {
			font-size: 1rem;
		}

		.search-box {
			flex-direction: column;
		}

		.profile-header {
			flex-direction: column;
			text-align: center;
		}

		.student-meta {
			justify-content: center;
		}

		.profile-stats {
			justify-content: center;
		}

		.sheet-grid {
			grid-template-columns: 1fr;
		}

		.sheets-section {
			padding: 1.5rem;
		}

		.timeline-marker {
			display: none;
		}

		.sheet-card {
			gap: 0;
		}
	}
</style>
