import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function uploadPaymentProof(file, reservationId = 'temp') {
  if (!supabase || !file) {
    return {
      path: file ? `mock/${reservationId}-${file.name}` : '',
      publicUrl: file ? URL.createObjectURL(file) : '',
    };
  }

  const ext = file.name.split('.').pop();
  const safeName = `${reservationId}-${Date.now()}.${ext}`;
  const filePath = `payment-proofs/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: data?.publicUrl || '',
  };
}
