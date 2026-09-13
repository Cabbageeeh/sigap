export const up = `
ALTER TABLE school_locations ADD COLUMN start_time TEXT;
`;

export const down = `
ALTER TABLE school_locations DROP COLUMN start_time;
`;
