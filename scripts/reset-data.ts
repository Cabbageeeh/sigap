import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import SQLite from '@services/SQLite';
import Migrator from '@services/Migrator';
import Seeder from '@services/Seeder';

async function resetSchoolData(): Promise<void> {
  if (!process.argv.includes('--confirm')) {
    throw new Error('Gunakan npm run data:reset -- --confirm untuk menghapus semua data dan membuat ulang akun admin.');
  }
  const database = SQLite.raw();
  if (database.name === ':memory:') throw new Error('Reset memerlukan database berbasis berkas.');
  const backupDirectory = join(dirname(database.name), 'backups');
  mkdirSync(backupDirectory, { recursive: true });
  const backupPath = join(backupDirectory, `before-reset-${Date.now()}.sqlite3`);
  await database.backup(backupPath);
  console.log(`Cadangan database: ${backupPath}`);
  Migrator.migrateFresh();
  Seeder.seed();
  console.log('Data sekolah dikosongkan. Akun tersedia: admin / admin123. Segera ubah kata sandi setelah masuk.');
}

void resetSchoolData().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Pengosongan data gagal.');
  process.exitCode = 1;
});
