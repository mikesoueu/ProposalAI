const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://qxnifzehbcyidgvludbl.supabase.co", "sb_publishable_o0Og94OOTWY0wKqKDpInJw_kDii0Y0Y");

async function checkRLS() {
  const { data, error } = await supabase.from('subscriptions').select('*').limit(10);
  console.log("Anon select:", data, error);
}
checkRLS();
