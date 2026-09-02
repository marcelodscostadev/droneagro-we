const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xrppalgvjkmmwfhqztcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHBhbGd2amttbXdmaHF6dGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTE0NDAsImV4cCI6MjEwMjM4NzQ0MH0.Irdse1u61DcP9BsOgCUcptjNiJK35jL4FMy8H8kBuIM'
);

async function run() {
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'marcelodscostadev@gmail.com',
    password: '131517',
  });
  
  if (authError) return console.error("Admin login error:", authError);
  console.log("Logged in as Admin");

  const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%ana%');
  console.log("Clients matching Ana:", clients);
  
  if (!clients || clients.length === 0) return;
  const clientId = clients.find(c => c.name.toLowerCase().includes('carla'))?.id || clients[0].id;

  const { data, error } = await supabase
    .from('measurement_bulletins')
    .select('id, invoice_number, status, transactions(id, status, type)')
    .eq('client_id', clientId)
    .eq('status', 'invoiced');
    
  if (error) return console.error(error);
  
  console.log("Admin sees these transactions for the client's bulletins:");
  console.log(JSON.stringify(data, null, 2));
}

run();
