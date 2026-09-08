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
    "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors duration-150 hover:border-foreground/20 dark:hover:border-primary/25",
    className
  )}
>
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
