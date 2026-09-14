<script lang="ts">
  import { page as inertiaPage, inertia, router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';
  import Sidebar from '../Components/Sidebar.svelte';
  import DataTable from '../Components/DataTable.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Switch from '../Components/Switch.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import Select from '../Components/Select.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import type { AcademicYear, AcademicYearForm, User } from '../types';
  import { createEmptyAcademicYearForm, academicYearToForm } from '../types';
  import { timestampToDateInput, dateInputToTimestamp } from '$lib/utils/datetime';
  import { Pencil, Plus, Trash2 } from '@lucide/svelte';

  let { permissions, years = [] }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; canPublish?: boolean }; years?: AcademicYear[] } = $props();

  const currentUser = $derived(inertiaPage.props.user as User | undefined);

  const displayYears = $derived(years.map(year => ({
    ...year,
    name_display: year.is_active === 1 ? `${year.name} (Sedang Berjalan)` : year.name,
    start_display: new Date(year.start_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    end_display: new Date(year.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    active_status: year.is_active === 1 ? 'Aktif' : 'Nonaktif',
    grades_status: year.is_grades_published === 1 ? 'Dipublikasikan' : 'Draft',
  })));

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let isActivateOpen = $state(false);
  let isPublishOpen = $state(false);
  let isComponentsOpen = $state(false);
  let form: AcademicYearForm = $state(createEmptyAcademicYearForm());
  let selected: AcademicYear | null = $state(null);
  let componentYear: AcademicYear | null = $state(null);
  let activateYear: AcademicYear | null = $state(null);
  let publishYear: AcademicYear | null = $state(null);
  let componentRows = $state<{ type: string; name: string; weight: number }[]>([]);
  let startInput = $state('');
  let endInput = $state('');

  function openCreate(): void {
    form = createEmptyAcademicYearForm();
    selected = null;
    startInput = timestampToDateInput(Date.now());
    endInput = timestampToDateInput(Date.now() + 365 * 24 * 60 * 60 * 1000);
    isOpen = true;
  }

  function openEdit(year: AcademicYear): void {
    selected = year;
    form = academicYearToForm(year);
    startInput = timestampToDateInput(year.start_at);
    endInput = timestampToDateInput(year.end_at);
    isOpen = true;
  }

  function confirmDelete(year: AcademicYear): void {
    selected = year;
    isDeleteOpen = true;
  }

  async function submit(): Promise<void> {
    form.start_at = dateInputToTimestamp(startInput);
    form.end_at = dateInputToTimestamp(endInput);
    const payload = { ...form, is_active: form.is_active ? 1 : 0 };
    const result = selected
      ? await api(() => axios.put(`/academic-years/${selected!.id}`, payload))
      : await api(() => axios.post('/academic-years', payload));
    if (result.success) {
      isOpen = false;
      router.visit('/academic-years', { preserveScroll: true });
    }
  }

  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/academic-years/${selected!.id}`));
    if (result.success) {
      isDeleteOpen = false;
      router.visit('/academic-years', { preserveScroll: true });
    }
  }

  function confirmActivate(year: AcademicYear): void { activateYear = year; isActivateOpen = true; }
  function activate(): void {
    if (!activateYear) return;
    api(() => axios.post(`/academic-years/${activateYear!.id}/activate`)).then(() => router.visit('/academic-years', { preserveScroll: true }));
  }
  function confirmPublish(year: AcademicYear): void { publishYear = year; isPublishOpen = true; }
  function publish(): void {
    if (!publishYear) return;
    api(() => axios.post(`/academic-years/${publishYear!.id}/publish-grades`)).then(() => router.visit('/academic-years', { preserveScroll: true }));
  }

  async function openComponents(year: AcademicYear): Promise<void> {
    const result = await api(() => axios.get(`/academic-years/${year.id}/components`), { showSuccessToast: false });
    if (result.success && result.data) {
      componentRows = (result.data as { type: string; name: string; weight: number }[]).map(c => ({ ...c }));
      componentYear = year;
      isComponentsOpen = true;
    }
  }

  async function saveComponents(): Promise<void> {
    if (!componentYear) return;
    const total = componentRows.filter(c => c.weight > 0).reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(total - 100) > 0.001) {
      Toast(`Total bobot harus 100 (sekarang ${total})`, 'error');
      return;
    }
    const result = await api(() => axios.put(`/academic-years/${componentYear!.id}/components`, { components: componentRows }));
    if (result.success) isComponentsOpen = false;
  }

  const columns = [
    { key: 'name_display', label: 'Nama' },
    { key: 'start_display', label: 'Mulai' },
    { key: 'end_display', label: 'Selesai' },
    { key: 'active_status', label: 'Aktif' },
    { key: 'grades_status', label: 'Status Rapor' },
  ];
</script>

{#snippet rowActions(year: AcademicYear)}
  {#if permissions.canEdit}
    <Button variant="ghost" onclick={() => openComponents(year)}>Bobot</Button>
    <Button variant="ghost" onclick={() => confirmPublish(year)}>{year.is_grades_published === 1 ? 'Tarik Publikasi' : 'Publikasikan'}</Button>
    <Button variant="ghost" size="icon" onclick={() => openEdit(year)}><Pencil class="w-4 h-4" /></Button>
    <Button variant="ghost" onclick={() => confirmActivate(year)}>Aktifkan</Button>
  {/if}
  {#if permissions.canDelete}
    <Button variant="ghost" size="icon" onclick={() => confirmDelete(year)}><Trash2 class="w-4 h-4 text-destructive" /></Button>
  {/if}
{/snippet}

<Sidebar group="academic-years" />

<PageShell>
  <PageHeader eyebrow="Manajemen Tahun Ajaran" title="Tahun Ajaran." description="Atur periode tahun ajaran aktif untuk seluruh kegiatan sekolah.">
    {#snippet actions()}
      {#if permissions.canCreate}<Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Tahun</Button>{/if}
    {/snippet}
  </PageHeader>

  <DataTable {columns} rows={displayYears} rowAction={rowActions} />

<Modal bind:open={isOpen} title={selected ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'} description="Tambah atau ubah tahun ajaran. Atur periode mulai dan selesai.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="name" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label><Input id="name" bind:value={form.name} required /></div>
    <div class="flex flex-col gap-0"><Label for="start_at" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mulai</Label><Input id="start_at" type="date" bind:value={startInput} required /></div>
    <div class="flex flex-col gap-0"><Label for="end_at" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Selesai</Label><Input id="end_at" type="date" bind:value={endInput} required /></div>
    <div class="flex items-center gap-2"><Switch bind:checked={form.is_active} /><Label>Aktif</Label></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<Modal bind:open={isComponentsOpen} title="Bobot Komponen Nilai" description="Atur nama dan bobot komponen penilaian. Total bobot harus 100.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); saveComponents(); }}>
    {#each componentRows as row, idx (row.type)}
      <div class="grid grid-cols-[1fr_5rem] gap-3 items-end">
        <div class="flex flex-col gap-0">
          <Label class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Nama</Label>
          <Input bind:value={row.name} required />
        </div>
        <div class="flex flex-col gap-0">
          <Label class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Bobot %</Label>
          <Input type="number" min={0} max={100} bind:value={row.weight} required />
        </div>
      </div>
    {/each}
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isComponentsOpen = false}>Batal</Button>
      <Button type="submit">Simpan</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Tahun Ajaran" description="Tahun ajaran yang dihapus tidak bisa dikembalikan. Lanjutkan?" confirmLabel="Hapus" cancelLabel="Batal" onConfirm={remove} destructive />
<ConfirmDialog bind:open={isActivateOpen} title="Aktifkan Tahun Ajaran" description="Periode lain yang sedang aktif akan dinonaktifkan. Lanjutkan?" confirmLabel="Aktifkan" cancelLabel="Batal" onConfirm={activate} />
<ConfirmDialog bind:open={isPublishOpen} title={publishYear?.is_grades_published === 1 ? 'Tarik Publikasi Nilai' : 'Publikasikan Nilai'} description={publishYear?.is_grades_published === 1 ? 'Nilai akan disembunyikan lagi dari orang tua. Lanjutkan?' : 'Semua orang tua akan menerima notifikasi nilai dipublikasikan. Lanjutkan?'} confirmLabel={publishYear?.is_grades_published === 1 ? 'Tarik' : 'Publikasikan'} cancelLabel="Batal" onConfirm={publish} />
</PageShell>
