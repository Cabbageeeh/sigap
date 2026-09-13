<script lang="ts">
  import { router } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import Modal from '../Components/Modal.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import Select from '../Components/Select.svelte';
  import type { Schedule, ScheduleForm, Class, Subject, AcademicYear } from '../types';
  import { createEmptyScheduleForm, scheduleToForm } from '../types';
  import { timestampToTimeInput, timeInputToTimestamp } from '$lib/utils/datetime';
  import { Plus } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  type TeacherOption = { id: string; name: string | null; username: string };
  type Mode = 'class' | 'teacher';
  interface Slot { key: string; start: string; end: string; label: string; startMinutes: number }

  const SCHOOL_DAYS = [1, 2, 3, 4, 5];
  const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

  let { permissions, schedules = [], classes = [], subjects = [], teachers = [], years = [] }: { permissions: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }; schedules?: Schedule[]; classes?: Class[]; subjects?: Subject[]; teachers?: TeacherOption[]; years?: AcademicYear[] } = $props();

  function initialParams(): { mode: Mode; yearId: string; classId: string; teacherId: string } {
    const params = new URL(window.location.href).searchParams;
    const modeParam = params.get('mode');
    const yearParam = params.get('academic_year_id') ?? '';
    const classParam = params.get('class_id') ?? '';
    const teacherParam = params.get('teacher_id') ?? '';
    return {
      mode: modeParam === 'teacher' ? 'teacher' : 'class',
      yearId: years.some(y => y.id === yearParam) ? yearParam : (years.find(y => y.is_active === 1)?.id ?? years[0]?.id ?? ''),
      classId: classes.some(c => c.id === classParam) ? classParam : '',
      teacherId: teachers.some(t => t.id === teacherParam) ? teacherParam : '',
    };
  }

  const initial = initialParams();
  let mode: Mode = $state(initial.mode);
  let selectedYearId = $state(initial.yearId);
  let selectedClassId = $state(initial.classId);
  let selectedTeacherId = $state(initial.teacherId);

  let isOpen = $state(false);
  let isDeleteOpen = $state(false);
  let form: ScheduleForm = $state(createEmptyScheduleForm());
  let selected: Schedule | null = $state(null);
  let startTimeInput = $state('07:30');
  let endTimeInput = $state('09:00');

  const classNames = $derived(new Map(classes.map(item => [item.id, item.name])));
  const subjectNames = $derived(new Map(subjects.map(item => [item.id, item.name])));
  const teacherNames = $derived(new Map(teachers.map(item => [item.id, item.name || item.username])));
  const yearClasses = $derived(selectedYearId ? classes.filter(item => item.academic_year_id === selectedYearId) : classes);
  const activeYearId = $derived(years.find(item => item.is_active === 1)?.id ?? years[0]?.id ?? '');
  const modalClasses = $derived(form.academic_year_id ? classes.filter(item => item.academic_year_id === form.academic_year_id) : classes);

  $effect(() => {
    const yearId = form.academic_year_id;
    if (yearId && form.class_id && !classes.some(item => item.id === form.class_id && item.academic_year_id === yearId)) {
      form.class_id = '';
    }
  });

  const filtered = $derived(schedules.filter(schedule => {
    if (selectedYearId && schedule.academic_year_id !== selectedYearId) return false;
    if (mode === 'class') return selectedClassId ? schedule.class_id === selectedClassId : false;
    return selectedTeacherId ? schedule.teacher_user_id === selectedTeacherId : false;
  }));

  const weekendCount = $derived(filtered.filter(schedule => schedule.day_of_week === 0 || schedule.day_of_week === 6).length);

  function slotKeyOf(schedule: Schedule): string {
    return `${timestampToTimeInput(schedule.start_time)}-${timestampToTimeInput(schedule.end_time)}`;
  }

  function toMinutes(label: string): number {
    const [hours, minutes] = label.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  const slots = $derived.by((): Slot[] => {
    const seen = new Map<string, Slot>();
    for (const schedule of filtered) {
      if (schedule.day_of_week === 0 || schedule.day_of_week === 6) continue;
      const start = timestampToTimeInput(schedule.start_time);
      const end = timestampToTimeInput(schedule.end_time);
      const key = `${start}-${end}`;
      if (!seen.has(key)) {
        seen.set(key, { key, start, end, label: `${start} – ${end}`, startMinutes: toMinutes(start) });
      }
    }
    return [...seen.values()].sort((a, b) => a.startMinutes - b.startMinutes);
  });

  function entriesFor(day: number, slot: Slot): Schedule[] {
    return filtered.filter(schedule => schedule.day_of_week === day && slotKeyOf(schedule) === slot.key);
  }

  const hasSelection = $derived(mode === 'class' ? selectedClassId !== '' : selectedTeacherId !== '');

  function buildQuery(): string {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (selectedYearId) params.set('academic_year_id', selectedYearId);
    if (mode === 'class' && selectedClassId) params.set('class_id', selectedClassId);
    if (mode === 'teacher' && selectedTeacherId) params.set('teacher_id', selectedTeacherId);
    return params.toString();
  }

  $effect(() => {
    window.history.replaceState(null, '', `/schedules?${buildQuery()}`);
  });

  function changeYear(yearId: string): void {
    selectedYearId = yearId;
    if (selectedClassId && yearId && !classes.some(item => item.id === selectedClassId && item.academic_year_id === yearId)) {
      selectedClassId = '';
    }
  }

  function switchMode(next: Mode): void {
    mode = next;
  }

  function prefilledForm(): ScheduleForm {
    return {
      ...createEmptyScheduleForm(),
      class_id: mode === 'class' ? selectedClassId : '',
      teacher_user_id: mode === 'teacher' ? selectedTeacherId : '',
      academic_year_id: selectedYearId || activeYearId,
    };
  }

  function openCreate(): void { form = prefilledForm(); selected = null; startTimeInput = '07:30'; endTimeInput = '09:00'; isOpen = true; }
  function openCreateAt(day: number, slot: Slot): void {
    form = { ...prefilledForm(), day_of_week: day };
    selected = null;
    startTimeInput = slot.start;
    endTimeInput = slot.end;
    isOpen = true;
  }
  function openEdit(item: Schedule): void { selected = item; form = scheduleToForm(item); startTimeInput = timestampToTimeInput(item.start_time); endTimeInput = timestampToTimeInput(item.end_time); isOpen = true; }
  function confirmDelete(item: Schedule): void { selected = item; isDeleteOpen = true; }
  function removeFromEdit(): void { const target = selected; isOpen = false; if (target) confirmDelete(target); }

  function gridPath(): string {
    const query = buildQuery();
    return query ? `/schedules?${query}` : '/schedules';
  }

  async function submit(): Promise<void> {
    form.start_time = timeInputToTimestamp(startTimeInput, form.day_of_week);
    form.end_time = timeInputToTimestamp(endTimeInput, form.day_of_week);
    const result = selected
      ? await api(() => axios.put(`/schedules/${selected!.id}`, form))
      : await api(() => axios.post('/schedules', form));
    if (result.success) { isOpen = false; router.visit(gridPath(), { preserveScroll: true }); }
  }
  async function remove(): Promise<void> {
    if (!selected) return;
    const result = await api(() => axios.delete(`/schedules/${selected!.id}`));
    if (result.success) { isDeleteOpen = false; router.visit(gridPath(), { preserveScroll: true }); }
  }
</script>

<Sidebar group="schedules" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Manajemen Jadwal</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Jadwal Pelajaran.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
        Pilih kelas atau guru untuk melihat jadwal mingguan.
      </p>
    </div>
    {#if permissions.canCreate}<Button onclick={openCreate} size="lg">Tambah Jadwal</Button>{/if}
  </div>

  <div class="flex flex-col lg:flex-row lg:items-end gap-3 mb-6">
    <div class="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
      <Button variant={mode === 'class' ? 'default' : 'ghost'} size="sm" onclick={() => switchMode('class')}>Per Kelas</Button>
      <Button variant={mode === 'teacher' ? 'default' : 'ghost'} size="sm" onclick={() => switchMode('teacher')}>Per Guru</Button>
    </div>
    <div class="flex flex-col sm:flex-row gap-3 flex-1">
      <div class="flex-1 min-w-44">
        <Label for="schedule-year" class="sr-only">Tahun ajaran</Label>
        <Select id="schedule-year" bind:value={selectedYearId} onchange={() => changeYear(selectedYearId)} placeholder="Pilih tahun ajaran">
          {#each years as year}<option value={year.id}>{year.name}</option>{/each}
        </Select>
      </div>
      {#if mode === 'class'}
        <div class="flex-1 min-w-44">
          <Label for="schedule-class" class="sr-only">Kelas</Label>
          <Select id="schedule-class" bind:value={selectedClassId} placeholder="Pilih kelas">
            {#each yearClasses as c}<option value={c.id}>{c.name}</option>{/each}
          </Select>
        </div>
      {:else}
        <div class="flex-1 min-w-44">
          <Label for="schedule-teacher" class="sr-only">Guru</Label>
          <Select id="schedule-teacher" bind:value={selectedTeacherId} placeholder="Pilih guru">
            {#each teachers as t}<option value={t.id}>{t.name || t.username}</option>{/each}
          </Select>
        </div>
      {/if}
    </div>
  </div>

  {#if !hasSelection}
    <div class="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
      {mode === 'class' ? 'Pilih kelas untuk melihat jadwalnya' : 'Pilih guru untuk melihat jadwal mengajarnya'}
    </div>
  {:else if slots.length === 0}
    <div class="rounded-2xl border border-border bg-card p-10 text-center">
      <p class="text-muted-foreground">Belum ada jadwal {mode === 'class' ? 'untuk kelas ini' : 'untuk guru ini'}.</p>
      {#if permissions.canCreate}<Button onclick={openCreate} class="mt-4">Tambah Jadwal</Button>{/if}
    </div>
  {:else}
    {#if weekendCount > 0}
      <p class="mb-3 text-xs text-muted-foreground">Ada {weekendCount} jadwal di Sabtu/Minggu yang tidak ditampilkan di grid ini.</p>
    {/if}
    <div class="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_8px_28px_rgba(32,36,38,0.025)] dark:shadow-none">
      <table class="w-full min-w-[64rem] text-sm border-collapse">
        <thead class="bg-secondary/70 border-b border-border">
          <tr>
            <th class="px-4 py-3.5 text-left font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground w-32">Jam</th>
            {#each SCHOOL_DAYS as day}
              <th class="px-4 py-3.5 text-left font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">{DAY_NAMES[day]}</th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each slots as slot (slot.key)}
            <tr>
              <td class="px-4 py-3 font-heading text-xs font-semibold text-muted-foreground whitespace-nowrap align-top">{slot.label}</td>
              {#each SCHOOL_DAYS as day (day)}
                {@const entries = entriesFor(day, slot)}
                <td class="px-2 py-2 align-top border-l border-border/60">
                  {#if entries.length === 0}
                    {#if permissions.canCreate}
                      <button type="button" title="Tambah jadwal" aria-label={`Tambah jadwal ${DAY_NAMES[day]} ${slot.label}`} onclick={() => openCreateAt(day, slot)} class="flex w-full min-h-16 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/50 transition-colors hover:border-primary/50 hover:text-primary hover:bg-primary/5 cursor-pointer">
                        <Plus class="h-4 w-4" />
                      </button>
                    {/if}
                  {:else}
                    <div class="flex flex-col gap-1.5">
                      {#each entries as entry (entry.id)}
                        {#if permissions.canEdit}
                          <button type="button" title="Edit jadwal" onclick={() => openEdit(entry)} class="block w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer">
                            <span class="block truncate text-[13px] font-semibold text-foreground">{subjectNames.get(entry.subject_id) ?? '-'}</span>
                            <span class="block truncate text-xs text-muted-foreground">{mode === 'class' ? (teacherNames.get(entry.teacher_user_id) ?? '-') : (classNames.get(entry.class_id) ?? '-')}</span>
                          </button>
                        {:else}
                          <div class="block w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-left">
                            <span class="block truncate text-[13px] font-semibold text-foreground">{subjectNames.get(entry.subject_id) ?? '-'}</span>
                            <span class="block truncate text-xs text-muted-foreground">{mode === 'class' ? (teacherNames.get(entry.teacher_user_id) ?? '-') : (classNames.get(entry.class_id) ?? '-')}</span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<Modal bind:open={isOpen} title={selected ? 'Edit Jadwal' : 'Tambah Jadwal'} description="Tambah atau ubah jadwal pelajaran. Atur tahun ajaran, hari, jam, kelas, mapel, dan guru.">
  <form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="flex flex-col gap-0"><Label for="year" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Tahun Ajaran</Label>
      <Select id="year" bind:value={form.academic_year_id} placeholder="Pilih tahun ajaran">
        {#each years as y}<option value={y.id}>{y.name}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="day" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Hari</Label>
      <Select id="day" bind:value={form.day_of_week} placeholder="Pilih hari">
        {#each ALL_DAYS as i}<option value={i}>{DAY_NAMES[i]}</option>{/each}
      </Select>
    </div>
    <div class="flex flex-col gap-0"><Label for="start" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mulai</Label><Input id="start" type="time" bind:value={startTimeInput} required /></div>
    <div class="flex flex-col gap-0"><Label for="end" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Selesai</Label><Input id="end" type="time" bind:value={endTimeInput} required /></div>
    <div class="flex flex-col gap-0"><Label for="class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
      <Select id="class" bind:value={form.class_id} placeholder="Pilih kelas">
        {#each modalClasses as c}<option value={c.id}>{c.name}</option>{/each}
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
    <div class="flex justify-between gap-2 pt-4 border-t border-border mt-2">
      <div>
        {#if selected && permissions.canDelete}<Button variant="ghost" class="text-destructive hover:text-destructive" onclick={removeFromEdit}>Hapus</Button>{/if}
      </div>
      <div class="flex gap-2">
        <Button variant="outline" onclick={() => isOpen = false}>Batal</Button>
        <Button type="submit">{selected ? 'Perbarui' : 'Buat'}</Button>
      </div>
    </div>
  </form>
</Modal>

<ConfirmDialog bind:open={isDeleteOpen} title="Hapus Jadwal" description="Jadwal yang dihapus tidak bisa dikembalikan. Lanjutkan?" confirmLabel="Hapus" cancelLabel="Batal" onConfirm={remove} destructive />
