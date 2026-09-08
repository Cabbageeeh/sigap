<script lang="ts" module>
  let readerSequence = 0;
</script>

<script lang="ts">
  import Button from './Button.svelte';
  import { cn } from '$lib/utils.js';
  import { Camera, CameraOff, ImageUp, QrCode, RotateCcw } from '@lucide/svelte';

  type Html5QrcodeInstance = import('html5-qrcode').Html5Qrcode;

  let {
    onDetected,
    onError,
    autoStart = true,
    class: className,
  }: {
    onDetected: (rawText: string) => void;
    onError?: (message: string) => void;
    autoStart?: boolean;
    class?: string;
  } = $props();

  const containerId = `qr-reader-${++readerSequence}`;

  let fileEl: HTMLInputElement | null = $state(null);
  let scannerError = $state<string | null>(null);
  let scannerLive = $state(false);
  let scanDone = $state(false);

  // Guard kamera — plain (bukan $state) supaya tidak di-track $effect.
  let scanner: Html5QrcodeInstance | null = null;
  let cameraStarted = false;
  let resultDelivered = false;

  function reportScannerFailure(message: string): void {
    scannerError = message;
    onError?.(message);
  }

  async function stopScannerCamera(): Promise<void> {
    scannerLive = false;
    if (scanner) {
      const active = scanner;
      scanner = null;
      try {
        if (cameraStarted) await active.stop();
      } catch {
        // Abaikan — kamera mungkin belum sempat menyala.
      }
      try {
        await active.clear();
      } catch {
        // Abaikan — wadah mungkin sudah dibersihkan.
      }
    }
    cameraStarted = false;
  }

  function deliverScanResult(rawText: string): void {
    if (resultDelivered) return;
    resultDelivered = true;
    scanDone = true;
    void stopScannerCamera();
    onDetected(rawText);
  }

  async function ensureScannerStarted(): Promise<void> {
    if (cameraStarted || resultDelivered) return;
    scannerError = null;
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reportScannerFailure('Kamera membutuhkan koneksi aman (HTTPS atau localhost). Akses lewat alamat IP tidak diizinkan browser — unggah foto QR sebagai gantinya.');
      return;
    }
    try {
      // Tunggu wadah ter-render sebelum mengikat scanner.
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (!document.getElementById(containerId)) {
        reportScannerFailure('Wadah pemindai tidak ditemukan. Muat ulang halaman lalu coba lagi.');
        return;
      }
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopScannerCamera();
      scanner = new Html5Qrcode(containerId, { verbose: false });
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          deliverScanResult(decodedText);
        },
        () => {
          // Abaikan kegagalan decode per-frame.
        },
      );
      cameraStarted = true;
      scannerLive = true;
    } catch {
      cameraStarted = false;
      scannerLive = false;
      reportScannerFailure('Kamera tidak dapat dinyalakan. Pastikan izin kamera diizinkan dan halaman dibuka lewat HTTPS atau localhost.');
    }
  }

  function rescanQrCode(): void {
    resultDelivered = false;
    scanDone = false;
    scannerError = null;
    if (fileEl) fileEl.value = '';
    void ensureScannerStarted();
  }

  async function decodeUploadedImage(file: File): Promise<void> {
    scannerError = null;
    let probe: Html5QrcodeInstance | null = null;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopScannerCamera();
      probe = new Html5Qrcode(containerId, { verbose: false });
      const decoded = await probe.scanFile(file, false);
      if (decoded) {
        deliverScanResult(decoded);
        return;
      }
      reportScannerFailure('QR tidak terbaca dari gambar. Pastikan gambar jelas lalu coba lagi.');
    } catch {
      reportScannerFailure('QR tidak terbaca dari gambar. Pastikan gambar jelas lalu coba lagi.');
    } finally {
      if (probe) {
        try {
          await probe.clear();
        } catch {
          // Abaikan — wadah mungkin sudah dibersihkan.
        }
      }
    }
  }

  $effect(() => {
    if (autoStart) void ensureScannerStarted();
    return () => {
      void stopScannerCamera();
    };
  });
</script>

<div data-slot="qr-scanner" class={cn('flex flex-col gap-3', className)}>
  <div class="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted">
    <div id={containerId} class="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"></div>

    {#if scannerLive}
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div class="relative h-3/5 w-3/5">
          <span class="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-primary"></span>
          <span class="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-primary"></span>
          <span class="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-primary"></span>
          <span class="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-primary"></span>
        </div>
      </div>
      <p class="absolute inset-x-0 bottom-3 text-center font-mono-accent text-[10px] uppercase tracking-[0.2em] text-white drop-shadow-md">Arahkan kamera ke QR absen</p>
    {:else if !scanDone && !scannerError}
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
        <QrCode class="h-8 w-8 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">Menyalakan kamera...</p>
      </div>
    {/if}
  </div>

  <input
    bind:this={fileEl}
    type="file"
    accept="image/*"
    class="hidden"
    aria-label="Unggah foto QR"
    onchange={(event) => {
      const file = event.currentTarget.files?.[0];
      if (file) void decodeUploadedImage(file);
    }}
  />

  <div class="flex flex-wrap items-center gap-2">
    {#if scannerLive}
      <Button variant="outline" onclick={() => void stopScannerCamera()}>
        <CameraOff />
        Matikan kamera
      </Button>
    {:else if !scanDone}
      <Button onclick={() => void ensureScannerStarted()}>
        <Camera />
        Nyalakan kamera
      </Button>
    {:else}
      <Button variant="outline" onclick={rescanQrCode}>
        <RotateCcw />
        Pindai ulang
      </Button>
    {/if}
    {#if !scanDone}
      <Button variant="outline" onclick={() => fileEl?.click()}>
        <ImageUp />
        Unggah foto QR
      </Button>
    {/if}
  </div>

  {#if scannerError}
    <p class="text-sm text-destructive leading-relaxed">{scannerError}</p>
  {/if}
</div>
