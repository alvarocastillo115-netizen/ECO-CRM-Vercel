import { createClient } from '@supabase/supabase-js';
const url = "https://sdvyzgrmzqhxowgvpoml.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdnl6Z3JtenFoeG93Z3Zwb21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTYyODQsImV4cCI6MjA5MTA5MjI4NH0.SATagqSupxBLT0VL2KvaBdrFDvYLaBJ-GmzRIEJATMI";


const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('crm_tasks').select('status');
  console.log('Error:', error);
  console.log('Statuses in DB:', data.map(t => t.status).reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {}));
}

run();
