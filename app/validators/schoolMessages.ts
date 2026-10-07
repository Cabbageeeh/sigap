import { z } from 'zod';

const messageBody = z.string().trim().min(1, 'Pesan wajib diisi').max(1000, 'Pesan maksimal 1.000 karakter');
export const StartSchoolConversationSchema = z.object({
  student_id: z.string().uuid('Pilih anak'),
  teacher_user_id: z.string().uuid('Pilih guru'),
  topic: z.enum(['nilai', 'absensi', 'pembelajaran', 'lainnya']),
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(120, 'Judul maksimal 120 karakter'),
  body: messageBody,
  accept_rules: z.literal(true, { message: 'Setujui aturan komunikasi terlebih dahulu' }),
});
export const SendSchoolMessageSchema = z.object({ body: messageBody });
export const ReportSchoolMessageSchema = z.object({ reason: z.string().trim().min(5, 'Jelaskan alasan laporan').max(500) });
export const SchoolConversationStatusSchema = z.object({ status: z.enum(['open', 'closed']) });
export const SchoolCommunicationSettingsSchema = z.object({
  enabled: z.boolean(),
  service_hours: z.string().trim().min(1).max(200),
});
export const SchoolCommunicationRestrictionSchema = z.object({
  user_id: z.string().uuid(), restricted: z.boolean(), reason: z.string().trim().max(500).default(''),
}).refine(value => !value.restricted || value.reason.length >= 5, { message: 'Isi alasan pembatasan', path: ['reason'] });
