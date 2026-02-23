import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useContacts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addContact = async ({ name, email, message }) => {
    setLoading(true);
    setError(null);
    try {
      if (!name || !email || !message) {
        throw new Error('Todos os campos são obrigatórios.');
      }

      const { data, error: sbError } = await supabase
        .from('contacts')
        .insert([{ name, email, message }])
        .select();

      if (sbError) throw sbError;
      return { success: true, data };
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { addContact, loading, error };
}
