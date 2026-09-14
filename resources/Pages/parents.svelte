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
  import Pagination from '../Components/Pagination.svelte';
  import type { Parent, ParentForm, PaginationMeta } from '../types';
  import { createEmptyParentForm, parentToForm } from '../types';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { Pencil, Plus, Trash2 } from '@lucide/svelte';

  type ParentRow = Parent & { user_name: string | null; user_username: string };
  type UserOption = { id: string; name: string | null; username: string };
  let { permissions, parents = [], users = [], meta }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; parents?: ParentRow[]; users?: UserOption[]; meta?: PaginationMeta } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: ParentForm = $state(createEmptyParentForm());
  let selected: Parent | null = $state(null);

  function openCreate(): void { form = createEmptyParentForm(); selected = null; isOpen = true; }
  function openEdit(item: Parent): void { selected = item; form = parentToForm(item); isOpen = true; }
  function confirmDelete(item: Parent): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    const result = selected
      ? await api(() => axios.put(`/parents/${selected!.id}`, form))
      : await api(() => axios.post('/parents', form));
    if (result.success) { isOpen = false; router.visit('/parents', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/parents/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/parents', { preserveScroll: true }); }
  }

  const columns = [{ key: 'user_name', label: 'Pengguna' }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat' }];
</script>

{#snippet rowActions(item: ParentRow)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="parents" />
<PageShell>
  <PageHeader eyebrow="Manajemen Orang Tua" title="Orang Tua." description="Data orang tua siswa. Tambah, edit, atau hapus data wali.">
    {#snippet actions()}
      {#if permissions.canCreate}<Button onclick={openCreate} size="lg"><Plus class="w-4 h-4" /> Tambah Orang Tua</Button>{/if}
    {/snippet}
  </PageHeader>
  <DataTable {columns} rows={parents} rowAction={rowActions} />
  {#if meta}<Pagination {meta} />{/if}

<Modal bind:open={isOpen} title={selected ? 'Edit Orang Tua' : 'Tambah Orang Tua'} description="Tambah atau ubah data orang tua. Pilih pengguna dan isi kontak.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="user" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Pengguna</Label>
      <Select id="user" bind:value={form.user_id} placeholder="Pilih pengguna">
        {#each users as u}<option value={u.id}>{u.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="phone" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Telepon</Label><Input id="phone" bind:value={form.phone} /></div>
    <div class="flex flex-col gap-0"><Label for="address" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Alamat</Label><Input id="address" bind:value={form.address} /></div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Orang Tua" onConfirm={remove} destructive />
</PageShell>
