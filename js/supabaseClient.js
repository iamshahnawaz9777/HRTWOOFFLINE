import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Initializes the Supabase JS client using credentials stored in localStorage 
 * (which are set via the Settings UI).
 * 
 * Note: Since this is a vanilla JS project without a bundler like Vite, 
 * we import from a CDN (esm.sh). If you migrate to a bundler later, 
 * you can switch to: import { createClient } from '@supabase/supabase-js';
 */
export function getSupabaseClient() {
  const rawConfig = localStorage.getItem('aeroglass_supabase_config');
  let url = '';
  let key = '';

  if (rawConfig) {
    try {
      const config = JSON.parse(rawConfig);
      url = config.url;
      key = config.key;
    } catch (e) {
      console.error('Failed to parse Supabase config from storage:', e);
    }
  }

  // Fallback to default or empty if not set
  url = url || 'https://oajpasqndvwahswgorzg.supabase.co';
  key = key || 'sb_publishable_bOHbvYedy_frmMTcOYit2Q_jej1_hGv';

  return createClient(url, key);
}

export const supabase = getSupabaseClient();
