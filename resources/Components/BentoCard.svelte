<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  let {
    title,
    description,
    class: className,
    children,
  }: {
    title?: string;
    description?: string;
    class?: string;
    children?: Snippet;
  } = $props();
</script>

<div
  data-slot="bento-card"
  class={cn(
    "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(32,36,38,0.04),0_10px_30px_-12px_rgba(32,36,38,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_2px_4px_rgba(32,36,38,0.05),0_16px_40px_-12px_rgba(32,36,38,0.16)] dark:shadow-none dark:hover:border-primary/25 dark:hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]",
    className
  )}
>
    <div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/[0.035] to-transparent dark:from-white/[0.04]"></div>
    <div class="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/[0.05] blur-2xl transition-opacity duration-300 opacity-60 group-hover:opacity-100"></div>
  <div class="relative z-10 flex h-full flex-col">
    {#if title}
      <h3 class="font-heading text-base font-semibold tracking-[-0.015em] text-foreground">{title}</h3>
    {/if}
    {#if description}
      <p class="mt-2 text-sm text-muted-foreground font-body leading-relaxed">{description}</p>
    {/if}
    <div class={cn("mt-6 flex flex-1 flex-col", !description && "mt-4")}>
      {@render children?.()}
    </div>
  </div>
</div>
