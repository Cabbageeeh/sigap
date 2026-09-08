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
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

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
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Orang Tua</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Orang Tua.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Data orang tua siswa. Tambah, edit, atau hapus data wali.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Orang Tua</Button>{/if}
  </div>
  <DataTable {columns} rows={parents} rowAction={rowActions} />
  {#if meta}<Pagination {meta} />{/if}
</div>

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
