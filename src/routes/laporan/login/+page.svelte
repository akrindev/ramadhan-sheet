<script lang="ts">
  import { goto } from '$app/navigation';

  let identifier = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function submitLogin() {
    if (!identifier.trim() || !password) {
      error = 'Email/username dan password wajib diisi.';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        error = payload.error || 'Login gagal';
        return;
      }

      await goto('/laporan', { invalidateAll: true });
    } catch {
      error = 'Gagal terhubung ke layanan autentikasi';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login Guru - Laporan Ramadhan</title>
</svelte:head>

<section class="login-wrap">
  <article class="login-card">
    <span class="badge">Akses Guru</span>
    <h1>Masuk ke Laporan Ramadhan</h1>
    <p class="desc">
      Halaman laporan hanya dapat diakses oleh guru. Masuk menggunakan email/username dan password akun Smeduverse.
    </p>

    {#if error}
      <div class="error-box">{error}</div>
    {/if}

    <label class="field">
      <span>Email / Username</span>
      <input type="text" bind:value={identifier} placeholder="Masukkan email atau username" disabled={loading} />
    </label>

    <label class="field">
      <span>Password</span>
      <input type="password" bind:value={password} placeholder="Masukkan password" disabled={loading} />
    </label>

    <button class="btn-login" onclick={submitLogin} disabled={loading}>
      {loading ? 'Memproses...' : 'Masuk'}
    </button>
  </article>
</section>

<style>
  .login-wrap {
    min-height: 65vh;
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .login-card {
    width: min(460px, 100%);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 1.4rem;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.2);
  }

  .badge {
    display: inline-block;
    margin-bottom: 0.6rem;
    padding: 0.3rem 0.72rem;
    border-radius: 999px;
    border: 1px solid rgba(197, 160, 89, 0.4);
    color: #c5a059;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: #fff;
    font-size: 1.7rem;
  }

  .desc {
    color: rgba(224, 216, 195, 0.8);
    font-size: 0.93rem;
    margin: 0.6rem 0 1rem;
    line-height: 1.5;
  }

  .error-box {
    margin-bottom: 0.8rem;
    border-radius: 10px;
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    padding: 0.7rem;
    font-size: 0.88rem;
  }

  .field {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .field span {
    color: #c5a059;
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .field input {
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(0, 0, 0, 0.32);
    color: #fff;
    padding: 0.78rem 0.86rem;
    font-family: inherit;
    font-size: 0.94rem;
  }

  .field input:focus {
    outline: none;
    border-color: #c5a059;
  }

  .btn-login {
    width: 100%;
    margin-top: 0.3rem;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #d3b370, #c5a059);
    color: #000;
    padding: 0.82rem;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .btn-login:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
