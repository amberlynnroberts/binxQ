import { useCallback, useEffect, useState } from 'react';
import { fetchKennelCheckData } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';

const emptyData = { animals: [], meds: [], notes: [], checks: [] };

export function useKennelData() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState(isSupabaseConfigured ? 'Connecting...' : 'Supabase not configured');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const fresh = await fetchKennelCheckData();
      setData(fresh);
      setDbStatus(fresh.dbStatus || 'Supabase connected');
      return fresh;
    } catch (err) {
      console.error(err);
      setError(err.message);
      setDbStatus('Supabase error: ' + err.message);
      return emptyData;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, dbStatus, error, reload };
}
