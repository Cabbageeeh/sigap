<script lang="ts">
  import Sidebar from '../../Components/Sidebar.svelte';
  import { fly } from 'svelte/transition';
  import { Lock } from '@lucide/svelte';
  import type { SubjectGradeSummary, StudentGradeProgression } from '../../types';

  let { studentName = '', gradesPublished = false, summaries = [], progression = [] }: {
    studentName?: string;
    gradesPublished?: boolean;
    summaries?: SubjectGradeSummary[];
    progression?: StudentGradeProgression[];
  } = $props();

  function typeLabel(type: string): string {
    switch (type) {
      case 'task': return 'Tugas';
      case 'daily_quiz': return 'Kuis Harian';
      case 'midterm': return 'UTS';
      case 'final': return 'UAS';
      default: return type;
    }
  }
</script>

<Sidebar group="parent" />

<div class="min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground pt-20 lg:pt-8 lg:pl-72 px-6 sm:px-10 lg:pr-8 pb-16">
  <div in:fly={{ y: 20, duration: 700 }}>
    <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">Rapor Anak</p>
    <h1 class="font-heading font-semibold tracking-[-0.045em] leading-[1] text-[clamp(2rem,5vw,3.25rem)] text-foreground mb-8">{studentName ? `Nilai ${studentName}` : 'Nilai Anak'}</h1>
  </div>

  {#if !gradesPublished}
    <div class="bg-card border border-border rounded-2xl px-6 py-12 text-center" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <Lock class="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">Nilai belum dipublikasikan oleh sekolah. Silakan cek kembali nanti.</p>
    </div>
  {:else if summaries.length === 0}
    <div class="bg-card border border-border rounded-2xl px-6 py-12 text-center" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      <p class="text-sm text-muted-foreground">Belum ada nilai.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" in:fly={{ y: 20, duration: 700, delay: 100 }}>
      {#each summaries as summary}
        <article class="bg-card border border-border rounded-2xl overflow-hidden">
          <header class="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
            <span class="font-heading text-sm font-semibold text-foreground truncate">{summary.subject_name}</span>
            <span class="font-mono-accent text-[10px] text-muted-foreground shrink-0">KKM {summary.kkm}</span>
          </header>
          <div class="px-5 py-4">
            <div class="flex flex-col gap-2 text-sm">
              {#each Object.entries(summary.scores) as [type, score]}
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{typeLabel(type)}</span>
                  <span class="text-foreground font-medium">{score ?? '—'}</span>
                </div>
              {/each}
              <div class="flex justify-between border-t border-border/60 pt-2 mt-1">
                <span class="text-muted-foreground font-medium">Nilai Akhir</span>
                <span class="text-foreground font-semibold">{summary.final_score ?? '—'}</span>
              </div>
            </div>
          </div>
          <footer class="px-5 py-3 border-t border-border bg-secondary/30 flex items-center justify-between">
            <span class="font-mono-accent text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Predikat {summary.predikat ?? '—'}</span>
            {#if summary.is_passed === null}
              <span class="text-xs text-muted-foreground">Belum lengkap</span>
            {:else if summary.is_passed}
              <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Tuntas</span>
            {:else}
              <span class="text-xs font-medium text-destructive">Belum Tuntas</span>
            {/if}
          </footer>
        </article>
      {/each}
    </div>
  {/if}

  {#if gradesPublished && progression.length > 0}
    <section class="mt-10" in:fly={{ y: 20, duration: 700, delay: 150 }}>
      <div class="mb-4">
        <p class="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Riwayat Penilaian</p>
        <h2 class="font-heading font-semibold tracking-tight text-xl">Perkembangan Akademik</h2>
        <p class="text-sm text-muted-foreground mt-1">Perubahan nilai anak dari setiap penilaian yang sudah dipublikasikan.</p>
      </div>
      <div class="bg-card border border-border rounded-2xl overflow-hidden">
        {#each progression as point (point.id)}
          <article class="px-5 py-4 border-b border-border last:border-b-0">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="font-heading text-sm font-semibold text-foreground truncate">{point.subject_name}</p>
                <p class="text-xs text-muted-foreground mt-1">{typeLabel(point.type)} · {new Date(point.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
              </div>
              <span class="font-heading font-semibold text-foreground shrink-0">{point.score}</span>
            </div>
            <div class="h-2 mt-3 rounded-full bg-secondary overflow-hidden" aria-hidden="true">
              <div class="h-full rounded-full bg-primary transition-all" style={`width: ${Math.max(0, Math.min(100, point.score))}%`}></div>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</div>

