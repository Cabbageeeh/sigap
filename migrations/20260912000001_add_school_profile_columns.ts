export const up = `
ALTER TABLE school_locations ADD COLUMN npsn TEXT;
ALTER TABLE school_locations ADD COLUMN headmaster_name TEXT;
ALTER TABLE school_locations ADD COLUMN phone TEXT;
ALTER TABLE school_locations ADD COLUMN email TEXT;
`;

export const down = `
ALTER TABLE school_locations DROP COLUMN email;
ALTER TABLE school_locations DROP COLUMN phone;
ALTER TABLE school_locations DROP COLUMN headmaster_name;
ALTER TABLE school_locations DROP COLUMN npsn;
`;
