-- Students table: stores identity data from external API (avoid duplication)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nis TEXT UNIQUE NOT NULL,
  fullname TEXT NOT NULL,
  rombel TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS nis_idx ON students(nis);

-- Sheets table: stores daily reports with foreign key to students
CREATE TABLE IF NOT EXISTS sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  tanggal TEXT NOT NULL,
  sholat_fardhu TEXT NOT NULL, -- JSON array
  status_puasa TEXT NOT NULL, -- PENUH, SETENGAH HARI, TIDAK PUASA
  alasan_tidak_puasa TEXT,
  ibadah_sunnah TEXT NOT NULL, -- JSON array
  tadarus TEXT NOT NULL,
  kebiasaan TEXT NOT NULL, -- JSON array
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(student_id, tanggal)
);

CREATE UNIQUE INDEX IF NOT EXISTS student_date_idx ON sheets(student_id, tanggal);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_students_timestamp 
AFTER UPDATE ON students
BEGIN
  UPDATE students SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sheets_timestamp 
AFTER UPDATE ON sheets
BEGIN
  UPDATE sheets SET updated_at = unixepoch() WHERE id = NEW.id;
END;
