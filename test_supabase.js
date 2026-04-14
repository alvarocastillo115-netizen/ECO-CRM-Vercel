import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if(!url || !key) {
  console.log('No enironment variables found');
  process.exit();
}

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
