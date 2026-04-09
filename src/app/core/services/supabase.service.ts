import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {

  private supabase!: SupabaseClient;

  constructor() {
    console.log('%c<<< Start SupabaseService >>>', 'background: #fff3cd; color: #664d03; padding: 2px 5px;');

    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key,
      {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // ✅ Bypass del navigator.locks — fix para Zone.js + Supabase v2
          lock: (name, acquireTimeout, fn) => fn(),
        }
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

	/**
	 * Expone el anon key público de Supabase.
	 * Necesario para invocar Edge Functions desde contextos no autenticados.
	 */
	get anonKey(): string {
		return environment.supabase.key;
	}
}