<script lang="ts">
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import gsap from "gsap";
	import { onMount } from "svelte";

	type LayoutData = {
		teacherAuthenticated?: boolean;
	};

	let { children, data } = $props<{ children: import("svelte").Snippet; data: LayoutData }>();

	let logoutLoading = $state(false);

	// State
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let width = $state(0);
	let height = $state(0);
	let particles: Particle[] = [];
	let mouse = { x: -1000, y: -1000 };
	let animationFrameId: number;
	let marqueeTextRef: HTMLElement;
	let marqueeText =
		"RAMADHAN KAREEM • SUCIKAN HATI • TINGKATKAN IMAN • MERAIH BERKAH • ";

	async function logoutTeacher() {
		logoutLoading = true;
		try {
			await fetch("/api/auth/logout", {
				method: "POST",
			});
		} finally {
			logoutLoading = false;
			await goto("/laporan/login", { invalidateAll: true });
		}
	}

	// Particle System
	class Particle {
		x: number;
		y: number;
		size: number;
		speedX: number;
		speedY: number;
		baseAlpha: number;
		alpha: number;

		constructor() {
			this.x = Math.random() * width;
			this.y = Math.random() * height;
			this.size = Math.random() * 2 + 0.5; // Small, elegant particles
			this.speedX = (Math.random() - 0.5) * 0.2; // Very slow movement
			this.speedY = (Math.random() - 0.5) * 0.2;
			this.baseAlpha = Math.random() * 0.5 + 0.1;
			this.alpha = this.baseAlpha;
		}

		update() {
			// Mouse interaction (repel slightly)
			const dx = mouse.x - this.x;
			const dy = mouse.y - this.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const maxDistance = 150;

			if (distance < maxDistance) {
				const forceDirectionX = dx / distance;
				const forceDirectionY = dy / distance;
				const force = (maxDistance - distance) / maxDistance;
				const directionX = forceDirectionX * force * 0.5;
				const directionY = forceDirectionY * force * 0.5;

				this.x -= directionX;
				this.y -= directionY;
			}

			this.x += this.speedX;
			this.y += this.speedY;

			// Wrap around screen
			if (this.x > width) this.x = 0;
			if (this.x < 0) this.x = width;
			if (this.y > height) this.y = 0;
			if (this.y < 0) this.y = height;
		}

		draw() {
			if (!ctx) return;
			ctx.fillStyle = `rgba(197, 160, 89, ${this.alpha})`; // Gold color
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function initParticles() {
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = width;
		canvas.height = height;
		ctx = canvas.getContext("2d");

		particles = [];
		const particleCount = Math.min(width * 0.1, 150); // Responsive count
		for (let i = 0; i < particleCount; i++) {
			particles.push(new Particle());
		}
	}

	function animateParticles() {
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);

		particles.forEach((p) => {
			p.update();
			p.draw();
		});

		animationFrameId = requestAnimationFrame(animateParticles);
	}

	function handleResize() {
		initParticles();
	}

	function handleMouseMove(e: MouseEvent) {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
	}

	// Marquee Animation
	function initMarquee() {
		if (!marqueeTextRef) return;

		// Split text for per-character animation
		const chars = marqueeText.split("");
		// Create 4 repetitions for smooth scrolling
		const repetitions = 4;

		marqueeTextRef.innerHTML = "";

		for (let r = 0; r < repetitions; r++) {
			chars.forEach((char) => {
				const span = document.createElement("span");
				span.textContent = char === " " ? "\u00A0" : char;
				span.style.opacity = "0.5";
				span.style.display = "inline-block";
				span.style.transition = "color 0.3s";
				marqueeTextRef.appendChild(span);
			});
		}

		const spans = marqueeTextRef.querySelectorAll("span");

		// Color wave animation
		gsap.to(spans, {
			color: "#c5a059", // Gold
			textShadow: "0 0 8px rgba(197, 160, 89, 0.4)",
			opacity: 1,
			stagger: {
				each: 0.05,
				repeat: -1,
				yoyo: true,
				from: "start",
			},
			duration: 2,
			ease: "sine.inOut",
		});

		// Horizontal scroll
		gsap.to(marqueeTextRef, {
			xPercent: -25, // Move by 1/4 (since we have 4 repetitions)
			duration: 20,
			ease: "none",
			repeat: -1,
		});
	}

	onMount(() => {
		initParticles();
		animateParticles();
		initMarquee();

		window.addEventListener("resize", handleResize);
		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("mousemove", handleMouseMove);
		};
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/logo.png" />
	<title>Ramadhan Sheet</title>
</svelte:head>

<div class="app-wrapper">
	<canvas bind:this={canvas} class="particle-background"></canvas>

	<nav class="navbar">
		<div class="logo">
			<img src="/logo.png" alt="Logo SMK Diponegoro" class="logo-image" />
			<div class="logo-stack">
				<span class="logo-text">Ramadhan Sheet</span>
				<span class="logo-accent">SMK Diponegoro Karanganyar</span>
			</div>
		</div>

		<div class="desktop-links">
			<a href="/" class:active={$page.url.pathname === "/"}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
				</svg>
				<span>Beranda</span>
			</a>
			{#if data.teacherAuthenticated}
				<a href="/laporan" class:active={$page.url.pathname === "/laporan"}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M4 4h16v16H4z" fill="none" />
						<path d="M7 7h10v2H7zm0 4h6v2H7zm0 4h10v2H7z" />
					</svg>
					<span>Kelas</span>
				</a>
				<a href="/laporan/siswa" class:active={$page.url.pathname.startsWith("/laporan/siswa")}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2c-3.6 0-6.5 2.2-6.5 5v1h13v-1c0-2.8-2.9-5-6.5-5z" />
					</svg>
					<span>Siswa</span>
				</a>
				<button class="desktop-link-btn" onclick={logoutTeacher} disabled={logoutLoading}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M14 3h-4a2 2 0 0 0-2 2v3h2V5h4v14h-4v-3H8v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
						<path d="M3 12l4-4v3h7v2H7v3z" />
					</svg>
					<span>{logoutLoading ? "Keluar..." : "Keluar"}</span>
				</button>
			{:else}
				<a href="/laporan/login" class:active={$page.url.pathname === "/laporan/login"}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3z" />
					</svg>
					<span>Login Guru</span>
				</a>
			{/if}
		</div>
	</nav>

	<main class="content">
		{@render children()}
	</main>

	<nav class="mobile-bottom-nav" class:teacher-auth={Boolean(data.teacherAuthenticated)}>
		<a href="/" class:active={$page.url.pathname === "/"}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
			</svg>
			<span>Beranda</span>
		</a>
		{#if data.teacherAuthenticated}
			<a href="/laporan" class:active={$page.url.pathname.startsWith("/laporan") && !$page.url.pathname.startsWith("/laporan/login")}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M4 4h16v16H4z" fill="none" />
					<path d="M7 7h10v2H7zm0 4h6v2H7zm0 4h10v2H7z" />
				</svg>
				<span>Laporan</span>
			</a>
			<button onclick={logoutTeacher} disabled={logoutLoading}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M14 3h-4a2 2 0 0 0-2 2v3h2V5h4v14h-4v-3H8v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
					<path d="M3 12l4-4v3h7v2H7v3z" />
				</svg>
				<span>{logoutLoading ? "Keluar..." : "Keluar"}</span>
			</button>
		{:else}
			<a href="/laporan/login" class:active={$page.url.pathname.startsWith("/laporan")}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3z" />
				</svg>
				<span>Login Guru</span>
			</a>
		{/if}
	</nav>

	<footer class="cinematic-footer">
		<div class="marquee-container">
			<div class="marquee-track" bind:this={marqueeTextRef}></div>
		</div>
	</footer>
</div>

<style>
	/* Global Styles */
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #0a0a0a; /* Deep Charcoal */
		color: #e0d8c3; /* Parchment */
		font-family: "Inter", sans-serif;
		overflow-x: hidden;
		-webkit-font-smoothing: antialiased;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		font-family: "Playfair Display", serif;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	:global(a) {
		color: inherit;
		text-decoration: none;
		transition: color 0.3s ease;
	}

	:global(button) {
		font-family: inherit;
		cursor: pointer;
	}

	/* Wrapper */
	.app-wrapper {
		position: relative;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		z-index: 1;
	}

	/* Canvas */
	.particle-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		pointer-events: none;
		background: radial-gradient(circle at center, #1a1a1e 0%, #050505 100%);
	}

	/* Navbar */
	.navbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 2rem 4rem;
		position: relative;
		z-index: 50;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.logo-image {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		object-fit: cover;
	}

	.logo-stack {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}

	.logo-text {
		font-family: "Playfair Display", serif;
		font-size: 1.15rem;
		font-weight: 700;
		color: #fff;
	}

	.logo-accent {
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #c5a059;
	}

	.desktop-links {
		display: flex;
		gap: 3rem;
	}

	.desktop-links a,
	.desktop-link-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.38rem;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		opacity: 0.7;
		position: relative;
		background: transparent;
		border: none;
		color: inherit;
		font-family: inherit;
		padding: 0;
	}

	.desktop-links a svg,
	.desktop-link-btn svg {
		width: 15px;
		height: 15px;
		fill: currentColor;
	}

	.desktop-links a:hover,
	.desktop-links a.active,
	.desktop-link-btn:hover {
		opacity: 1;
		color: #c5a059;
	}

	.desktop-links a::after,
	.desktop-link-btn::after {
		content: "";
		position: absolute;
		bottom: -5px;
		left: 0;
		width: 0%;
		height: 1px;
		background: #c5a059;
		transition: width 0.3s ease;
	}

	.desktop-links a:hover::after,
	.desktop-links a.active::after,
	.desktop-link-btn:hover::after {
		width: 100%;
	}

	.mobile-bottom-nav {
		display: none;
	}

	/* Main Content */
	.content {
		flex: 1;
		padding: 1.5rem 2.25rem;
		position: relative;
	}

	/* Cinematic Footer */
	.cinematic-footer {
		background: #050505;
		padding: 1rem 0;
		overflow: hidden;
		border-top: 1px solid rgba(197, 160, 89, 0.2);
		position: relative;
	}

	.marquee-container {
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		position: relative;
	}

	.marquee-track {
		display: inline-block;
		font-family: "Playfair Display", serif;
		font-size: 0.9rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.navbar {
			padding: 1.15rem 1rem 0.95rem;
		}

		.logo-image {
			width: 36px;
			height: 36px;
		}

		.logo-text {
			font-size: 1rem;
		}

		.logo-accent {
			font-size: 0.64rem;
		}

		.desktop-links {
			display: none;
		}

		.content {
			padding: 1rem 0.85rem 5.6rem;
		}

		.mobile-bottom-nav {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.4rem;
			padding: 0.7rem 0.7rem calc(0.8rem + env(safe-area-inset-bottom));
			background: rgba(10, 10, 10, 0.96);
			backdrop-filter: blur(12px);
			border-top: 1px solid rgba(197, 160, 89, 0.2);
			z-index: 80;
		}

		.mobile-bottom-nav.teacher-auth {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.mobile-bottom-nav a,
		.mobile-bottom-nav button {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			gap: 0.2rem;
			padding: 0.48rem 0.35rem;
			border-radius: 10px;
			border: 1px solid rgba(255, 255, 255, 0.1);
			font-size: 0.66rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			font-weight: 700;
			color: rgba(224, 216, 195, 0.8);
			background: rgba(255, 255, 255, 0.02);
			font-family: inherit;
			border: 1px solid rgba(255, 255, 255, 0.1);
		}

		.mobile-bottom-nav a svg,
		.mobile-bottom-nav button svg {
			width: 17px;
			height: 17px;
			fill: currentColor;
			opacity: 0.9;
		}

		.mobile-bottom-nav a.active,
		.mobile-bottom-nav button:active {
			color: #fff;
			border-color: rgba(197, 160, 89, 0.55);
			background: rgba(197, 160, 89, 0.14);
		}

		.cinematic-footer {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
			z-index: 70;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.marquee-track {
			animation: none !important;
		}
	}
</style>
