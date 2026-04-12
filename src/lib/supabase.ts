import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://api.solosafe.it';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzQzNDU2MDAwLCJleHAiOjQ4OTkxMjk2MDB9.PvehGNB17mxe-t8iiDc4qQbxYD5ZvnQ1HZMWM_IKGOc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || 'AIzaSyDK8_ZQZ7zlpEnbnCwTNis7_NXnjUITNOc';
