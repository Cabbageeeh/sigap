<script lang="ts">
  import { fly } from 'svelte/transition';
  import { page as inertiaPage, router } from '@inertiajs/svelte';
  import Sidebar from '../Components/Sidebar.svelte';
  import RoleModal from '../Components/RoleModal.svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import { Toast } from '$lib/toast';
  import type { User, Role, GroupedPermissions, RoleForm } from '../types';
  import { createEmptyRoleForm, roleToForm } from '../types';
  import Button from '../Components/Button.svelte';
  import PageHeader from '../Components/PageHeader.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import { Shield, ShieldCheck, Users, Pencil, Trash2, Plus } from '@lucide/svelte';

  interface PagePermissions {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
  }

  interface Props {
    permissions?: PagePermissions;
  }

  let { permissions = { canCreate: false, canEdit: false, canDelete: false, canAssign: false } }: Props = $props();

  let roles: Role[] = $state([]);
  let groupedPermissions: GroupedPermissions = $state({});
  let loading: boolean = $state(true);

  let showRoleModal: boolean = $state(false);
  let isSubmitting: boolean = $state(false);
  let mode: 'create' | 'edit' = $state('create');
  let form: RoleForm = $state(createEmptyRoleForm());

  async function loadData(): Promise<void> {
    loading = true;
    const [rolesRes, permsRes] = await Promise.all([
      api(() => axios.get('/roles/data'), { showSuccessToast: false }),
      api(() => axios.get('/roles/permissions'), { showSuccessToast: false }),
    ]);

    if (rolesRes.success && rolesRes.data) {
      roles = rolesRes.data as Role[];
    }
    if (permsRes.success && permsRes.data) {
      groupedPermissions = permsRes.data as GroupedPermissions;
    }
    loading = false;
  }

  function openCreateRole(): void {
    mode = 'create';
    form = createEmptyRoleForm();
    showRoleModal = true;
  }

  function openEditRole(role: Role): void {
    mode = 'edit';
    form = roleToForm(role);
    showRoleModal = true;
  }

  function closeRoleModal(): void {
    showRoleModal = false;
    form = createEmptyRoleForm();
  }

  async function handleSubmit(event: CustomEvent<RoleForm>): Promise<void> {
    const formData = event.detail;
    if (!formData.name || !formData.slug) {
      Toast('Nama dan slug wajib diisi', 'error');
      return;
    }

    isSubmitting = true;

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      permissions: formData.permissions,
    };

    let result;
    if (mode === 'create') {
      result = await api(() => axios.post('/roles', payload));
    } else {
      result = await api(() => axios.put(`/roles/${formData.id}`, payload));
    }

    if (result.success) {
      closeRoleModal();
      await loadData();
    }

    isSubmitting = false;
  }

  async function deleteRole(role: Role): Promise<void> {
    if (role.slug === 'admin') {
      Toast('Peran admin tidak dapat dihapus', 'error');
      return;
    }
    if (!confirm(`Hapus peran "${role.name}"? Ini tidak dapat dibatalkan.`)) {
      return;
    }

    const result = await api(() => axios.delete(`/roles/${role.id}`));
    if (result.success) {
      await loadData();
    }
  }

  function getPermissionCount(role: Role): number {
    if (!role.permissions) return 0;
    return role.permissions.length;
  }

  function formatResourceName(resource: string): string {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  $effect(() => {
    loadData();
  });
</script>

<Sidebar group="roles" />

<PageShell>

      <!-- Header row -->
      <PageHeader eyebrow="Manajemen" title="Peran." description="Atur peran dan hak akses untuk setiap jenis pengguna.">
        {#snippet actions()}
          <div class="flex items-center gap-6">
            <div class="text-right">
              <p class="font-heading text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Total</p>
              <p class="font-heading font-semibold text-3xl tracking-[-0.03em] text-foreground">{roles.length}</p>
            </div>
            {#if permissions.canCreate}
              <Button onclick={openCreateRole} disabled={isSubmitting} size="lg">
                <Plus class="w-4 h-4" />
                Tambah peran
              </Button>
            {/if}
          </div>
        {/snippet}
      </PageHeader>

      {#if loading}
        <div class="flex items-center justify-center py-32">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      {:else if roles.length}
        <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none" in:fly={{ y: 20, duration: 800, delay: 150 }}>
          <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
          <div class="relative w-full overflow-x-auto">
            <table class="w-full caption-bottom text-sm">
              <thead>
                <tr class="border-b border-border bg-secondary/50">
                  <th class="px-4 py-3.5 text-start font-heading text-[10px] uppercase tracking-[0.13em] text-muted-foreground font-semibold whitespace-nowrap">Peran</th>
                  <th class="px-4 py-3.5 text-start font-heading text-[10px] uppercase tracking-[0.13em] text-muted-foreground font-semibold whitespace-nowrap">Slug</th>
                  <th class="px-4 py-3.5 text-start font-heading text-[10px] uppercase tracking-[0.13em] text-muted-foreground font-semibold whitespace-nowrap">Izin</th>
                  <th class="px-4 py-3.5 text-start font-heading text-[10px] uppercase tracking-[0.13em] text-muted-foreground font-semibold whitespace-nowrap">Pengguna</th>
                  <th class="px-4 py-3.5 text-end font-heading text-[10px] uppercase tracking-[0.13em] text-muted-foreground font-semibold whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {#each roles as role}
                  <tr class="border-b border-border last:border-b-0 odd:bg-secondary/[0.12] hover:bg-secondary/40 transition-colors duration-150">
                    <td class="px-4 py-3.5 align-middle whitespace-nowrap">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 {role.slug === 'admin' ? 'bg-primary/10 border border-primary/20' : 'bg-muted border border-border'}">
                          {#if role.slug === 'admin'}
                            <ShieldCheck class="w-4 h-4 text-primary" />
                          {:else}
                            <Shield class="w-4 h-4 text-muted-foreground" />
                          {/if}
                        </div>
                        <div class="min-w-0">
                          <div class="text-sm font-heading font-semibold tracking-tight text-foreground">{role.name}</div>
                          {#if role.description}
                            <div class="text-xs text-muted-foreground line-clamp-1 mt-0.5">{role.description}</div>
                          {/if}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 align-middle whitespace-nowrap">
                      <span class="font-mono-accent text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">{role.slug}</span>
                    </td>
                    <td class="px-4 py-3.5 align-middle whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-heading font-semibold text-foreground">{getPermissionCount(role)}</span>
                        <span class="text-xs text-muted-foreground">izin</span>
                      </div>
                      {#if role.permissions && role.permissions.length > 0}
                        <div class="flex flex-wrap gap-1 mt-1.5">
                          {#each Object.entries(
                            role.permissions.reduce((acc, perm: string | { slug: string }) => {
                              const slug = typeof perm === 'string' ? perm : perm.slug;
                              const resource = slug.split('.')[0];
                              if (!acc[resource]) acc[resource] = 0;
                              acc[resource]++;
                              return acc;
                            }, {} as Record<string, number>)
                          ) as [resource, count]}
                            <span class="text-[10px] px-1.5 py-0.5 bg-muted rounded-full border border-border text-muted-foreground font-heading">
                              {formatResourceName(resource)}: {count}
                            </span>
                          {/each}
                        </div>
                      {/if}
                    </td>
                    <td class="px-4 py-3.5 align-middle whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <Users class="w-3.5 h-3.5 text-muted-foreground" />
                        <span class="text-sm font-heading font-medium text-foreground">{role.user_count || 0}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 align-middle whitespace-nowrap text-right">
                      {#if permissions.canEdit || (permissions.canDelete && role.slug !== 'admin')}
                        <div class="flex justify-end gap-2">
                          {#if permissions.canEdit}
                            <Button variant="outline" size="sm" onclick={() => openEditRole(role)} disabled={isSubmitting}>
                              <Pencil class="w-3 h-3" />
                              Edit
                            </Button>
                          {/if}
                          {#if permissions.canDelete && role.slug !== 'admin'}
                            <Button variant="ghost" size="sm" class="text-destructive hover:bg-destructive/10 hover:text-destructive" onclick={() => deleteRole(role)} disabled={isSubmitting}>
                              <Trash2 class="w-3 h-3" />
                            </Button>
                          {/if}
                        </div>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="relative overflow-hidden rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-24 px-8 text-center shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] dark:shadow-none" in:fly={{ y: 20, duration: 800, delay: 150 }}>
          <div class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/[0.03] to-transparent dark:from-white/[0.03]"></div>
          <div class="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center mb-6">
            <Shield class="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 class="font-heading font-semibold text-xl tracking-tight text-foreground mb-2">Belum ada peran</h3>
          <p class="text-sm text-muted-foreground max-w-xs mb-8">Buat peran pertama Anda untuk mulai mengelola izin.</p>
          {#if permissions.canCreate}
            <Button onclick={openCreateRole} size="lg">
              <Plus class="w-4 h-4" />
              Buat peran pertama
            </Button>
          {/if}
        </div>
      {/if}

  <RoleModal
    show={showRoleModal}
    {mode}
    {form}
    {isSubmitting}
    {groupedPermissions}
    on:close={closeRoleModal}
    on:submit={handleSubmit}
  />
</PageShell>
