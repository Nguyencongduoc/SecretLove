import 'server-only';
import { serviceClient } from '@/lib/supabase/service';
import { databaseError } from './errors';
export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await serviceClient().rpc(name, args);
  if (error) databaseError(error.message);
  return data as T;
}
