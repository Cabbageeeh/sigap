<script lang="ts">
  import type { Component } from 'svelte';
  import { cn } from '$lib/utils.js';

  type Tone = 'primary' | 'info' | 'warning' | 'success';

  const TONES: Record<Tone, { icon: string; glow: string; bar: string }> = {
    primary: {
      icon: 'bg-primary/10 text-primary',
      glow: 'bg-primary/[0.07]',
      bar: 'from-primary/60 to-primary/0',
    },
    info: {
      icon: 'bg-info-500/10 text-info-600 dark:text-info-400',
      glow: 'bg-info-500/[0.08]',
      bar: 'from-info-500/60 to-info-500/0',
    },
    warning: {
      icon: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
      glow: 'bg-warning-500/[0.08]',
      bar: 'from-warning-500/60 to-warning-500/0',
    },
    success: {
      icon: 'bg-success-500/10 text-success-600 dark:text-success-400',
      glow: 'bg-success-500/[0.08]',
      bar: 'from-success-500/60 to-success-500/0',
    },
  };

  let {
    label,
    value,
    change,
    icon: Icon,
    tone = 'primary',
    class: className,
  }: {
    label: string;
    value: string | number;
    change?: { value: string; positive?: boolean };
    icon?: Component;
    tone?: Tone;
    class?: string;
  } = $props();

  const t = $derived(TONES[tone]);
</script>

<div
  data-slot="stat-card"
  class={cn(
    "group relative overflow-hidden bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(32,36,38,0.05),0_16px_40px_-12px_rgba(32,36,38,0.16)] dark:shadow-none dark:hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]",
    className
  )}
>
  <div class={cn("pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-transform duration-300 group-hover:scale-125", t.glow)}></div>
  <div class={cn("pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r opacity-70", t.bar)}></div>

  <div class="relative flex min-h-20 flex-col justify-between gap-4">
    <div class="flex items-center justify-between gap-3">
      <span class="font-heading text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground">{label}</span>
      {#if Icon}
        <span class={cn("flex h-8 w-8 items-center justify-center rounded-xl", t.icon)}>
          <Icon class="h-4 w-4" strokeWidth={2.2} />
        </span>
      {/if}
    </div>
    <div class="flex items-end justify-between gap-3">
      <span class="font-heading text-3xl font-bold tracking-[-0.035em] text-foreground">{value}</span>
      {#if change}
        <span class={cn(
          "text-xs font-mono-accent font-medium",
          change.positive ? "text-primary" : "text-destructive"
        )}>
          {change.value}
        </span>
      {/if}
    </div>
  </div>
</div>
