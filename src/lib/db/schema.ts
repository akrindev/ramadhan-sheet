import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const students = sqliteTable(
  'students',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nis: text('nis').notNull().unique(),
    fullname: text('fullname').notNull(),
    rombel: text('rombel').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date())
  },
  (table) => ({
    nisIdx: uniqueIndex('nis_idx').on(table.nis)
  })
);

export const studentsRelations = relations(students, ({ many }) => ({
  sheets: many(sheets)
}));

export const sheets = sqliteTable(
  'sheets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    tanggal: text('tanggal').notNull(),
    sholatFardhu: text('sholat_fardhu', { mode: 'json' }).$type<string[]>().notNull(),
    statusPuasa: text('status_puasa').notNull(),
    alasanTidakPuasa: text('alasan_tidak_puasa'),
    ibadahSunnah: text('ibadah_sunnah', { mode: 'json' }).$type<string[]>().notNull(),
    tadarus: text('tadarus').notNull(),
    kebiasaan: text('kebiasaan', { mode: 'json' }).$type<string[]>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date())
  },
  (table) => ({
    studentDateIdx: uniqueIndex('student_date_idx').on(table.studentId, table.tanggal)
  })
);

export const sheetsRelations = relations(sheets, ({ one }) => ({
  student: one(students, {
    fields: [sheets.studentId],
    references: [students.id]
  })
}));

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Sheet = typeof sheets.$inferSelect;
export type NewSheet = typeof sheets.$inferInsert;
