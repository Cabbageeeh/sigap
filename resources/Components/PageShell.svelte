<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';

  let {
    bare = false,
    class: className,
    children,
  }: {
    bare?: boolean;
    class?: string;
    children?: Snippet;
  } = $props();
</script>

<div class={cn("min-h-[100dvh] bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-foreground", !bare && "lg:pl-64")}>
  <div class={cn("mx-auto max-w-[1500px] px-5 pb-16 pt-20 sm:px-8 lg:px-8 lg:pt-8", className)}>
    {@render children?.()}
  </div>
</div>
