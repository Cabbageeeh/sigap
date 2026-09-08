<script lang="ts">
  import { router, inertia } from '@inertiajs/svelte';
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import Button from '../Components/Button.svelte';
  import Select from '../Components/Select.svelte';
  import Input from '../Components/Input.svelte';
  import Label from '../Components/Label.svelte';
  import ConfirmDialog from '../Components/ConfirmDialog.svelte';
  import type { AcademicYear, Class, Schedule, Subject, Teacher, TeacherClassAssignment } from '../types';
  import { timestampToTimeInput, timeInputToTimestamp } from '$lib/utils/datetime';
  import { ArrowRight, CalendarClock, Check, Plus, Save, Trash2, UserRound } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  interface TeacherScheduleRow extends Schedule {
    class_name: string;
    subject_name: string;
    teacher_name: string | null;
  }

  interface Props {
    permissions: { canEdit?: boolean };
    teachers?: Teacher[];
    classes?: Class[];
    years?: AcademicYear[];
    assignments?: TeacherClassAssignment[];
    subjects?: Subject[];
    schedules?: TeacherScheduleRow[];
    selectedYearId?: string;
  }

  let {
    permissions,
    teachers = [],
    classes = [],
    years = [],
    assignments = [],
    subjects = [],
    schedules = [],
    selectedYearId = '',
  }: Props = $props();

  let currentYearId = $state(selectedYearId);
  let selectedTeacherId = $state(teachers[0]?.id ?? '');
  let assignedClassIds = $state<string[]>([]);
  let homeroomClassId = $state('');
  let isSaving = $state(false);
  let scheduleClassId = $state('');
  let scheduleSubjectId = $state('');
  let scheduleDay = $state(1);
  let scheduleStart = $state('07:30');
  let scheduleEnd = $state('09:00');
  let isSavingSchedule = $state(false);
  let scheduleToDelete: TeacherScheduleRow | null = $state(null);
  let isDeleteScheduleOpen = $state(false);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const selectedTeacher = $derived(teachers.find(teacher => teacher.id === selectedTeacherId));
  const selectedAssignments = $derived(assignments.filter(assignment => assignment.teacher_id === selectedTeacherId));
  const assignedClasses = $derived(classes.filter(classItem => assignedClassIds.includes(classItem.id)));
  const teacherSchedules = $derived(selectedTeacher ? schedules.filter(schedule => schedule.teacher_user_id === selectedTeacher.user_id) : []);

  $effect(() => {
    assignedClassIds = selectedAssignments.map(assignment => assignment.class_id);
    homeroomClassId = selectedAssignments.find(assignment => assignment.is_homeroom === 1)?.class_id ?? '';
    scheduleClassId = '';
    scheduleSubjectId = '';
  });

  function teacherName(teacher: Teacher): string {
    return teacher.user_name || teacher.user_username || 'Guru tanpa nama';
  }

  function toggleClass(classId: string): void {
    if (assignedClassIds.includes(classId)) {
      assignedClassIds = assignedClassIds.filter(id => id !== classId);
      if (homeroomClassId === classId) homeroomClassId = '';
      return;
    }
    assignedClassIds = [...assignedClassIds, classId];
  }

  function setHomeroom(classId: string): void {
    if (assignedClassIds.includes(classId)) homeroomClassId = classId;
  }

  function changeYear(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!value || value === currentYearId) return;
    router.visit(`/teacher-assignments?academic_year_id=${encodeURIComponent(value)}`, { preserveScroll: true });
  }

  async function submit(): Promise<void> {
    if (!selectedTeacherId || !currentYearId || isSaving) return;
    isSaving = true;
    const result = await api(() => axios.post(`/teacher-assignments/${selectedTeacherId}`, {
      academic_year_id: currentYearId,
      assignments: assignedClassIds.map(classId => ({
        class_id: classId,
        is_homeroom: classId === homeroomClassId,
      })),
    }));
    isSaving = false;
    if (result.success) {
      router.visit(`/teacher-assignments?academic_year_id=${encodeURIComponent(currentYearId)}`, { preserveScroll: true });
    }
  }

  async function submitSchedule(): Promise<void> {
    if (!selectedTeacher || !currentYearId || !scheduleClassId || !scheduleSubjectId || isSavingSchedule) return;
    isSavingSchedule = true;
    const result = await api(() => axios.post('/schedules', {
      class_id: scheduleClassId,
      subject_id: scheduleSubjectId,
      teacher_user_id: selectedTeacher.user_id,
      academic_year_id: currentYearId,
      day_of_week: scheduleDay,
      start_time: timeInputToTimestamp(scheduleStart, scheduleDay),
      end_time: timeInputToTimestamp(scheduleEnd, scheduleDay),
    }));
    isSavingSchedule = false;
    if (result.success) {
      scheduleSubjectId = '';
      router.visit(`/teacher-assignments?academic_year_id=${encodeURIComponent(currentYearId)}`, { preserveScroll: true });
    }
  }

  function confirmDeleteSchedule(item: TeacherScheduleRow): void {
    scheduleToDelete = item;
    isDeleteScheduleOpen = true;
  }

  async function removeSchedule(): Promise<void> {
    if (!scheduleToDelete) return;
    const result = await api(() => axios.delete(`/schedules/${scheduleToDelete!.id}`));
    if (result.success) {
      isDeleteScheduleOpen = false;
      scheduleToDelete = null;
      router.visit(`/teacher-assignments?academic_year_id=${encodeURIComponent(currentYearId)}`, { preserveScroll: true });
    }
  }
</script>

<Sidebar group="teacher-assignments" />
<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10" in:fly={{ y: 20, duration: 800 }}>
    <div>
      <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Data Master · Guru</p>
      <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground">
        Penugasan Guru.
      </h1>
      <p class="mt-4 text-base text-muted-foreground leading-relaxed max-w-[60ch]">
        Tentukan kelas yang diampu setiap guru, lalu susun jadwal mengajarnya (mapel, kelas, hari, jam) pada bagian bawah. Satu guru dapat ditetapkan sebagai wali kelas untuk satu kelas pada setiap tahun ajaran.
      </p>
    </div>
    <div class="flex items-center gap-3 min-w-56">
      <Label for="academic-year" class="sr-only">Tahun ajaran</Label>
      <Select id="academic-year" bind:value={currentYearId} onchange={changeYear} placeholder="Pilih tahun ajaran">
        {#each years as year}<option value={year.id}>{year.name}</option>{/each}
      </Select>
    </div>
  </div>

  {#if !permissions.canEdit}
    <div class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Halaman ini hanya dapat diakses admin.</div>
  {:else if teachers.length === 0}
    <div class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Belum ada data guru. Tambahkan guru dari menu Guru terlebih dahulu.</div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-[minmax(15rem,22rem)_1fr] gap-6">
      <section class="rounded-2xl border border-border bg-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border">
          <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Daftar Guru</p>
          <p class="mt-1 text-sm text-muted-foreground">Pilih guru untuk mengatur kelas.</p>
        </div>
        <div class="divide-y divide-border">
          {#each teachers as teacher (teacher.id)}
            <button
              type="button"
              class={`w-full text-left px-5 py-4 transition-colors cursor-pointer ${selectedTeacherId === teacher.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/40'}`}
              aria-pressed={selectedTeacherId === teacher.id}
              onclick={() => selectedTeacherId = teacher.id}
            >
              <span class="flex items-center gap-3">
                <span class={`flex items-center justify-center h-8 w-8 rounded-full border ${selectedTeacherId === teacher.id ? 'border-primary/40 bg-primary/15' : 'border-border bg-secondary/50'}`}>
                  <UserRound class="h-4 w-4" />
                </span>
                <span class="min-w-0">
                  <span class="block truncate font-medium">{teacherName(teacher)}</span>
                  <span class="block truncate text-xs text-muted-foreground">{teacher.employee_id || teacher.user_username || 'NIP belum diisi'}</span>
                </span>
              </span>
              <span class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{assignments.filter(assignment => assignment.teacher_id === teacher.id).length} kelas diampu</span>
                {#if assignments.some(assignment => assignment.teacher_id === teacher.id && assignment.is_homeroom === 1)}<span class="text-primary">Wali kelas</span>{/if}
              </span>
            </button>
          {/each}
        </div>
      </section>

      <section class="rounded-2xl border border-border bg-card p-5 sm:p-7">
        {#if selectedTeacher}
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
            <div>
              <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground mb-2">Pengaturan penugasan</p>
              <h2 class="font-heading text-2xl font-semibold tracking-[-0.02em]">{teacherName(selectedTeacher)}</h2>
              <p class="mt-1 text-sm text-muted-foreground">@{selectedTeacher.user_username || 'Username belum tersedia'}</p>
            </div>
            <Button onclick={submit} disabled={isSaving}>
              <Save class="h-4 w-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Penugasan'}
            </Button>
          </div>

          <div class="rounded-md border border-border bg-secondary/20 px-4 py-3 mb-6 text-sm text-muted-foreground">
            Pilih semua kelas yang diampu. Tandai satu kelas sebagai <strong class="text-foreground">wali kelas</strong> jika guru ini menjadi wali kelasnya.
          </div>

          {#if classes.length === 0}
            <div class="py-10 text-center text-muted-foreground">Belum ada kelas pada tahun ajaran ini.</div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each classes as classItem (classItem.id)}
                {@const assigned = assignedClassIds.includes(classItem.id)}
                <div class={`rounded-md border p-4 transition-colors ${assigned ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'}`}>
                  <button type="button" class="w-full text-left cursor-pointer" onclick={() => toggleClass(classItem.id)} aria-pressed={assigned}>
                    <span class="flex items-start gap-3">
                      <span class={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${assigned ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                        {#if assigned}<Check class="h-3.5 w-3.5" />{/if}
                      </span>
                      <span>
                        <span class="block font-medium">{classItem.name}</span>
                        <span class="block text-xs text-muted-foreground">Tingkat {String(classItem.grade).replace(/\.0$/, '')}</span>
                      </span>
                    </span>
                  </button>
                  {#if assigned}
                    <button type="button" class={`mt-3 inline-flex items-center gap-1.5 text-xs cursor-pointer ${homeroomClassId === classItem.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`} onclick={() => setHomeroom(classItem.id)} aria-pressed={homeroomClassId === classItem.id}>
                      <span class={`h-3 w-3 rounded-full border ${homeroomClassId === classItem.id ? 'border-primary bg-primary ring-2 ring-primary/20' : 'border-border'}`}></span>
                      {homeroomClassId === classItem.id ? 'Wali kelas' : 'Jadikan wali kelas'}
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <div class="py-10 text-center text-muted-foreground">Pilih guru untuk mulai mengatur penugasan.</div>
        {/if}
      </section>
    </div>

    {#if selectedTeacher}
      <section class="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div class="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Jadwal mengajar · {teacherName(selectedTeacher)}</p>
            <p class="mt-1 text-sm text-muted-foreground">Kelas yang bisa dijadwalkan mengikuti kelas yang diampu di atas.</p>
          </div>
          <a href="/schedules" use:inertia class="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            Semua jadwal <ArrowRight class="w-4 h-4" />
          </a>
        </div>

        {#if assignedClasses.length === 0}
          <p class="px-5 py-8 text-center text-sm text-muted-foreground">Tetapkan kelas yang diampu di atas terlebih dahulu sebelum menyusun jadwal.</p>
        {:else}
          <form class="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end p-5 border-b border-border" onsubmit={(e) => { e.preventDefault(); void submitSchedule(); }}>
            <div class="flex flex-col gap-0">
              <Label for="schedule-class" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Kelas</Label>
              <Select id="schedule-class" bind:value={scheduleClassId} placeholder="Pilih kelas">
                {#each assignedClasses as classItem}<option value={classItem.id}>{classItem.name}</option>{/each}
              </Select>
            </div>
            <div class="flex flex-col gap-0">
              <Label for="schedule-subject" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mapel</Label>
              <Select id="schedule-subject" bind:value={scheduleSubjectId} placeholder="Pilih mapel">
                {#each subjects as subject}<option value={subject.id}>{subject.name}</option>{/each}
              </Select>
            </div>
            <div class="flex flex-col gap-0">
              <Label for="schedule-day" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Hari</Label>
              <Select id="schedule-day" bind:value={scheduleDay} placeholder="Pilih hari">
                {#each days as day, i}<option value={i}>{day}</option>{/each}
              </Select>
            </div>
            <div class="flex flex-col gap-0">
              <Label for="schedule-start" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Mulai</Label>
              <Input id="schedule-start" type="time" bind:value={scheduleStart} required />
            </div>
            <div class="flex flex-col gap-0">
              <Label for="schedule-end" class="text-xs uppercase tracking-[0.2em] font-heading text-muted-foreground mb-1.5">Selesai</Label>
              <Input id="schedule-end" type="time" bind:value={scheduleEnd} required />
            </div>
            <Button type="submit" disabled={isSavingSchedule}>
              <Plus class="h-4 w-4" />
              {isSavingSchedule ? 'Menyimpan...' : 'Tambah'}
            </Button>
          </form>

          <div class="divide-y divide-border">
            {#each teacherSchedules as schedule (schedule.id)}
              <div class="flex items-center justify-between gap-4 px-5 py-3.5">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15">
                    <CalendarClock class="h-4 w-4 text-primary" />
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-medium">{schedule.class_name} · {schedule.subject_name}</p>
                    <p class="font-mono-accent text-xs text-muted-foreground">{days[schedule.day_of_week] ?? '-'} · {timestampToTimeInput(schedule.start_time)}–{timestampToTimeInput(schedule.end_time)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onclick={() => confirmDeleteSchedule(schedule)}>
                  <Trash2 class="w-4 h-4 text-destructive" />
                </Button>
              </div>
            {:else}
              <p class="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada jadwal mengajar untuk guru ini.</p>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <div class="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
      <ArrowRight class="h-4 w-4 text-primary" />
      <span>Guru dapat mengelola nilai hanya pada kelas yang ditugaskan.</span>
    </div>
    <ConfirmDialog bind:open={isDeleteScheduleOpen} title="Hapus Jadwal" description="Jadwal mengajar ini akan dihapus permanen." onConfirm={removeSchedule} destructive />
  {/if}
</div>
