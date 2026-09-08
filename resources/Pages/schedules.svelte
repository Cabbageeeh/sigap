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
  import type { Schedule, ScheduleForm, Class, Subject, AcademicYear } from '../types';
  import { createEmptyScheduleForm, scheduleToForm } from '../types';
  import { timestampToTimeInput, timeInputToTimestamp } from '$lib/utils/datetime';
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  type TeacherOption = { id: string; name: string | null; username: string };
  type ScheduleRow = Schedule & {
    day_name: string;
    start_time_label: string;
    end_time_label: string;
    class_name: string;
    subject_name: string;
    teacher_name: string;
  };

  let { permissions, schedules = [], classes = [], subjects = [], teachers = [], years = [] }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; schedules?: Schedule[]; classes?: Class[]; subjects?: Subject[]; teachers?: TeacherOption[]; years?: AcademicYear[] } = $props();

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: ScheduleForm = $state(createEmptyScheduleForm());
  let selected: Schedule | null = $state(null);
  let startTimeInput = $state('07:30');
  let endTimeInput = $state('09:00');

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const classNames = $derived(new Map(classes.map(item => [item.id, item.name])));
  const subjectNames = $derived(new Map(subjects.map(item => [item.id, item.name])));
  const teacherNames = $derived(new Map(teachers.map(item => [item.id, item.name || item.username])));
  const displaySchedules = $derived(schedules.map((schedule): ScheduleRow => ({
    ...schedule,
    day_name: days[schedule.day_of_week] ?? '-',
    start_time_label: timestampToTimeInput(schedule.start_time),
    end_time_label: timestampToTimeInput(schedule.end_time),
    class_name: classNames.get(schedule.class_id) ?? schedule.class_id,
    subject_name: subjectNames.get(schedule.subject_id) ?? schedule.subject_id,
    teacher_name: teacherNames.get(schedule.teacher_user_id) ?? schedule.teacher_user_id,
  })));

  function openCreate(): void { form = createEmptyScheduleForm(); selected = null; startTimeInput = '07:30'; endTimeInput = '09:00'; isOpen = true; }
  function openEdit(item: Schedule): void { selected = item; form = scheduleToForm(item); startTimeInput = timestampToTimeInput(item.start_time); endTimeInput = timestampToTimeInput(item.end_time); isOpen = true; }
  function confirmDelete(item: Schedule): void { selected = item; isDeleteOpen = true; }

  async function submit(): Promise<void> {
    form.start_time = timeInputToTimestamp(startTimeInput, form.day_of_week);
    form.end_time = timeInputToTimestamp(endTimeInput, form.day_of_week);
    const result = selected
      ? await api(() => axios.put(`/schedules/${selected!.id}`, form))
      : await api(() => axios.post('/schedules', form));
    if (result.success) { isOpen = false; router.visit('/schedules', { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/schedules/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit('/schedules', { preserveScroll: true }); }
  }

  const columns = [
    { key: 'day_name', label: 'Hari' },
    { key: 'start_time_label', label: 'Mulai' },
    { key: 'end_time_label', label: 'Selesai' },
    { key: 'class_name', label: 'Kelas' },
    { key: 'subject_name', label: 'Mapel' },
    { key: 'teacher_name', label: 'Guru' },
  ];
</script>

{#snippet rowActions(item: ScheduleRow)}
  {#if permissions.canEdit}<Button variant="ghost" size="icon" onclick={() => openEdit(item)}><Pencil class="w-4 h-4" /></Button>{/if}
  {#if permissions.canDelete}<Button variant="ghost" size="icon" onclick={() => confirmDelete(item)}><Trash2 class="w-4 h-4 text-destructive" /></Button>{/if}
{/snippet}

<Sidebar group="schedules" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Jadwal</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Jadwal Sekolah.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Jadwal pelajaran per kelas, hari, dan guru. Atur seluruh jadwal sekolah.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Jadwal</Button>{/if}
  </div>
  <DataTable {columns} rows={displaySchedules} rowAction={rowActions} />
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Jadwal' : 'Tambah Jadwal'} description="Tambah atau ubah jadwal pelajaran. Atur hari, jam, kelas, mapel, dan guru.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="day" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Hari</Label>
      <Select id="day" bind:value={form.day_of_week} placeholder="Pilih hari">
        {#each days as day, i}<option value={i}>{day}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="start" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mulai</Label><Input id="start" type="time" bind:value={startTimeInput} required /></div>
    <div class="flex flex-col gap-0"><Label for="end" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Selesai</Label><Input id="end" type="time" bind:value={endTimeInput} required /></div>
    <div class="flex flex-col gap-0"><Label for="class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
      <Select id="class" bind:value={form.class_id} placeholder="Pilih kelas">
        {#each classes as c}<option value={c.id}>{c.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="subject" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mapel</Label>
      <Select id="subject" bind:value={form.subject_id} placeholder="Pilih mapel">
        {#each subjects as s}<option value={s.id}>{s.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="teacher" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Guru</Label>
      <Select id="teacher" bind:value={form.teacher_user_id} placeholder="Pilih guru">
        {#each teachers as t}<option value={t.id}>{t.name || t.username}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="year" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Tahun Ajaran</Label>
      <Select id="year" bind:value={form.academic_year_id} placeholder="Pilih tahun ajaran">
        {#each years as y}<option value={y.id}>{y.name}</option>{/each}
      </Select>
    </div>
    <div class="flex justify-end gap-2 pt-4 border-t border-border mt-2">
      <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
      <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Jadwal" onConfirm={remove} destructive />
