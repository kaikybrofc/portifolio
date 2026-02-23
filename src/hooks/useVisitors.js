import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useVisitors(pageName = 'home') {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    const trackVisitor = async () => {
      try {
        await supabase
          .from('visitors')
          .insert([{
            page_visited: pageName,
            // For IP, we'd normally need an edge function, but we'll leave it null or use a placeholder
            ip_address: 'unknown'
          }]);
      } catch (err) {
        console.error('Failed to track visitor', err);
      }
    };

    trackVisitor();
    tracked.current = true;
  }, [pageName]);
}
