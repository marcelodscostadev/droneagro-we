const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xrppalgvjkmmwfhqztcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHBhbGd2amttbXdmaHF6dGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTE0NDAsImV4cCI6MjEwMjM4NzQ0MH0.Irdse1u61DcP9BsOgCUcptjNiJK35jL4FMy8H8kBuIM'
);

async function run() {
  const { data, error } = await supabase
    .from('measurement_bulletins')
    .select('id, invoice_number, status, transactions(status, type)')
    .eq('status', 'invoiced');
    
  if (error) return console.error(error);
  
  data.forEach(d => {
    if (d.transactions && d.transactions.length > 0) {
      console.log(`NF: ${d.invoice_number}, Transactions:`, JSON.stringify(d.transactions));
    }
  });
}
run();
