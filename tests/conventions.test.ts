/**
 * Convention tests — verify structural conventions that lint:layers doesn't cover.
 *
 * lint:layers.ts covers: handler naming, import direction, no classes, layer boundaries.
 * These tests cover: AGENTS.md presence, skills index, CODEMAP freshness.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('convention: AGENTS.md presence', () => {
  const expectedDirs = [
    '',                    // root
    'app/core',
    'app/handlers',
    'app/middlewares',
    'app/queries',
    'app/services',
    'migrations',
    'resources',
    'resources/Components',
    'resources/Pages',
    'resources/types',
    'tests',
  ];

  it('every documented directory has an AGENTS.md', () => {
    for (const dir of expectedDirs) {
      const agentsPath = path.join(ROOT, dir, 'AGENTS.md');
      expect(fs.existsSync(agentsPath), `${dir || 'root'}/AGENTS.md should exist`).toBe(true);
    }
  });
});

describe('convention: skills index', () => {
  const skills = [
    'crud-pattern.md',
    'sqlite-usage.md',
    'auth-rbac.md',
    'inertia-patterns.md',
    'api-contract.md',
    'dependency-policy.md',
    'common-pitfalls.md',
    'pentest-pattern.md',
    'testing-pattern.md',
  ];

  it('all skill files exist', () => {
    for (const skill of skills) {
      const skillPath = path.join(ROOT, '.agents', 'skills', skill);
      expect(fs.existsSync(skillPath), `.agents/skills/${skill} should exist`).toBe(true);
    }
  });
});

describe('convention: CODEMAP.md freshness', () => {
  it('CODEMAP.md exists and has stats', () => {
    const content = readFile('CODEMAP.md');
    expect(content).toMatch(/# CODEMAP\.md/);
    expect(content).toMatch(/Files indexed: \d+/);
    expect(content).toMatch(/Total exports: \d+/);
  });
});

describe('convention: SQLite.update tables have updated_at', () => {
  function tableColumns(): Map<string, Set<string>> {
    const columns = new Map<string, Set<string>>();
    const ensure = (table: string): Set<string> => {
      if (!columns.has(table)) columns.set(table, new Set());
      return columns.get(table)!;
    };
    const dir = path.join(ROOT, 'migrations');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.ts'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const up = content.split('export const down')[0];
      const createPattern = /CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)\s*\(([\s\S]*?)\);/g;
      let match: RegExpExecArray | null;
      while ((match = createPattern.exec(up)) !== null) {
        for (const line of match[2].split('\n')) {
          const col = line.trim().match(/^([a-z_][a-z0-9_]*)\s+(?:TEXT|INTEGER|REAL|BLOB|NUMERIC)/i);
          if (col) ensure(match[1].toLowerCase()).add(col[1].toLowerCase());
        }
      }
      const alterPattern = /ALTER TABLE ([a-z_]+) ADD COLUMN ([a-z_][a-z0-9_]*)/gi;
      while ((match = alterPattern.exec(up)) !== null) {
        ensure(match[1].toLowerCase()).add(match[2].toLowerCase());
      }
      const dropPattern = /ALTER TABLE ([a-z_]+) DROP COLUMN ([a-z_][a-z0-9_]*)/gi;
      while ((match = dropPattern.exec(up)) !== null) {
        columns.get(match[1].toLowerCase())?.delete(match[2].toLowerCase());
      }
    }
    return columns;
  }

  it('every table updated via SQLite.update has an updated_at column', () => {
    const updatePattern = /SQLite\.update\('([a-z_]+)'/g;
    const tables = new Set<string>();
    const dir = path.join(ROOT, 'app/queries');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.ts'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = updatePattern.exec(content)) !== null) tables.add(match[1]);
    }
    expect(tables.size).toBeGreaterThan(0);
    const columns = tableColumns();
    for (const table of tables) {
      expect(columns.get(table)?.has('updated_at') ?? false, `${table} is updated via SQLite.update but has no updated_at column — add a migration`).toBe(true);
    }
  });
});
