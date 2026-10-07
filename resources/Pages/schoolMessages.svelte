<script lang="ts">
  import axios from 'axios';
  import { api } from '$lib/api';
  import Sidebar from '../Components/Sidebar.svelte';
  import PageShell from '../Components/PageShell.svelte';
  import Button from '../Components/Button.svelte';
  import Modal from '../Components/Modal.svelte';
  import { MessageCircle, Send, Plus, ArrowLeft, Flag, CheckCheck } from '@lucide/svelte';
  import type { SchoolContact, SchoolConversation, SchoolMessage } from '../types';

  let { userId, isParent }: { userId: string; isParent: boolean } = $props();
  interface MessageData {
    settings: { enabled: boolean; service_hours: string };
    restriction: { reason: string } | null;
    contacts: SchoolContact[]; conversations: SchoolConversation[];
    conversation: SchoolConversation | null; messages: SchoolMessage[]; canReply: boolean;
  }
  let data = $state<MessageData | null>(null);
  let selectedId = $state('');
  let listPage = $state(1);
  let messagePage = $state(1);
  let newOpen = $state(false);
  let busy = $state(false);
  let draft = $state('');
  let childId = $state('');
  let teacherId = $state('');
  let topic = $state('nilai');
  let title = $state('');
  let firstMessage = $state('');
  let accepted = $state(false);
  let reportId = $state('');
  let reportOpen = $state(false);
  let reportReason = $state('');
  const topics: Record<string, string> = { nilai: 'Nilai', absensi: 'Absensi', pembelajaran: 'Pembelajaran', lainnya: 'Lainnya' };
  let children = $derived([...new Map((data?.contacts ?? []).map(contact => [contact.student_id, contact])).values()]);
  let teachers = $derived((data?.contacts ?? []).filter(contact => contact.student_id === childId));
  let sendingAllowed = $derived(!!data?.settings.enabled && !data?.restriction);

  async function loadMessages(id = selectedId, list = listPage, history = messagePage) {
    const result = await api<MessageData>(() => axios.get('/messages/data', { params: { conversation_id: id, page: list, message_page: history } }), { showSuccessToast: false });
    if (result.success && result.data && id === selectedId && list === listPage && history === messagePage) data = result.data;
  }
  $effect(() => {
    const id = selectedId;
    const list = listPage;
    const history = messagePage;
    void loadMessages(id, list, history);
    const timer = setInterval(() => { if (!document.hidden) void loadMessages(id, list, history); }, 15000);
    return () => clearInterval(timer);
  });
  async function startConversation() {
    if (busy) return;
    busy = true;
    try {
      const result = await api<{ id: string }>(() => axios.post('/messages', { student_id: childId, teacher_user_id: teacherId, topic, title, body: firstMessage, accept_rules: accepted }));
      if (result.success && result.data) {
        newOpen = false; selectedId = result.data.id; listPage = 1; messagePage = 1;
        title = ''; firstMessage = ''; accepted = false;
      }
    } finally { busy = false; }
  }
  async function sendMessage() {
    if (busy || !draft.trim()) return;
    busy = true;
    try {
      const result = await api(() => axios.post(`/messages/${selectedId}/reply`, { body: draft }));
      if (result.success) { draft = ''; messagePage = 1; await loadMessages(); }
    } finally { busy = false; }
  }
  async function changeStatus() {
    if (busy || !data?.conversation) return;
    busy = true;
    try {
      const result = await api(() => axios.put(`/messages/${selectedId}/status`, { status: data.conversation.status === 'open' ? 'closed' : 'open' }));
      if (result.success) await loadMessages();
    } finally { busy = false; }
  }
  async function submitReport() {
    if (busy) return;
    busy = true;
    try {
      const result = await api(() => axios.post(`/messages/${selectedId}/report/${reportId}`, { reason: reportReason }));
      if (result.success) { reportOpen = false; reportId = ''; reportReason = ''; }
    } finally { busy = false; }
  }
  const formatTime = (value: number) => new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head><title>Pesan — SIGAP</title></svelte:head>
<Sidebar group="messages" />
<PageShell>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div><p class="text-xs uppercase tracking-[.2em] text-primary">Komunikasi sekolah</p><h1 class="mt-2 text-4xl font-semibold">{isParent ? 'Hubungi Guru.' : 'Pesan Orang Tua.'}</h1><p class="mt-3 text-muted-foreground">Satu topik, satu percakapan. Gunakan bahasa sopan dan bahas kebutuhan pendidikan anak.</p></div>
    {#if isParent}<Button disabled={!sendingAllowed} onclick={() => { newOpen = true; }}><Plus size={17} /> Percakapan baru</Button>{/if}
  </div>
  {#if data}
    <div class="mb-5 rounded-2xl border border-border bg-card p-4 text-sm"><b>Jam layanan:</b> {data.settings.service_hours}. Pesan boleh dikirim kapan saja; balasan mengikuti ketersediaan guru. Maksimal 5 pesan dalam 10 menit.</div>
    {#if !data.settings.enabled}<p class="mb-4 rounded-xl bg-secondary p-4">Komunikasi sedang dinonaktifkan sekolah. Riwayat tetap dapat dibaca.</p>{/if}
    {#if data.restriction}<p class="mb-4 rounded-xl border border-destructive/30 p-4 text-destructive">Pengiriman pesan Anda dibatasi: {data.restriction.reason}. Hubungi admin sekolah.</p>{/if}
  {/if}
  <div class="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
    <section class="rounded-2xl border border-border bg-card p-3 {selectedId ? 'hidden lg:block' : ''}">
      <h2 class="px-3 py-3 font-semibold">Percakapan</h2>
      {#each data?.conversations ?? [] as conversation (conversation.id)}
        <button class="mb-2 w-full rounded-xl border p-3 text-left transition-colors hover:bg-secondary {selectedId === conversation.id ? 'border-primary bg-primary/5' : 'border-border'}" onclick={() => { selectedId = conversation.id; draft = ''; messagePage = 1; }}>
          <div class="flex items-center justify-between gap-2"><span class="truncate font-semibold">{isParent ? conversation.teacher_name : conversation.parent_name}</span>{#if conversation.unread > 0}<span class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{conversation.unread}</span>{/if}</div>
          <p class="mt-1 text-sm">{conversation.student_name} · {conversation.class_name}</p>
          <p class="mt-2 truncate text-sm text-muted-foreground">{conversation.title}</p>
          <p class="mt-2 text-xs text-muted-foreground">{topics[conversation.topic]} · {conversation.status === 'closed' ? 'Selesai' : 'Terbuka'}</p>
        </button>
      {:else}<p class="p-3 text-sm text-muted-foreground">Belum ada percakapan. {isParent ? 'Mulai dengan memilih anak dan guru.' : 'Pesan dari orang tua akan muncul di sini.'}</p>{/each}
      <div class="flex items-center justify-between gap-2 p-2"><Button variant="outline" size="sm" disabled={listPage === 1} onclick={() => listPage--}>Sebelumnya</Button><span class="text-xs">{listPage}</span><Button variant="outline" size="sm" disabled={(data?.conversations.length ?? 0) < 50} onclick={() => listPage++}>Berikutnya</Button></div>
    </section>
    <section class="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-card {selectedId ? '' : 'hidden lg:flex'}">
      {#if data?.conversation && data.conversation.id === selectedId}
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
          <div><Button variant="outline" size="sm" class="mb-3 lg:hidden" onclick={() => selectedId = ''}><ArrowLeft size={16} /> Kembali</Button><h2 class="text-lg font-semibold">{data.conversation.title}</h2><p class="mt-1 text-sm text-muted-foreground">{data.conversation.student_name} · {data.conversation.class_name} · {topics[data.conversation.topic]}</p><p class="mt-1 text-sm">{data.conversation.teacher_name} ↔ {data.conversation.parent_name}</p></div>
          {#if data.conversation.teacher_user_id === userId}<Button variant="outline" size="sm" disabled={busy || !data.canReply} onclick={changeStatus}><CheckCheck size={16} />{data.conversation.status === 'open' ? 'Tandai selesai' : 'Buka kembali'}</Button>{/if}
        </div>
        <div class="max-h-[560px] flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          <div class="flex justify-center gap-2"><Button variant="outline" size="sm" disabled={data.messages.length < 100} onclick={() => messagePage++}>Pesan lebih lama</Button><Button variant="outline" size="sm" disabled={messagePage === 1} onclick={() => messagePage--}>Pesan lebih baru</Button></div>
          {#each data.messages as message (message.id)}
            <div class="flex {message.sender_user_id === userId ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[90%] rounded-2xl border border-border p-3 {message.sender_user_id === userId ? 'bg-primary/10' : 'bg-secondary/50'}"><p class="text-xs font-semibold">{message.sender_name}</p><p class="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p><div class="mt-2 flex items-center gap-3"><time class="text-[11px] text-muted-foreground">{formatTime(message.created_at)}</time>{#if message.sender_user_id !== userId}<button class="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary" aria-label="Laporkan pesan" onclick={() => { reportId = message.id; reportReason = ''; reportOpen = true; }}><Flag size={12} /> Laporkan</button>{/if}</div></div>
            </div>
          {/each}
        </div>
        <form class="border-t border-border p-4" onsubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          {#if data.conversation.status === 'closed'}<p class="mb-3 text-sm text-muted-foreground">Percakapan selesai. Untuk pertanyaan lain, buat percakapan baru.</p>{/if}
          {#if !data.canReply}<p class="mb-3 text-sm text-muted-foreground">Hubungan siswa dan guru telah berubah. Riwayat dapat dibaca, tetapi balasan dihentikan.</p>{/if}
          <label for="message-body" class="sr-only">Isi pesan</label><textarea id="message-body" bind:value={draft} maxlength={1000} rows={3} disabled={!sendingAllowed || !data.canReply || data.conversation.status === 'closed'} placeholder="Tulis pesan dengan sopan…" class="w-full rounded-xl border border-border bg-background p-3 text-sm disabled:opacity-50"></textarea>
          <div class="mt-2 flex items-center justify-between"><span class="text-xs text-muted-foreground">{draft.length}/1.000 karakter</span><Button type="submit" disabled={busy || !draft.trim() || !sendingAllowed || !data.canReply || data.conversation.status === 'closed'}><Send size={16} /> Kirim pesan</Button></div>
        </form>
      {:else}<div class="m-auto p-8 text-center text-muted-foreground"><MessageCircle size={40} class="mx-auto mb-3" /><p>Pilih percakapan untuk membaca dan membalas.</p></div>{/if}
    </section>
  </div>
</PageShell>

<Modal bind:open={newOpen} title="Percakapan baru">
  <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void startConversation(); }}>
    <label class="block text-sm">Anak<select bind:value={childId} onchange={() => teacherId = ''} required class="mt-2 w-full rounded-xl border border-border bg-background p-3"><option value="">Pilih anak</option>{#each children as child (child.student_id)}<option value={child.student_id}>{child.student_name} · {child.class_name}</option>{/each}</select></label>
    <label class="block text-sm">Guru<select bind:value={teacherId} required class="mt-2 w-full rounded-xl border border-border bg-background p-3"><option value="">Pilih wali kelas atau guru mapel</option>{#each teachers as teacher (teacher.teacher_user_id)}<option value={teacher.teacher_user_id}>{teacher.teacher_name} — {teacher.teaching}</option>{/each}</select></label>
    {#if children.length === 0}<p class="text-sm text-muted-foreground">Belum ada anak dengan guru yang tersedia pada tahun ajaran aktif. Hubungi admin untuk memeriksa akun dan penugasan.</p>{/if}
    <label class="block text-sm">Topik<select bind:value={topic} class="mt-2 w-full rounded-xl border border-border bg-background p-3">{#each Object.entries(topics) as [key, label]}<option value={key}>{label}</option>{/each}</select></label>
    <label class="block text-sm">Judul<input bind:value={title} minlength={3} maxlength={120} required class="mt-2 w-full rounded-xl border border-border bg-background p-3" placeholder="Contoh: Menanyakan nilai Biologi" /></label>
    <label class="block text-sm">Pesan<textarea bind:value={firstMessage} maxlength={1000} required rows={4} class="mt-2 w-full rounded-xl border border-border bg-background p-3"></textarea></label>
    <label class="flex items-start gap-3 rounded-xl bg-secondary p-3 text-sm"><input type="checkbox" bind:checked={accepted} required class="mt-1" /><span>Saya akan menggunakan bahasa sopan, membahas kebutuhan pendidikan anak, dan menghindari data pribadi yang tidak diperlukan. Pesan yang dilaporkan dapat diperiksa admin sekolah.</span></label>
    <Button type="submit" disabled={busy || !accepted || !sendingAllowed}><Send size={16} /> Mulai percakapan</Button>
  </form>
</Modal>
<Modal bind:open={reportOpen} title="Laporkan pesan">
  <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void submitReport(); }}><p class="text-sm text-muted-foreground">Admin menerima isi pesan yang dilaporkan beserta alasan Anda.</p><label class="block text-sm">Alasan laporan<textarea bind:value={reportReason} minlength={5} maxlength={500} required rows={4} class="mt-2 w-full rounded-xl border border-border bg-background p-3"></textarea></label><Button type="submit" disabled={busy}>Kirim laporan</Button></form>
</Modal>


