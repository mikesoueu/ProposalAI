const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://qxnifzehbcyidgvludbl.supabase.co", "sb_publishable_o0Og94OOTWY0wKqKDpInJw_kDii0Y0Y");

async function givePlan() {
  const { data, error } = await supabase.from('subscriptions').insert({
    email: 'mikemovell2.0@gmail.com',
    plan: 'agency',
    status: 'active',
    billing: 'monthly',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  console.log("Result:", data, error);
}
givePlan();
