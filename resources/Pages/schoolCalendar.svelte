<script lang="ts">
  import axios from 'axios';
  import { router } from '@inertiajs/svelte';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import Switch from '../Components/Switch.svelte';
  import { CalendarOff, Loader2, Plus, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  interface Holiday {
    id: string;
    date: number;
    name: string;
  }

  let {
    permissions = { canEdit: false },
    holidays = [],
    saturdayIsSchoolDay = true,
  }: {
    permissions?: { canEdit: boolean };
    holidays?: Holiday[];
    saturdayIsSchoolDay?: boolean;
  } = $props();

  let saturday = $state(saturdayIsSchoolDay);
  let form = $state({ date: '', name: '' });
  let savingSetting = $state(false);
  let adding = $state(false);
  let deletingId = $state<string | null>(null);

  $effect(() => { saturday = saturdayIsSchoolDay; });

  const isSaving = $derived(savingSetting || adding);

  async function saveSaturday(next: boolean): Promise<void> {
    savingSetting = true;
    const result = await api(() => axios.put('/school-calendar/settings', { saturday_is_school_day: next }));
    savingSetting = false;
    if (!result.success) saturday = !next;
  }

  async function addHoliday(): Promise<void> {
    if (!form.date || !form.name.trim()) return;
    adding = true;
    const result = await api(() => axios.post('/school-calendar/holidays', {
      date: new Date(`${form.date}T00:00:00`).getTime(),
      name: form.name.trim(),
    }));
    adding = false;
    if (result.success) {
      form = { date: '', name: '' };
      router.visit('/school-calendar', { preserveScroll: true });
    }
  }

  async function removeHoliday(holiday: Holiday): Promise<void> {
    deletingId = holiday.id;
    const result = await api(() => axios.delete(`/school-calendar/holidays/${holiday.id}`));
    deletingId = null;
    if (result.success) router.visit('/school-calendar', { preserveScroll: true });
  }

  function formatTanggal(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
</script>

<Sidebar group="school-calendar" />

<PageShell>
  <PageHeader
    eyebrow="Kalender Sekolah"
    title="Kalender Sekolah."
    description="Tentukan hari libur dan apakah hari Sabtu masuk. SIGAP memakai kalender ini untuk memutuskan kapan guru wajib men-scan QR, dan kapan tidak."
  />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" in:fly={{ y: 20, duration: 700, delay: 100 }}>
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-6 sm:p-7">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative flex items-center gap-3 mb-6">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><CalendarOff class="h-4.5 w-4.5 text-primary" /></span>
        <div>
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Hari Efektif</p>
          <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Minggu &amp; Sabtu</h3>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 px-4 py-3.5">
        <div>
          <p class="text-sm font-medium text-foreground">Hari Sabtu masuk</p>
          <p class="text-[11px] text-muted-foreground mt-0.5">Matikan bila sekolah Anda hanya bekerja Senin–Jumat.</p>
        </div>
        <Switch bind:checked={saturday} disabled={!permissions.canEdit || savingSetting} onCheckedChange={saveSaturday} />
      </div>

      <p class="mt-4 text-sm text-muted-foreground leading-relaxed">
        Hari Minggu selalu diliburkan. Pada hari yang tidak efektif, guru tidak ditagih konfirmasi kehadiran dan
        alarm di dasbor kepala sekolah tidak menghitungnya sebagai sesi yang terlewat.
      </p>
    </div>

    <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none p-6 sm:p-7">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
      <div class="relative mb-6">
        <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Daftar Libur</p>
        <h3 class="font-heading text-xl font-semibold tracking-[-0.02em]">Tanggal Libur Khusus</h3>
      </div>

      {#if permissions.canEdit}
        <form class="flex flex-col gap-3 pb-5 mb-5 border-b border-border" onsubmit={(event) => { event.preventDefault(); addHoliday(); }}>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <Label for="holiday-date" class="text-[10px] uppercase tracking-[0.16em] font-heading text-muted-foreground">Tanggal</Label>
              <Input id="holiday-date" type="date" bind:value={form.date} required class="h-11" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="holiday-name" class="text-[10px] uppercase tracking-[0.16em] font-heading text-muted-foreground">Nama Libur</Label>
              <Input id="holiday-name" type="text" bind:value={form.name} placeholder="Contoh: Libur Awal Ramadan" required class="h-11" />
            </div>
          </div>
          <Button type="submit" variant="outline" disabled={isSaving || !form.date || !form.name.trim()} class="self-start">
            {#if adding}<Loader2 class="w-4 h-4 animate-spin mr-1" />{:else}<Plus class="w-4 h-4 mr-1" />{/if}
            Tambah Libur
          </Button>
        </form>
      {/if}

      {#if holidays.length === 0}
        <p class="text-sm text-muted-foreground">Belum ada tanggal libur dicatat.</p>
      {:else}
        <ul class="flex flex-col gap-2">
          {#each holidays as holiday (holiday.id)}
            <li class="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground truncate">{holiday.name}</p>
                <p class="text-[11px] text-muted-foreground font-mono-accent mt-0.5">{formatTanggal(holiday.date)}</p>
              </div>
              {#if permissions.canEdit}
                <Button variant="ghost" size="sm" disabled={deletingId === holiday.id} onclick={() => removeHoliday(holiday)} aria-label="Hapus hari libur">
                  {#if deletingId === holiday.id}<Loader2 class="w-4 h-4 animate-spin" />{:else}<Trash2 class="w-4 h-4" />{/if}
                </Button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</PageShell>
