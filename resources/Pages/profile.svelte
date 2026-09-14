<script lang="ts">
  import { fly } from 'svelte/transition';
  import axios from 'axios';
  import Sidebar from '../Components/Sidebar.svelte';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Button from '../Components/Button.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import * as tabs from "@zag-js/tabs";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { Loader2, Camera, Shield, UserRound, LockKeyhole } from '@lucide/svelte';

  interface User {
    id: string;
    username: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
  }

  interface Props { user: User }

  let { user }: Props = $props();

  let current_password: string = $state('');
  let new_password: string = $state('');
  let confirm_password: string = $state('');
  let isLoading: boolean = $state(false);
  let previewUrl: string | null = $derived(user.avatar || null);

  const tabsService = useMachine(tabs.machine, { id: "profile-tabs", defaultValue: "personal" });
  const tabsApi = $derived(tabs.connect(tabsService, normalizeProps));

  function handleAvatarChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      isLoading = true;
      axios.post('/assets/avatar', formData)
        .then((response) => {
          setTimeout(() => { isLoading = false; previewUrl = response.data.data.url + '?v=' + Date.now(); }, 500);
          user.avatar = response.data.data.url + '?v=' + Date.now();
          Toast('Avatar diunggah', 'success');
        })
        .catch(() => { isLoading = false; Toast('Gagal mengunggah avatar', 'error'); });
    }
  }

  async function changeProfile(): Promise<void> {
    isLoading = true;
    await api(() => axios.post('/change-profile', user));
    isLoading = false;
  }

  async function changePassword(): Promise<void> {
    if (new_password != confirm_password) { Toast('Kata sandi tidak cocok', 'error'); return; }
    if (!current_password || !new_password || !confirm_password) { Toast('Silakan isi semua kolom', 'error'); return; }
    isLoading = true;
    const result = await api(() => axios.post('/change-password', { current_password, new_password }));
    if (result.success) { current_password = ''; new_password = ''; confirm_password = ''; }
    isLoading = false;
  }
</script>

<Sidebar group="profile" />

<PageShell>
  <PageHeader eyebrow="Akun" title="Profil." description="Kelola identitas akun, foto profil, dan keamanan akses Anda." />

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12" in:fly={{ y: 20, duration: 800, delay: 150 }}>

        <!-- Sidebar -->
        <div class="lg:col-span-4 flex flex-col gap-6">

          <!-- Identity card -->
          <div class="relative overflow-hidden border border-border rounded-2xl bg-card p-6 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
            <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
            <div class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/[0.07] blur-2xl"></div>
            <div class="flex items-center gap-4 mb-6">
              <div class="relative shrink-0">
                <div class="w-16 h-16 rounded-full bg-muted border-2 border-primary/20 overflow-hidden ring-4 ring-primary/[0.06]">
                  {#if previewUrl}
                    <img src={previewUrl} alt="Profile" class="aspect-square size-full object-cover" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  {/if}
                  {#if !previewUrl}
                    <div class="bg-muted text-foreground font-heading font-semibold flex size-full items-center justify-center text-2xl">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                </div>
                <label class="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors border border-border">
                  <Camera class="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onchange={handleAvatarChange} class="hidden" />
                </label>
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-heading font-semibold tracking-tight text-foreground truncate">{user.name}</h2>
                <p class="text-sm text-muted-foreground truncate">@{user.username}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-heading font-medium capitalize {user.roles?.includes('admin') ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-muted text-muted-foreground border border-border'}">
                {user.roles?.includes('admin') ? 'Admin' : 'User'}
              </span>
            </div>
          </div>

          <!-- Security note -->
          <div class="relative overflow-hidden border border-border rounded-2xl bg-card p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
            <div class="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Shield class="w-4 h-4 text-primary" />
            </div>
            <div>
              <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-1">Keamanan akun</p>
              <p class="text-xs text-muted-foreground leading-relaxed">Data Anda terenkripsi saat disimpan dan saat dikirim di backend SIGAP.</p>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="lg:col-span-8">
          <div {...tabsApi.getRootProps()} class="flex flex-col gap-2 w-full">

            <!-- Tab triggers -->
            <div {...tabsApi.getListProps()} class="border border-border rounded-xl inline-flex h-auto w-fit items-stretch bg-secondary/40 p-1 gap-1 mb-8">
              <button {...tabsApi.getTriggerProps({ value: "personal" })} class="data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-[0_1px_3px_rgba(32,36,38,0.12)] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-heading font-medium whitespace-nowrap transition-all">
                <UserRound class="w-3.5 h-3.5" /> Info Pribadi
              </button>
              <button {...tabsApi.getTriggerProps({ value: "security" })} class="data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-[0_1px_3px_rgba(32,36,38,0.12)] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-heading font-medium whitespace-nowrap transition-all">
                <LockKeyhole class="w-3.5 h-3.5" /> Keamanan
              </button>
            </div>

            <!-- Personal info -->
            <div {...tabsApi.getContentProps({ value: "personal" })} class="flex-1 outline-none">
              <div class="relative overflow-hidden border border-border rounded-2xl bg-card p-6 sm:p-8 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
                <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
                <div class="mb-6">
                  <h3 class="text-xl font-heading font-semibold tracking-tight text-foreground">Informasi pribadi</h3>
                  <p class="text-sm text-muted-foreground mt-1">Perbarui detail pribadi dan profil publik Anda.</p>
                </div>
                <div class="h-px bg-border mb-6"></div>
                <form onsubmit={(e) => { e.preventDefault(); changeProfile(); }} class="flex flex-col gap-5">
                  <div class="flex flex-col gap-2">
                    <Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Nama lengkap</Label>
                    <Input id="name" type="text" bind:value={user.name} placeholder="Your full name" class="h-12 rounded-xl" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label for="username" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Username</Label>
                    <Input id="username" type="text" bind:value={user.username} placeholder="username Anda" disabled={user.roles?.includes('parent')} />
                    {#if user.roles?.includes('parent')}
                      <p class="text-xs text-muted-foreground">Username akun orang tua mengikuti NIS anak yang terhubung.</p>
                    {/if}
                  </div>
                  <div class="flex justify-end pt-2">
                    <Button type="submit" disabled={isLoading} size="lg">
                      {#if isLoading}<Loader2 class="w-4 h-4 animate-spin" />Menyimpan...{:else}Simpan perubahan{/if}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Security -->
            <div {...tabsApi.getContentProps({ value: "security" })} class="flex-1 outline-none">
              <div class="relative overflow-hidden border border-border rounded-2xl bg-card p-6 sm:p-8 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none">
                <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
                <div class="mb-6">
                  <h3 class="text-xl font-heading font-semibold tracking-tight text-foreground">Ubah kata sandi</h3>
                  <p class="text-sm text-muted-foreground mt-1">Gunakan kata sandi yang panjang dan acak untuk keamanan akun Anda.</p>
                </div>
                <div class="h-px bg-border mb-6"></div>
                <form onsubmit={(e) => { e.preventDefault(); changePassword(); }} class="flex flex-col gap-5">
                  <div class="flex flex-col gap-2">
                    <Label for="current_password" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Kata sandi saat ini</Label>
                    <Input id="current_password" type="password" bind:value={current_password} placeholder="••••••••" class="h-12 rounded-xl" />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div class="flex flex-col gap-2">
                      <Label for="new_password" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Kata sandi baru</Label>
                      <Input id="new_password" type="password" bind:value={new_password} placeholder="••••••••" class="h-12 rounded-xl" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <Label for="confirm_password" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground">Konfirmasi kata sandi</Label>
                      <Input id="confirm_password" type="password" bind:value={confirm_password} placeholder="••••••••" class="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div class="flex justify-end pt-2">
                    <Button variant="outline" type="submit" disabled={isLoading} size="lg">
                      {#if isLoading}<Loader2 class="w-4 h-4 animate-spin" />Memperbarui...{:else}Perbarui kata sandi{/if}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

      </div>
</PageShell>
