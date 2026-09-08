<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import Select from '../Components/Select.svelte';
  import type { Journal, JournalForm, Schedule, TeacherConfirmation } from '../types';
  import { createEmptyJournalForm, journalToForm } from '../types';
  import { timestampToDateInput, dateInputToTimestamp } from '$lib/utils/datetime';
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { permissions, journals = [], schedules = [], confirmations = [] }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; journals?: Journal[]; schedules?: Schedule[]; confirmations?: TeacherConfirmation[] } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: JournalForm = $state(createEmptyJournalForm());
  let selected: Journal | null = $state(null);
  let dateInput = $state('');

  function openCreate(): void { form = createEmptyJournalForm(); selected = null; dateInput = timestampToDateInput(Date.now()); isOpen = true; }
  function openEdit(item: Journal): void { selected = item; form = journalToForm(item); dateInput = timestampToDateInput(item.date); isOpen = true; }
  function confirmDelete(item: Journal): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    form.date = dateInputToTimestamp(dateInput);
    const result = selected
      ? await api(() => axios.put(`/journals/${selected!.id}`, form))
      : await api(() => axios.post('/journals', form));
    if (result.success) { isOpen = false; router.visit('/journals', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/journals/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/journals', { preserveScroll: true }); }
  }

  const columns = [{ key: 'schedule_id', label: 'Jadwal' }, { key: 'date', label: 'Tanggal' }, { key: 'material', label: 'Materi' }];
</script>

{#snippet rowActions(item: Journal)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="journals" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Jurnal Mengajar</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Jurnal.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Catatan harian kegiatan belajar mengajar per jadwal.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Jurnal</Button>{/if}
  </div>
  <DataTable {columns} rows={journals} rowAction={rowActions} />
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Jurnal' : 'Tambah Jurnal'} description="Tambah atau ubah jurnal mengajar. Pilih jadwal dan konfirmasi terkait.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="schedule" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Jadwal</Label>
      <Select id="schedule" bind:value={form.schedule_id} placeholder="Pilih jadwal">
        {#each schedules as s}<option value={s.id}>{s.class_id} · {s.subject_id}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="confirmation" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Konfirmasi</Label>
      <Select id="confirmation" bind:value={form.teacher_confirmation_id} placeholder="Pilih konfirmasi">
        {#each confirmations as c}<option value={c.id}>{new Date(c.confirmed_at).toLocaleString()}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="date" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Tanggal</Label><Input id="date" type="date" bind:value={dateInput} required /></div>
    <div class="flex flex-col gap-0"><Label for="material" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Materi</Label><Input id="material" bind:value={form.material} required /></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Jurnal" onConfirm={remove} destructive />
