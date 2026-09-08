<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = Omit<HTMLInputAttributes, "type"> &
		({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined });

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: Props = $props();
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
				"selection:bg-primary/20 dark:bg-input/30 selection:text-foreground border-input ring-offset-background placeholder:text-muted-foreground flex h-10 w-full min-w-0 rounded-xl border bg-card px-3 pt-1.5 text-sm font-medium transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
			"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
			"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
				"border-input bg-card selection:bg-primary/20 dark:bg-input/30 selection:text-foreground ring-offset-background placeholder:text-muted-foreground font-body flex h-10 w-full min-w-0 rounded-xl border px-3.5 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
			"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
			"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
