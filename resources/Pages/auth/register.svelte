<script lang="ts">
  import { inertia, router } from '@inertiajs/svelte'
  import axios from 'axios'
  import { api } from '$lib/api'
  import { password_generator } from '$lib/utils/password'
  import { Toast } from '$lib/toast'
  import SigapIcon from '../../Components/SigapIcon.svelte'
  import DarkModeToggle from '../../Components/DarkModeToggle.svelte'
  import Button from '../../Components/Button.svelte'
  import Input from '../../Components/Input.svelte'
  import Label from '../../Components/Label.svelte'
  import { fade, fly } from 'svelte/transition'
  import { ArrowRight, Eye, EyeOff } from '@lucide/svelte'

  interface RegisterForm {
    username: string
    password: string
    name: string
    password_confirmation: string
  }

  let form: RegisterForm = $state({ username: '', password: '', name: '', password_confirmation: '' })
  let showPassword = $state(false)
  let showConfirm = $state(false)
  let isLoading = $state(false)
  let { error }: { error?: string } = $props()

  $effect(() => {
    if (error) Toast(error, 'error')
  })

  async function submitForm(): Promise<void> {
    if (form.password !== form.password_confirmation) {
      Toast('Kata sandi tidak cocok', 'error')
      return
    }
    isLoading = true
    const result = await api(() => axios.post('/register', form))
    isLoading = false
    if (result.success) router.visit('/dashboard')
  }

  function generatePassword(): void {
    const generated = password_generator(10)
    form.password = generated
    form.password_confirmation = generated
  }
</script>

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground">
  <header class="px-4 pt-4 sm:px-6 lg:px-8">
    <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-border bg-card/90 px-4 shadow-[0_8px_30px_rgba(32,36,38,0.04)] backdrop-blur-xl sm:px-5 dark:shadow-none">
      <a href="/" use:inertia class="flex items-center gap-3" aria-label="SIGAP Beranda"><SigapIcon size={30} /></a>
      <div class="flex items-center gap-2">
        <a href="/login" use:inertia class="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">Masuk</a>
        <DarkModeToggle />
      </div>
    </nav>
  </header>

  <main class="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-12 sm:px-6">
    <div class="w-full max-w-[620px]" in:fly={{ y: 16, duration: 500 }}>
      <div class="mb-8">
        <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Buat akun</p>
        <h1 class="text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-[1] tracking-[-0.045em]">Siapkan akses ke SIGAP.</h1>
        <p class="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">Lengkapi identitas akun. Hak akses dan peran pengguna tetap ditentukan oleh pengelola sekolah.</p>
      </div>

      <section class="rounded-[24px] border border-border bg-card p-5 shadow-[0_18px_55px_rgba(32,36,38,0.06)] sm:p-7 dark:shadow-none">
        {#if error}
          <div in:fade={{ duration: 160 }} role="alert" class="mb-5 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm leading-6 text-destructive">{error}</div>
        {/if}

        <form class="flex flex-col gap-5" onsubmit={(event) => { event.preventDefault(); submitForm() }}>
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="name" class="text-xs font-semibold text-foreground">Nama lengkap</Label>
              <Input bind:value={form.name} required type="text" name="name" id="name" placeholder="Nama pengguna" class="h-12" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="username" class="text-xs font-semibold text-foreground">Username</Label>
              <Input bind:value={form.username} required type="text" name="username" id="username" placeholder="Username" class="h-12" />
            </div>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="password" class="text-xs font-semibold text-foreground">Kata sandi</Label>
              <div class="relative">
                <Input bind:value={form.password} required type={showPassword ? 'text' : 'password'} name="password" id="password" placeholder="••••••••" class="h-12 pr-11" />
                <button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                  {#if showPassword}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="confirm-password" class="text-xs font-semibold text-foreground">Konfirmasi kata sandi</Label>
              <div class="relative">
                <Input bind:value={form.password_confirmation} required type={showConfirm ? 'text' : 'password'} name="confirm-password" id="confirm-password" placeholder="••••••••" class="h-12 pr-11" />
                <button type="button" onclick={() => (showConfirm = !showConfirm)} class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label={showConfirm ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                  {#if showConfirm}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
                </button>
              </div>
            </div>
          </div>

          <button type="button" onclick={generatePassword} class="self-start text-xs font-semibold text-primary transition-colors hover:text-primary/80">Buat kata sandi acak</button>

          <div class="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <a href="/login" use:inertia class="text-sm text-muted-foreground transition-colors hover:text-foreground">Sudah punya akun? <span class="font-semibold text-foreground">Masuk</span></a>
            <Button type="submit" disabled={isLoading} size="lg" class="h-12">
              {isLoading ? 'Membuat akun...' : 'Buat akun'}
              {#if !isLoading}<ArrowRight class="h-4 w-4" />{/if}
            </Button>
          </div>
        </form>
      </section>
    </div>
  </main>
</div>
