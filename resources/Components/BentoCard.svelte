<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { inertia } from '@inertiajs/svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { cn } from '$lib/utils.js';

  type Tone = 'primary' | 'info' | 'warning' | 'success';

  const TONES: Record<Tone, { icon: string; glow: string; bar: string; ring: string; hoverBorder: string }> = {
    primary: {
      icon: 'bg-primary/10 text-primary',
      glow: 'bg-primary/[0.07]',
      bar: 'from-primary/70 to-primary/0',
      ring: 'ring-primary/15',
      hoverBorder: 'hover:border-primary/35',
    },
    info: {
      icon: 'bg-info-500/10 text-info-600 dark:text-info-400',
      glow: 'bg-info-500/[0.08]',
      bar: 'from-info-500/70 to-info-500/0',
      ring: 'ring-info-500/15',
      hoverBorder: 'hover:border-info-500/35',
    },
    warning: {
      icon: 'bg-warning-500/10 text-warning-600 dark:text-warning-400',
      glow: 'bg-warning-500/[0.08]',
      bar: 'from-warning-500/70 to-warning-500/0',
      ring: 'ring-warning-500/15',
      hoverBorder: 'hover:border-warning-500/35',
    },
    success: {
      icon: 'bg-success-500/10 text-success-600 dark:text-success-400',
      glow: 'bg-success-500/[0.08]',
      bar: 'from-success-500/70 to-success-500/0',
      ring: 'ring-success-500/15',
      hoverBorder: 'hover:border-success-500/35',
    },
  };

  let {
    title,
    description,
    class: className,
    children,
    icon: Icon,
    tone = 'primary',
    href,
    cta,
    meta,
  }: {
    title?: string;
    description?: string;
    class?: string;
    children?: Snippet;
    icon?: Component;
    tone?: Tone;
    href?: string;
    cta?: string;
    meta?: string;
  } = $props();

  const t = $derived(TONES[tone]);
</script>

<div
  data-slot="bento-card"
  class={cn(
    "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(32,36,38,0.05),0_16px_40px_-12px_rgba(32,36,38,0.16)] dark:shadow-none dark:hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]",
    href ? cn(t.hoverBorder, "cursor-pointer") : "hover:border-foreground/20 dark:hover:border-primary/25",
    className
  )}
>
  <div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/[0.035] to-transparent dark:from-white/[0.04]"></div>
  <div class={cn("pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110", t.glow)}></div>
  <div class={cn("pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100", t.bar)}></div>

  <div class="relative z-10 flex h-full flex-col">
    {#if Icon}
      <span class={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105", t.icon, t.ring)}>
        <Icon class="h-[18px] w-[18px]" strokeWidth={2.1} />
      </span>
    {/if}
    {#if title}
      <h3 class="font-heading text-base font-semibold tracking-[-0.015em] text-foreground">{title}</h3>
    {/if}
    {#if description}
      <p class="mt-2 text-sm text-muted-foreground font-body leading-relaxed">{description}</p>
    {/if}
    {#if meta}
      <p class="mt-2.5 font-mono-accent text-[10px] uppercase tracking-[0.13em] text-muted-foreground/75">{meta}</p>
    {/if}
    <div class={cn("flex flex-1 flex-col", title ? 'mt-6' : '', !description && !Icon && "mt-4")}>
      {@render children?.()}
    </div>
    {#if href && cta}
      <a {href} use:inertia class="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 after:absolute after:inset-0 after:z-20 after:content-['']">
        {cta}
        <ArrowRight class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </a>
    {/if}
  </div>
</div>
