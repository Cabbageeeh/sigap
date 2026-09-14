import { z } from 'zod';

const usernameSchema = z.string()
  .trim()
  .min(3, 'Username minimal 3 karakter')
  .max(50, 'Username maksimal 50 karakter')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung')
  .transform(value => value.toLowerCase());

export const LoginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  username: usernameSchema,
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(100, 'Kata sandi maksimal 100 karakter'),
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
  new_password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(100, 'Kata sandi maksimal 100 karakter'),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  username: usernameSchema,
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(100, 'Kata sandi maksimal 100 karakter'),
  roles: z.array(z.string()).optional(),
  student_id: z.string().uuid('ID siswa tidak valid').optional().nullable(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter').optional(),
  username: usernameSchema.optional(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(100, 'Kata sandi maksimal 100 karakter').optional().or(z.literal('')),
  roles: z.array(z.string()).optional(),
  student_id: z.string().uuid('ID siswa tidak valid').optional().nullable(),
}).refine(
  data => data.name !== undefined || data.username !== undefined ||
    data.password !== undefined || data.roles !== undefined || data.student_id !== undefined,
  { message: 'Minimal satu kolom wajib diubah', path: ['_root'] }
);

export const DeleteUsersSchema = z.object({
  ids: z.array(z.string().uuid('Format ID tidak valid')).min(1, 'Pilih minimal satu pengguna'),
});

export const ChangeProfileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  username: usernameSchema,
});

export const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(100, 'Role name must be at most 100 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .transform(v => v.toLowerCase()),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable().or(z.literal('')),
  permissions: z.array(z.string()).optional().default([]),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(100, 'Role name must be at most 100 characters').optional(),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .transform(v => v.toLowerCase()).optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable().or(z.literal('')),
  permissions: z.array(z.string()).optional(),
}).refine(
  data => data.name !== undefined || data.slug !== undefined ||
    data.description !== undefined || data.permissions !== undefined,
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const AcademicYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  start_at: z.number({ message: 'Start date is required' }),
  end_at: z.number({ message: 'End date is required' }),
  is_active: z.number().optional(),
  is_grades_published: z.number().optional(),
});

export const UpdateAcademicYearSchema = AcademicYearSchema.partial().refine(
  data => data.name !== undefined || data.start_at !== undefined || data.end_at !== undefined || data.is_active !== undefined || data.is_grades_published !== undefined,
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const ClassSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  grade: z.string().min(1, 'Grade is required').max(50, 'Grade must be at most 50 characters'),
  academic_year_id: z.string().uuid('Invalid academic year ID'),
});

export const UpdateClassSchema = ClassSchema.partial().refine(
  data => data.name !== undefined || data.grade !== undefined || data.academic_year_id !== undefined,
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const SubjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be at most 50 characters')
    .regex(/^[a-zA-Z0-9-]+$/, 'Code may only contain letters, numbers, and hyphens'),
  kkm: z.number({ message: 'KKM is required' }).min(0, 'KKM must be at least 0').max(100, 'KKM must be at most 100').default(75),
});

export const UpdateSubjectSchema = SubjectSchema.partial().refine(
  data => data.name !== undefined || data.code !== undefined || data.kkm !== undefined,
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const StudentSchema = z.object({
  nis: z.string().min(1, 'NIS is required').max(50, 'NIS must be at most 50 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  class_id: z.string().uuid('Invalid class ID'),
  parent_user_id: z.string().uuid('Invalid parent ID').optional().nullable(),
  phone: z.string().max(20, 'Phone must be at most 20 characters').optional().nullable(),
  address: z.string().max(500, 'Address must be at most 500 characters').optional().nullable(),
});

export const UpdateStudentSchema = StudentSchema.partial().refine(
  data => Object.values(data).some(v => v !== undefined),
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const TeacherSchema = z.object({
  nip: z.string().trim().min(4, 'NIP minimal 4 karakter').max(50, 'NIP maksimal 50 karakter'),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  subject_ids: z.array(z.string().uuid('ID mata pelajaran tidak valid')).max(50, 'Maksimal 50 mata pelajaran').default([]),
});

export const UpdateTeacherSchema = z.object({
  nip: z.string().trim().min(4, 'NIP minimal 4 karakter').max(50, 'NIP maksimal 50 karakter').optional(),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter').optional(),
  subject_ids: z.array(z.string().uuid('ID mata pelajaran tidak valid')).max(50, 'Maksimal 50 mata pelajaran').optional(),
}).refine(
  data => data.nip !== undefined || data.name !== undefined || data.subject_ids !== undefined,
  { message: 'Minimal satu field wajib diisi untuk update', path: ['_root'] }
);
export const TeacherClassAssignmentsSchema = z.object({
  academic_year_id: z.string().uuid('ID tahun ajaran tidak valid'),
  assignments: z.array(z.object({
    class_id: z.string().uuid('ID kelas tidak valid'),
    is_homeroom: z.boolean(),
  })).max(100, 'Maksimal 100 penugasan kelas'),
}).superRefine((data, context) => {
  const homeroomCount = data.assignments.filter(assignment => assignment.is_homeroom).length;
  if (homeroomCount > 1) {
    context.addIssue({
      code: 'custom',
      path: ['assignments'],
      message: 'Satu guru hanya dapat memiliki satu kelas wali per tahun ajaran',
    });
  }
});

export const ParentSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  phone: z.string().max(20, 'Phone must be at most 20 characters').optional().nullable(),
  address: z.string().max(500, 'Address must be at most 500 characters').optional().nullable(),
});

export const UpdateParentSchema = ParentSchema.partial().refine(
  data => data.user_id !== undefined || data.phone !== undefined || data.address !== undefined,
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const ScheduleSchema = z.object({
  class_id: z.string().uuid('Invalid class ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  teacher_user_id: z.string().uuid('Invalid teacher user ID'),
  day_of_week: z.number().int().min(0, 'Day must be 0-6').max(6, 'Day must be 0-6'),
  start_time: z.number({ message: 'Start time is required' }),
  end_time: z.number({ message: 'End time is required' }),
  academic_year_id: z.string().uuid('Invalid academic year ID'),
});

export const UpdateScheduleSchema = ScheduleSchema.partial().refine(
  data => Object.values(data).some(v => v !== undefined),
  { message: 'At least one field is required to update', path: ['_root'] }
);

export const SchoolProfileSchema = z.object({
  name: z.string().trim().min(1, 'Nama sekolah wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  npsn: z.string().trim().max(20, 'NPSN maksimal 20 karakter').optional().nullable(),
  headmaster_name: z.string().trim().max(100, 'Nama kepala sekolah maksimal 100 karakter').optional().nullable(),
  phone: z.string().trim().max(20, 'Telepon maksimal 20 karakter').optional().nullable(),
  email: z.string().trim().email('Email tidak valid').max(100, 'Email maksimal 100 karakter').optional().nullable(),
  address: z.string().trim().max(500, 'Alamat maksimal 500 karakter').optional().nullable(),
  latitude: z.number().min(-90, 'Latitude minimal -90').max(90, 'Latitude maksimal 90').optional().nullable(),
  longitude: z.number().min(-180, 'Longitude minimal -180').max(180, 'Longitude maksimal 180').optional().nullable(),
  radius_meters: z.number().int('Radius harus bilangan bulat').positive('Radius harus positif').max(100000, 'Radius maksimal 100000 meter').optional().nullable(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam masuk harus HH:MM (contoh 07:00)').optional().nullable(),
}).superRefine((data, context) => {
  const geo = [data.latitude, data.longitude, data.radius_meters];
  const filled = geo.filter(value => value !== undefined && value !== null).length;
  if (filled > 0 && filled < 3) {
    context.addIssue({
      code: 'custom',
      path: ['radius_meters'],
      message: 'Latitude, longitude, dan radius wajib diisi semua untuk mengaktifkan geofencing',
    });
  }
});

export const QrSettingsSchema = z.object({
  qr_refresh_interval: z.number().int().min(1, 'Interval minimal 1 menit').max(1440, 'Interval maksimal 1440 menit (24 jam)'),
});

export const TeacherConfirmationSchema = z.object({
  schedule_id: z.string().uuid('Invalid schedule ID').optional().nullable(),
  qr_token: z.string().min(1, 'QR absen wajib dipindai').optional(),
  teacher_user_id: z.string().uuid('Invalid teacher user ID').optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  distance_meters: z.number().optional().nullable(),
  is_inside_school: z.number().optional(),
  confirmation_date: z.number().optional().nullable(),
  confirmed_at: z.number().optional(),
});

export const JournalSchema = z.object({
  schedule_id: z.string().uuid('Invalid schedule ID'),
  material: z.string().min(1, 'Material is required').max(2000, 'Material must be at most 2000 characters'),
  attendance: z.array(z.object({
    student_id: z.string().uuid('Invalid student ID'),
    status: z.enum(['present', 'sick', 'leave', 'absent']),
  })).max(200).optional(),
});

export const UpdateJournalSchema = z.object({
  material: z.string().min(1, 'Material is required').max(2000, 'Material must be at most 2000 characters'),
  attendance: z.array(z.object({
    student_id: z.string().uuid('Invalid student ID'),
    status: z.enum(['present', 'sick', 'leave', 'absent']),
  })).max(200).optional(),
});

export const StudentAttendanceSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  schedule_id: z.string().uuid('Invalid schedule ID'),
  journal_id: z.string().uuid('Invalid journal ID'),
  status: z.enum(['present', 'sick', 'leave', 'absent']),
});

const gradeTypeSlug = z.string().min(1, 'Type is required').max(50).regex(/^[a-z0-9_]+$/, 'Type must be lowercase slug');

export const GradeSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  class_id: z.string().uuid('Invalid class ID'),
  type: gradeTypeSlug,
  score: z.number().min(0, 'Score must be at least 0').max(100, 'Score must be at most 100'),
  date: z.number({ message: 'Date is required' }),
  teacher_user_id: z.string().uuid('Invalid teacher user ID').optional(),
});

export const BulkGradesSchema = z.object({
  class_id: z.string().uuid('Invalid class ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  type: gradeTypeSlug,
  entries: z.array(z.object({
    student_id: z.string().uuid('Invalid student ID'),
    score: z.number().min(0, 'Score must be at least 0').max(100, 'Score must be at most 100'),
  })).min(1, 'At least one entry is required').max(200),
});

export const AddGradeComponentSchema = z.object({
  class_id: z.string().uuid('Invalid class ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
});

export const GradeComponentsSchema = z.object({
  components: z.array(z.object({
    type: gradeTypeSlug,
    name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
    weight: z.number().min(0, 'Weight must be at least 0').max(100, 'Weight must be at most 100'),
  })).min(1, 'At least one component is required'),
}).refine(
  data => Math.abs(data.components.filter(c => c.weight > 0).reduce((sum, c) => sum + c.weight, 0) - 100) < 0.001,
  { message: 'Weights must sum to 100', path: ['components'] }
);

export const AnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  body: z.string().min(1, 'Body is required').max(5000, 'Body must be at most 5000 characters'),
});

export const UpdateAnnouncementSchema = AnnouncementSchema.partial().refine(
  data => data.title !== undefined || data.body !== undefined,
  { message: 'At least one field is required to update', path: ['_root'] }
);

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type DeleteUsersInput = z.infer<typeof DeleteUsersSchema>;
export type ChangeProfileInput = z.infer<typeof ChangeProfileSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type AcademicYearInput = z.infer<typeof AcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof UpdateAcademicYearSchema>;
export type ClassInput = z.infer<typeof ClassSchema>;
export type UpdateClassInput = z.infer<typeof UpdateClassSchema>;
export type SubjectInput = z.infer<typeof SubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
export type StudentInput = z.infer<typeof StudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type TeacherInput = z.infer<typeof TeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof UpdateTeacherSchema>;
export type ParentInput = z.infer<typeof ParentSchema>;
export type TeacherClassAssignmentsInput = z.infer<typeof TeacherClassAssignmentsSchema>;
export type UpdateParentInput = z.infer<typeof UpdateParentSchema>;
export type ScheduleInput = z.infer<typeof ScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;
export type SchoolProfileInput = z.infer<typeof SchoolProfileSchema>;
export type QrSettingsInput = z.infer<typeof QrSettingsSchema>;
export type TeacherConfirmationInput = z.infer<typeof TeacherConfirmationSchema>;
export type JournalInput = z.infer<typeof JournalSchema>;
export type UpdateJournalInput = z.infer<typeof UpdateJournalSchema>;
export type StudentAttendanceInput = z.infer<typeof StudentAttendanceSchema>;
export type GradeInput = z.infer<typeof GradeSchema>;
export type GradeComponentsInput = z.infer<typeof GradeComponentsSchema>;
export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
