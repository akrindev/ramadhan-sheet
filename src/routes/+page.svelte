<script lang="ts">
    import gsap from "gsap";
    import { onMount } from "svelte";

    type ToastType = "success" | "error" | "";

    let nis = $state("");
    let studentFound = $state(false);
    let identityLoading = $state(false);
    let submitLoading = $state(false);
    let message = $state({ text: "", type: "" as ToastType });
    let isCompleted = $state(false);

    let fullname = $state("");
    let rombel = $state("");

    let tanggal = $state(new Date().toISOString().split("T")[0]);
    let sholatFardhu = $state<string[]>([]);
    let statusPuasa = $state("PENUH");
    let alasanTidakPuasa = $state("");
    let ibadahSunnah = $state<string[]>([]);
    let tadarus = $state("");
    let kebiasaan = $state<string[]>([]);

    // Refs for animation
    let titleRef = $state<HTMLElement>();
    let formContainerRef = $state<HTMLElement>();
    let identityCardRef = $state<HTMLElement>();
    let reportCardRef = $state<HTMLElement>();
    let completionCardRef = $state<HTMLElement>();

    const statusPuasaOptions = ["PENUH", "SETENGAH HARI", "TIDAK PUASA"];
    const fardhuOptions = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"];
    const sunnahOptions = ["Sahur", "Dhuha", "Tarawih", "Tahajud", "Sedekah"];
    const kebiasaanOptions = [
        "bangun pagi",
        "beribadah",
        "berolahraga",
        "makan sehat",
        "gemar belajar",
        "bermasyarakat",
        "tidur cepat",
    ];

    function getPayloadMessage(payload: unknown, fallback: string) {
        if (
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload
        ) {
            const { error } = payload as { error?: unknown };
            if (typeof error === "string" && error.trim().length > 0) {
                return error;
            }
        }
        return fallback;
    }

    function isStudentPayload(
        payload: unknown,
    ): payload is { nis: string; fullname: string; rombel: string } {
        if (typeof payload !== "object" || payload === null) {
            return false;
        }

        const candidate = payload as {
            nis?: unknown;
            fullname?: unknown;
            rombel?: unknown;
        };

        return (
            typeof candidate.nis === "string" &&
            typeof candidate.fullname === "string" &&
            typeof candidate.rombel === "string"
        );
    }

    function toggleItem(list: string[], item: string) {
        return list.includes(item)
            ? list.filter((value) => value !== item)
            : [...list, item];
    }

    function resetIdentity() {
        nis = "";
        fullname = "";
        rombel = "";
        studentFound = false;
        message = { text: "", type: "" };
        isCompleted = false;

        // Animate resetting
        if (identityCardRef) {
            gsap.fromTo(
                identityCardRef,
                { y: -10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
            );
        }
    }

    function resetForm() {
        sholatFardhu = [];
        statusPuasa = "PENUH";
        alasanTidakPuasa = "";
        ibadahSunnah = [];
        tadarus = "";
        kebiasaan = [];
        tanggal = new Date().toISOString().split("T")[0];
        isCompleted = false;
        message = { text: "", type: "" };

        // Re-trigger entrance
        setTimeout(() => {
            animateEntrance();
        }, 100);
    }

    function goToHome() {
        resetIdentity();
        resetForm();
    }

    const IDENTITY_API_PATH = "/api/identity/student";

    async function lookupStudent() {
        if (!nis.trim()) {
            return;
        }

        message = { text: "", type: "" };
        identityLoading = true;

        try {
            const response = await fetch(
                `${IDENTITY_API_PATH}?nis=${encodeURIComponent(nis.trim())}`,
            );
            const payload: unknown = await response.json();

            if (!response.ok) {
                studentFound = false;
                message = {
                    text: getPayloadMessage(
                        payload,
                        "Data siswa tidak ditemukan",
                    ),
                    type: "error",
                };
                shakeCard(identityCardRef);
                return;
            }

            if (!isStudentPayload(payload)) {
                studentFound = false;
                message = {
                    text: "Format data siswa tidak valid",
                    type: "error",
                };
                shakeCard(identityCardRef);
                return;
            }

            fullname = payload.fullname;
            rombel = payload.rombel;
            nis = payload.nis;
            studentFound = true;
            message = { text: "Data siswa ditemukan.", type: "success" };

            // Animate report card entrance
            setTimeout(() => {
                if (reportCardRef) {
                    gsap.fromTo(
                        reportCardRef,
                        {
                            y: 50,
                            opacity: 0,
                            clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
                        },
                        {
                            y: 0,
                            opacity: 1,
                            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                            duration: 0.8,
                            ease: "power3.out",
                        },
                    );
                }
            }, 50);
        } catch {
            studentFound = false;
            message = {
                text: "Gagal terhubung ke layanan identitas siswa",
                type: "error",
            };
            shakeCard(identityCardRef);
        } finally {
            identityLoading = false;
        }
    }

    async function submitSheet() {
        if (!studentFound) {
            return;
        }

        if (statusPuasa !== "PENUH" && !alasanTidakPuasa.trim()) {
            message = {
                text: "Alasan wajib diisi jika puasa tidak penuh",
                type: "error",
            };
            shakeCard(reportCardRef);
            return;
        }

        submitLoading = true;
        message = { text: "", type: "" };

        try {
            const response = await fetch("/api/sheet", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nis,
                    fullname,
                    rombel,
                    tanggal,
                    sholat_fardhu: sholatFardhu,
                    status_puasa: statusPuasa,
                    alasan_tidak_puasa:
                        statusPuasa === "PENUH" ? "" : alasanTidakPuasa.trim(),
                    ibadah_sunnah: ibadahSunnah,
                    tadarus: tadarus.trim(),
                    kebiasaan,
                }),
            });

            const payload = (await response.json()) as {
                error?: string;
                duplicate?: boolean;
                existingDate?: string;
            };
            if (!response.ok) {
                if (payload.duplicate && payload.existingDate) {
                    message = {
                        text: `${payload.error} (${new Date(payload.existingDate).toLocaleDateString("id-ID")})`,
                        type: "error",
                    };
                } else {
                    message = {
                        text: payload.error || "Gagal menyimpan laporan",
                        type: "error",
                    };
                }
                shakeCard(reportCardRef);
                return;
            }

            isCompleted = true;
            message = { text: "", type: "" };

            // Animate completion
            setTimeout(() => {
                animateCompletion();
            }, 50);
        } catch {
            message = {
                text: "Terjadi kesalahan saat mengirim laporan",
                type: "error",
            };
        } finally {
            submitLoading = false;
        }
    }

    function animateEntrance() {
        const tl = gsap.timeline();

        // Split title characters (simple version)
        if (titleRef) {
            const chars = titleRef.innerText
                .split("")
                .map((c) => `<span>${c}</span>`)
                .join("");
            titleRef.innerHTML = chars;
            const spans = titleRef.querySelectorAll("span");

            tl.fromTo(
                spans,
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    stagger: 0.03,
                    duration: 0.8,
                    ease: "back.out(1.7)",
                },
            );
        }

        if (formContainerRef) {
            tl.fromTo(
                formContainerRef.children,
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    stagger: 0.1,
                    duration: 0.6,
                    ease: "power2.out",
                },
                "-=0.4",
            );
        }
    }

    function animateCompletion() {
        if (!completionCardRef) return;

        const tl = gsap.timeline();

        tl.fromTo(
            completionCardRef,
            { scale: 0.9, opacity: 0 },
            {
                scale: 1,
                opacity: 1,
                duration: 0.6,
                ease: "elastic.out(1, 0.75)",
            },
        );

        const elements = completionCardRef.querySelectorAll(".stagger-item");
        tl.fromTo(
            elements,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.1, duration: 0.5 },
            "-=0.3",
        );
    }

    function shakeCard(element: HTMLElement | undefined) {
        if (!element) return;
        gsap.to(element, { x: -10, duration: 0.1, yoyo: true, repeat: 5 });
    }

    onMount(() => {
        animateEntrance();
    });
</script>

<svelte:head>
    <title>Ramadhan Sheet Harian</title>
</svelte:head>

<div class="page-container">
    {#if isCompleted}
        <section class="completion-view" bind:this={completionCardRef}>
            <div class="glow-bg"></div>
            <div class="completion-content">
                <div class="success-icon stagger-item">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path class="check-path" d="M8 12l2.5 2.5L16 9" />
                    </svg>
                </div>
                <h1 class="stagger-item">Alhamdulillah</h1>
                <p class="completion-message stagger-item">
                    Laporan Ramadhan untuk <strong>{fullname}</strong> telah tersimpan.
                </p>
                <div class="quote-card stagger-item">
                    <p class="arabic">
                        فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ
                    </p>
                    <p class="translation">
                        "Barang siapa yang berbuat kebaikan sekecil apapun, maka
                        baginya ada pahalanya."
                    </p>
                    <span class="source">(QS. Al-Zalzalah: 7)</span>
                </div>
                <div class="actions stagger-item">
                    <button class="btn-secondary" onclick={resetForm}
                        >Isi Lagi</button
                    >
                    <button class="btn-primary" onclick={goToHome}
                        >Kembali</button
                    >
                </div>
            </div>
        </section>
    {:else}
        <header class="header">
            <div class="brand-top">
                <img
                    src="/logo.png"
                    alt="Logo SMK Diponegoro"
                    class="header-logo"
                    loading="lazy"
                />
                <span class="badge">SMK Diponegoro Karanganyar</span>
            </div>
            <h1 class="cinematic-title" bind:this={titleRef}>
                Ramadhan Sheet Harian
            </h1>
            <p class="subtitle">Catat ibadahmu, raih berkahnya.</p>
        </header>

        <div class="form-container" bind:this={formContainerRef}>
            {#if message.text}
                <div class={`toast ${message.type}`}>
                    {message.text}
                </div>
            {/if}

            <article
                class="glass-card identity-card"
                bind:this={identityCardRef}
            >
                <div class="card-header">
                    <span class="step-number">01</span>
                    <h2>Identitas Siswa</h2>
                </div>

                <div class="input-group">
                    <label for="nis">Nomor Induk Siswa (NIS)</label>
                    <div class="search-row">
                        <input
                            id="nis"
                            type="text"
                            placeholder="Ketik NIS..."
                            bind:value={nis}
                            disabled={studentFound ||
                                identityLoading ||
                                submitLoading}
                            class:has-value={nis.length > 0}
                        />
                        {#if studentFound}
                            <button
                                class="btn-icon"
                                onclick={resetIdentity}
                                title="Ganti Siswa"
                            >
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
                                    ><path d="M18 6 6 18" /><path
                                        d="m6 6 12 12"
                                    /></svg
                                >
                            </button>
                        {:else}
                            <button
                                class="btn-search"
                                onclick={lookupStudent}
                                disabled={!nis.trim() || identityLoading}
                            >
                                {identityLoading ? "..." : "Cari"}
                            </button>
                        {/if}
                    </div>
                </div>

                <div class="info-grid" class:visible={studentFound}>
                    <div class="info-item">
                        <span class="label-text">Nama Lengkap</span>
                        <div class="info-value">{fullname || "-"}</div>
                    </div>
                    <div class="info-item">
                        <span class="label-text">Rombel</span>
                        <div class="info-value">{rombel || "-"}</div>
                    </div>
                </div>
            </article>

            {#if studentFound}
                <article
                    class="glass-card report-card"
                    bind:this={reportCardRef}
                >
                    <div class="card-header">
                        <span class="step-number">02</span>
                        <h2>Laporan Ibadah</h2>
                    </div>

                    <div class="form-section">
                        <label class="section-label" for="tanggal"
                            >Tanggal Laporan</label
                        >
                        <input
                            id="tanggal"
                            type="date"
                            bind:value={tanggal}
                            class="date-input"
                        />
                    </div>

                    <fieldset class="form-section">
                        <legend class="section-label">Sholat Fardhu</legend>
                        <div class="grid-options">
                            {#each fardhuOptions as option}
                                <button
                                    type="button"
                                    class="option-btn"
                                    class:active={sholatFardhu.includes(option)}
                                    onclick={() =>
                                        (sholatFardhu = toggleItem(
                                            sholatFardhu,
                                            option,
                                        ))}
                                >
                                    {option}
                                </button>
                            {/each}
                        </div>
                    </fieldset>

                    <fieldset class="form-section">
                        <legend class="section-label">Status Puasa</legend>
                        <div class="puasa-options">
                            {#each statusPuasaOptions as option}
                                <button
                                    type="button"
                                    class="puasa-btn"
                                    class:active={statusPuasa === option}
                                    onclick={() => (statusPuasa = option)}
                                >
                                    <span class="dot"></span>
                                    {option}
                                </button>
                            {/each}
                        </div>

                        {#if statusPuasa !== "PENUH"}
                            <div class="reason-box">
                                <label for="alasan"
                                    >Alasan tidak puasa penuh</label
                                >
                                <textarea
                                    id="alasan"
                                    bind:value={alasanTidakPuasa}
                                    placeholder="Jelaskan alasanmu..."
                                    required={statusPuasa !== "PENUH"}
                                ></textarea>
                            </div>
                        {/if}
                    </fieldset>

                    <fieldset class="form-section">
                        <legend class="section-label">Ibadah Sunnah</legend>
                        <div class="grid-options">
                            {#each sunnahOptions as option}
                                <button
                                    type="button"
                                    class="option-btn"
                                    class:active={ibadahSunnah.includes(option)}
                                    onclick={() =>
                                        (ibadahSunnah = toggleItem(
                                            ibadahSunnah,
                                            option,
                                        ))}
                                >
                                    {option}
                                </button>
                            {/each}
                        </div>
                    </fieldset>

                    <div class="form-section">
                        <label class="section-label" for="tadarus"
                            >Tadarus Al-Qur'an</label
                        >
                        <input
                            id="tadarus"
                            type="text"
                            bind:value={tadarus}
                            placeholder="Juz / Surah / Ayat"
                            class="text-input"
                        />
                    </div>

                    <fieldset class="form-section">
                        <legend class="section-label"
                            >7 Kebiasaan Anak Indonesia Hebat</legend
                        >
                        <div class="chips-container">
                            {#each kebiasaanOptions as option}
                                <button
                                    type="button"
                                    class="chip-btn"
                                    class:active={kebiasaan.includes(option)}
                                    onclick={() =>
                                        (kebiasaan = toggleItem(
                                            kebiasaan,
                                            option,
                                        ))}
                                >
                                    {option}
                                </button>
                            {/each}
                        </div>
                    </fieldset>

                    <div class="action-footer">
                        <button
                            class="btn-submit"
                            type="button"
                            onclick={submitSheet}
                            disabled={submitLoading}
                        >
                            <span class="btn-text"
                                >{submitLoading
                                    ? "MENYIMPAN..."
                                    : "SIMPAN LAPORAN"}</span
                            >
                            <div class="btn-glare"></div>
                        </button>
                    </div>
                </article>
            {/if}
        </div>
    {/if}
</div>

<style>
    :global(body) {
        background-color: #0a0a0a;
    }

    .page-container {
        max-width: 680px;
        margin: 0 auto;
        padding-bottom: 4rem;
    }

    /* Header */
    .header {
        text-align: center;
        margin-bottom: 2.5rem;
        position: relative;
    }

    .brand-top {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 0.45rem;
        margin-bottom: 0.8rem;
    }

    .header-logo {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        object-fit: cover;
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

    .cinematic-title {
        font-family: "Playfair Display", serif;
        font-size: 2.4rem;
        color: #e0d8c3;
        margin: 0;
        line-height: 1.1;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    /* Target spans generated by JS */
    :global(.cinematic-title span) {
        display: inline-block;
    }

    .subtitle {
        color: rgba(224, 216, 195, 0.6);
        font-size: 1.1rem;
        margin-top: 0.75rem;
        font-weight: 300;
    }

    /* Cards */
    .glass-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 1.7rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding-bottom: 1rem;
    }

    .step-number {
        font-family: "Playfair Display", serif;
        font-size: 2.5rem;
        color: rgba(197, 160, 89, 0.2);
        font-weight: 700;
        line-height: 1;
    }

    h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #e0d8c3;
    }

    /* Identity Form */
    .input-group label,
    .label-text {
        display: block;
        color: rgba(224, 216, 195, 0.8);
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }

    .search-row {
        display: flex;
        gap: 0.5rem;
        position: relative;
    }

    input[type="text"],
    input[type="date"],
    textarea {
        width: 100%;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 0.9rem 1.05rem;
        color: #fff;
        font-family: "Inter", sans-serif;
        font-size: 1rem;
        transition: all 0.3s ease;
    }

    input:focus,
    textarea:focus {
        outline: none;
        border-color: #c5a059;
        box-shadow: 0 0 0 2px rgba(197, 160, 89, 0.2);
        background: rgba(0, 0, 0, 0.4);
    }

    .btn-search {
        padding: 0 1.5rem;
        background: #c5a059;
        color: #000;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-search:hover:enabled {
        background: #d4b06a;
        transform: translateY(-1px);
    }

    .btn-search:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-icon {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        border-radius: 12px;
        width: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-icon:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-top: 1.5rem;
        opacity: 0.3;
        transition: opacity 0.5s ease;
    }

    .info-grid.visible {
        opacity: 1;
    }

    .info-value {
        font-size: 1.1rem;
        font-weight: 500;
        color: #fff;
        padding-top: 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.5rem;
    }

    /* Report Form */
    .form-section {
        margin-bottom: 2rem;
    }

    fieldset {
        border: none;
        padding: 0;
        margin: 0;
    }

    .section-label {
        display: block;
        font-family: "Playfair Display", serif;
        font-size: 1.1rem;
        color: #c5a059;
        margin-bottom: 1rem;
    }

    .grid-options {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 0.75rem;
    }

    .option-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(224, 216, 195, 0.7);
        padding: 0.75rem;
        border-radius: 12px;
        transition: all 0.3s ease;
        font-size: 0.9rem;
    }

    .option-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
    }

    .option-btn.active {
        background: #c5a059;
        color: #000;
        border-color: #c5a059;
        box-shadow: 0 4px 12px rgba(197, 160, 89, 0.3);
        font-weight: 600;
    }

    .puasa-options {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .puasa-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 0.5rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        color: rgba(224, 216, 195, 0.7);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .puasa-btn .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s;
    }

    .puasa-btn.active {
        background: rgba(197, 160, 89, 0.1);
        border-color: #c5a059;
        color: #c5a059;
        transform: translateY(-2px);
    }

    .puasa-btn.active .dot {
        background: #c5a059;
        box-shadow: 0 0 8px #c5a059;
    }

    .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .chip-btn {
        padding: 0.5rem 1rem;
        border-radius: 100px;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(224, 216, 195, 0.8);
        font-size: 0.85rem;
        transition: all 0.2s;
    }

    .chip-btn.active {
        background: #c5a059;
        border-color: #c5a059;
        color: #000;
        font-weight: 600;
    }

    .reason-box textarea {
        min-height: 100px;
    }

    /* Submit Button */
    .action-footer {
        margin-top: 3rem;
    }

    .btn-submit {
        width: 100%;
        padding: 1.25rem;
        background: linear-gradient(135deg, #c5a059 0%, #aa8539 100%);
        border: none;
        border-radius: 16px;
        color: #000;
        font-weight: 700;
        letter-spacing: 0.1em;
        position: relative;
        overflow: hidden;
        transition: all 0.3s;
    }

    .btn-submit:hover:enabled {
        transform: scale(1.02);
        box-shadow: 0 10px 30px rgba(197, 160, 89, 0.2);
    }

    .btn-submit:disabled {
        filter: grayscale(1);
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-glare {
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
        );
        transform: skewX(-20deg);
        transition: left 0.5s;
    }

    .btn-submit:hover .btn-glare {
        left: 200%;
        transition: left 0.75s ease-in-out;
    }

    /* Toast */
    .toast {
        padding: 1rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        text-align: center;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .toast.error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #fca5a5;
    }

    .toast.success {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #6ee7b7;
    }

    /* Completion View */
    .completion-view {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 70vh;
        position: relative;
        padding: 2rem;
    }

    .glow-bg {
        position: absolute;
        width: 300px;
        height: 300px;
        background: radial-gradient(
            circle,
            rgba(197, 160, 89, 0.2) 0%,
            transparent 70%
        );
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 0;
    }

    .completion-content {
        text-align: center;
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 480px;
    }

    .success-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 1.5rem;
        color: #c5a059;
    }

    .check-path {
        stroke-dasharray: 20;
        stroke-dashoffset: 20;
        animation: drawCheck 0.8s ease 0.5s forwards;
    }

    @keyframes drawCheck {
        to {
            stroke-dashoffset: 0;
        }
    }

    .completion-view h1 {
        font-family: "Playfair Display", serif;
        font-size: 2.5rem;
        color: #c5a059;
        margin-bottom: 0.5rem;
    }

    .completion-message {
        color: #e0d8c3;
        margin-bottom: 2rem;
    }

    .completion-message strong {
        color: #fff;
    }

    .quote-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(197, 160, 89, 0.2);
        padding: 1.5rem;
        border-radius: 16px;
        margin-bottom: 2rem;
    }

    .arabic {
        font-family: serif;
        font-size: 1.5rem;
        color: #fff;
        margin-bottom: 0.5rem;
    }

    .translation {
        font-style: italic;
        color: rgba(224, 216, 195, 0.8);
        margin-bottom: 0.5rem;
    }

    .source {
        font-size: 0.8rem;
        color: #c5a059;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        transition: all 0.2s;
    }

    .btn-primary {
        background: #c5a059;
        color: #000;
        border: none;
    }

    .btn-primary:hover {
        background: #d4b06a;
        transform: translateY(-2px);
    }

    .btn-secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e0d8c3;
    }

    .btn-secondary:hover {
        border-color: #fff;
        color: #fff;
    }

    @media (max-width: 600px) {
        .page-container {
            padding-inline: 0.25rem;
        }

        .header {
            margin-bottom: 1.7rem;
        }

        .header-logo {
            width: 42px;
            height: 42px;
        }

        .cinematic-title {
            font-size: 1.85rem;
        }

        .subtitle {
            font-size: 0.95rem;
        }

        .glass-card {
            padding: 1rem;
            border-radius: 18px;
        }

        input[type="text"],
        input[type="date"],
        textarea {
            padding: 0.85rem 0.95rem;
        }

        .search-row {
            gap: 0.4rem;
        }

        .btn-search {
            padding: 0 1rem;
        }

        .puasa-options {
            grid-template-columns: 1fr;
        }
        .actions {
            flex-direction: column;
        }
    }
</style>
