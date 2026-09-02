const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xrppalgvjkmmwfhqztcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHBhbGd2amttbXdmaHF6dGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTE0NDAsImV4cCI6MjEwMjM4NzQ0MH0.Irdse1u61DcP9BsOgCUcptjNiJK35jL4FMy8H8kBuIM'
);
async function run() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, status, type, bulletin_id, amount')
    .ilike('description', '%NF 40%');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
