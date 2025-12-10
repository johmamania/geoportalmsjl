import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    const url = environment.supabase?.url || '';
    const anonKey = environment.supabase?.anonKey || '';
    
    if (!url || !anonKey) {
      console.error('⚠️ Supabase configuration missing. Please check environment variables.');
    }
    
    this.supabase = createClient(url, anonKey);
  }
}

