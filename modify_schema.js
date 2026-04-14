import fs from 'fs';
let sql = fs.readFileSync('combined.sql', 'utf8');

// Fix missing semicolons, using regex for line endings
sql = sql.replace(/  \)\r?\nCREATE OR REPLACE/g, "  );\nCREATE OR REPLACE");
sql = sql.replace(/FOR EACH ROW EXECUTE FUNCTION public\.auto_assign_first_admin\(\)\r?\nALTER/g, "FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_admin();\nALTER");
sql = sql.replace(/END;\r?\n\$\$\r?\n-- Function/g, "END;\n$$;\n-- Function");


// Inject new structure in crm_tasks
sql = sql.replace(/status TEXT NOT NULL DEFAULT 'To-Do',/g, "status TEXT NOT NULL DEFAULT 'Primer contacto',");
sql = sql.replace(/scheduled_date DATE,/g, "inspection_date DATE,\n  service_date DATE,");
sql = sql.replace(/keep_an_eye_date DATE,/g, "");
sql = sql.replace(/keep_an_eye_period_months INTEGER,/g, "");

fs.writeFileSync('new_schema.sql', sql);
