import type SQLiteType from '../app/services/SQLite';
import { randomUUID } from 'crypto';
import { hashPassword } from '../app/services/Authenticate';

export function run(SQLite: typeof SQLiteType): void {
  const existing = SQLite.one<{ id: string }>`SELECT id FROM academic_years WHERE name = ${'2025/2026'}`;
  if (existing) return;

  const now = Date.now();

  const yearId = randomUUID();
  const startOfYear = new Date('2025-07-01T00:00:00.000Z').getTime();
  const endOfYear = new Date('2026-06-30T23:59:59.999Z').getTime();
  SQLite.exec`
    INSERT INTO academic_years (id, name, start_at, end_at, is_active, created_at)
    VALUES (${yearId}, ${'2025/2026'}, ${startOfYear}, ${endOfYear}, ${1}, ${now})
  `;

  const classIds = [randomUUID(), randomUUID()];
  SQLite.exec`
    INSERT INTO classes (id, name, grade, academic_year_id, created_at)
    VALUES (${classIds[0]}, ${'10A'}, ${10}, ${yearId}, ${now}),
           (${classIds[1]}, ${'10B'}, ${10}, ${yearId}, ${now})
  `;

  const subjectIds = [randomUUID(), randomUUID(), randomUUID()];
  SQLite.exec`
    INSERT INTO subjects (id, name, code, created_at)
    VALUES (${subjectIds[0]}, ${'Mathematics'}, ${'MAT'}, ${now}),
           (${subjectIds[1]}, ${'Biology'}, ${'BIO'}, ${now}),
           (${subjectIds[2]}, ${'English'}, ${'ENG'}, ${now})
  `;

  const locationId = randomUUID();
  SQLite.exec`
    INSERT INTO school_locations (id, name, npsn, headmaster_name, phone, email, address, latitude, longitude, radius_meters, start_time, is_active, created_at)
    VALUES (${locationId}, ${'SMA Negeria 1 Jakarta'}, ${'20100001'}, ${'Drs. H. Ahmad Hidayat'}, ${'(021) 3846259'}, ${'info@sman1jakarta.sch.id'}, ${'Jl. Budi Utomo No. 7, Jakarta Pusat'}, ${-6.2}, ${106.8}, ${200}, ${'07:00'}, ${1}, ${now})
  `;

  const teacherRole = SQLite.one<{ id: string }>`SELECT id FROM roles WHERE slug = ${'teacher'}`;
  const parentRole = SQLite.one<{ id: string }>`SELECT id FROM roles WHERE slug = ${'parent'}`;

  const teacherUsers = [
    { id: randomUUID(), name: 'Budi Santoso', username: 'budi', password: hashPassword('teacher123') },
    { id: randomUUID(), name: 'Siti Rahayu', username: 'siti', password: hashPassword('teacher123') },
  ];

  const parentUser = { id: randomUUID(), name: 'Andi Wijaya', username: '10001', password: hashPassword('parent123') };

  for (const user of teacherUsers) {
    SQLite.exec`
      INSERT INTO users (id, name, username, password, phone, is_active, created_at, updated_at)
      VALUES (${user.id}, ${user.name}, ${user.username}, ${user.password}, ${'08123456789'}, ${1}, ${now}, ${now})
    `;
    if (teacherRole) {
      SQLite.exec`
        INSERT INTO user_roles (id, user_id, role_id, created_at)
        VALUES (${randomUUID()}, ${user.id}, ${teacherRole.id}, ${now})
      `;
    }
    SQLite.exec`
      INSERT INTO teachers (id, user_id, employee_id, phone, created_at)
      VALUES (${randomUUID()}, ${user.id}, ${'T' + user.name.replace(/\s/g, '').toUpperCase().slice(0, 6)}, ${'08123456789'}, ${now})
    `;
  }

  SQLite.exec`
    INSERT INTO users (id, name, username, password, phone, is_active, created_at, updated_at)
    VALUES (${parentUser.id}, ${parentUser.name}, ${parentUser.username}, ${parentUser.password}, ${'08123456790'}, ${1}, ${now}, ${now})
  `;
  if (parentRole) {
    SQLite.exec`
      INSERT INTO user_roles (id, user_id, role_id, created_at)
      VALUES (${randomUUID()}, ${parentUser.id}, ${parentRole.id}, ${now})
    `;
  }
  SQLite.exec`
    INSERT INTO parents (id, user_id, phone, address, created_at)
    VALUES (${randomUUID()}, ${parentUser.id}, ${'08123456790'}, ${'Jl. Melati No. 5'}, ${now})
  `;

  const studentNames = ['Ahmad Fauzi', 'Dewi Lestari', 'Rina Kusuma', 'Bayu Pratama', 'Citra Anggraini', 'Eka Putri', 'Fajar Nugroho', 'Gita Maharani', 'Hadi Susanto', 'Indah Permata'];
  for (let i = 0; i < studentNames.length; i++) {
    SQLite.exec`
      INSERT INTO students (id, nis, name, class_id, parent_user_id, phone, address, created_at)
      VALUES (${randomUUID()}, ${'1000' + (i + 1)}, ${studentNames[i]}, ${classIds[i % 2]}, ${parentUser.id}, ${'0812345600' + i}, ${'Jl. Mawar No. ' + (i + 1)}, ${now})
    `;
  }
}
