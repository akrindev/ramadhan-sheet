<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import gsap from 'gsap';
	import favicon from '$lib/assets/favicon.svg';

	// Props
	let { children } = $props();

	// State
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let width = $state(0);
	let height = $state(0);
	let particles: Particle[] = [];
	let mouse = { x: -1000, y: -1000 };
	let animationFrameId: number;
	
	let menuOpen = $state(false);
	let mobileOverlay: HTMLElement;
	let menuItems: HTMLElement[] = [];
	let menuTl: gsap.core.Timeline | null = null;
	let marqueeTextRef: HTMLElement;
	let marqueeText = "RAMADHAN KAREEM • SUCIKAN HATI • TINGKATKAN IMAN • MERAIH BERKAH • ";

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
		ctx = canvas.getContext('2d');
		
		particles = [];
		const particleCount = Math.min(width * 0.1, 150); // Responsive count
		for (let i = 0; i < particleCount; i++) {
			particles.push(new Particle());
		}
	}

	function animateParticles() {
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
		
		particles.forEach(p => {
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

	// Menu Animation
	function toggleMenu() {
		menuOpen = !menuOpen;
		
		if (menuTl) menuTl.kill();
		menuTl = gsap.timeline();

		if (menuOpen) {
			// Lock body scroll
			document.body.style.overflow = 'hidden';
			
			menuTl.to(mobileOverlay, {
				duration: 0.6,
				y: '0%',
				ease: 'power3.inOut',
				display: 'flex'
			})
			.fromTo(menuItems, {
				y: 50,
				opacity: 0
			}, {
				y: 0,
				opacity: 1,
				duration: 0.5,
				stagger: 0.1,
				ease: 'power2.out'
			}, '-=0.2');
		} else {
			// Unlock body scroll
			document.body.style.overflow = '';

			menuTl.to(menuItems, {
				y: -30,
				opacity: 0,
				duration: 0.3,
				stagger: 0.05,
				ease: 'power2.in'
			})
			.to(mobileOverlay, {
				duration: 0.5,
				y: '-100%',
				ease: 'power3.inOut',
				onComplete: () => {
					gsap.set(mobileOverlay, { display: 'none' });
				}
			});
		}
	}

	// Marquee Animation
	function initMarquee() {
		if (!marqueeTextRef) return;
		
		// Split text for per-character animation
		const chars = marqueeText.split('');
		// Create 4 repetitions for smooth scrolling
		const repetitions = 4;
		
		marqueeTextRef.innerHTML = '';
		
		for(let r=0; r<repetitions; r++) {
			chars.forEach((char) => {
				const span = document.createElement('span');
				span.textContent = char === ' ' ? '\u00A0' : char;
				span.style.opacity = '0.5';
				span.style.display = 'inline-block';
				span.style.transition = 'color 0.3s';
				marqueeTextRef.appendChild(span);
			});
		}

		const spans = marqueeTextRef.querySelectorAll('span');
		
		// Color wave animation
		gsap.to(spans, {
			color: '#c5a059', // Gold
			textShadow: '0 0 8px rgba(197, 160, 89, 0.4)',
			opacity: 1,
			stagger: {
				each: 0.05,
				repeat: -1,
				yoyo: true,
				from: "start"
			},
			duration: 2,
			ease: 'sine.inOut'
		});

		// Horizontal scroll
		gsap.to(marqueeTextRef, {
			xPercent: -25, // Move by 1/4 (since we have 4 repetitions)
			duration: 20,
			ease: 'none',
			repeat: -1
		});
	}

	onMount(() => {
		initParticles();
		animateParticles();
		initMarquee();
		
		window.addEventListener('resize', handleResize);
		window.addEventListener('mousemove', handleMouseMove);

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('mousemove', handleMouseMove);
			if (menuTl) menuTl.kill();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Ramadhan Sheet</title>
</svelte:head>

<div class="app-wrapper">
	<canvas bind:this={canvas} class="particle-background"></canvas>

	<nav class="navbar">
		<div class="logo">
			<span class="logo-text">RAMADHAN</span>
			<span class="logo-accent">SHEET</span>
		</div>

		<div class="desktop-links">
			<a href="/" class:active={$page.url.pathname === '/'}>Beranda</a>
			<a href="/laporan" class:active={$page.url.pathname.startsWith('/laporan')}>Laporan</a>
		</div>

		<button class="hamburger" onclick={toggleMenu} aria-label="Menu">
			<span class="line line-1" class:open={menuOpen}></span>
			<span class="line line-2" class:open={menuOpen}></span>
		</button>
	</nav>

	<div class="mobile-overlay" bind:this={mobileOverlay}>
		<div class="mobile-links">
			{#each ['Beranda', 'Laporan'] as item, i}
				{@const href = item === 'Beranda' ? '/' : `/${item.toLowerCase()}`}
				<a 
					{href} 
					bind:this={menuItems[i]} 
					onclick={toggleMenu}
					class:active={$page.url.pathname === href || ($page.url.pathname.startsWith(href) && href !== '/')}
				>
					{item}
				</a>
			{/each}
		</div>
	</div>

	<main class="content">
		{@render children()}
	</main>

	<footer class="cinematic-footer">
		<div class="marquee-container">
			<div class="marquee-track" bind:this={marqueeTextRef}>
			</div>
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
		font-family: 'Inter', sans-serif;
		overflow-x: hidden;
		-webkit-font-smoothing: antialiased;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		font-family: 'Playfair Display', serif;
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
		font-family: 'Playfair Display', serif;
		font-size: 1.5rem;
		letter-spacing: 0.1em;
		font-weight: 700;
		color: #fff;
	}

	.logo-accent {
		color: #c5a059; /* Gold */
	}

	.desktop-links {
		display: flex;
		gap: 3rem;
	}

	.desktop-links a {
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		opacity: 0.7;
		position: relative;
	}

	.desktop-links a:hover, .desktop-links a.active {
		opacity: 1;
		color: #c5a059;
	}

	.desktop-links a::after {
		content: '';
		position: absolute;
		bottom: -5px;
		left: 0;
		width: 0%;
		height: 1px;
		background: #c5a059;
		transition: width 0.3s ease;
	}

	.desktop-links a:hover::after, .desktop-links a.active::after {
		width: 100%;
	}

	/* Hamburger */
	.hamburger {
		display: none;
		background: none;
		border: none;
		flex-direction: column;
		gap: 6px;
		z-index: 60;
		padding: 10px;
	}

	.line {
		display: block;
		width: 30px;
		height: 2px;
		background-color: #e0d8c3;
		transition: all 0.3s ease;
	}

	.line.open.line-1 {
		transform: rotate(45deg) translate(5px, 6px);
		background-color: #c5a059;
	}
	.line.open.line-2 {
		transform: rotate(-45deg) translate(5px, -6px);
		background-color: #c5a059;
	}

	/* Mobile Overlay */
	.mobile-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		background: #0a0a0a;
		z-index: 40;
		display: none; /* hidden by default */
		justify-content: center;
		align-items: center;
		flex-direction: column;
	}

	.mobile-links {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.mobile-links a {
		font-family: 'Playfair Display', serif;
		font-size: 3rem;
		color: #e0d8c3;
		opacity: 0; /* Animated in by GSAP */
	}
	
	.mobile-links a:hover, .mobile-links a.active {
		color: #c5a059;
		font-style: italic;
	}

	/* Main Content */
	.content {
		flex: 1;
		padding: 2rem 4rem;
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
		font-family: 'Playfair Display', serif;
		font-size: 0.9rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.navbar {
			padding: 1.5rem 2rem;
		}

		.desktop-links {
			display: none;
		}

		.hamburger {
			display: flex;
		}

		.content {
			padding: 1.5rem 2rem;
		}
	}
	
	@media (prefers-reduced-motion: reduce) {
		.marquee-track {
			animation: none !important;
		}
	}
</style>