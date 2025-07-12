import { useState, useEffect, useCallback } from 'react';
import { AxiosResponse, AxiosError } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  options: UseApiOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const response = await apiFunction(...args);
        const data = response.data;
        
        setState({
          data,
          loading: false,
          error: null,
        });
        
        if (onSuccess) {
          onSuccess(data);
        }
        
        return data;
      } catch (error) {
        const errorMessage = (error as AxiosError<any>)?.response?.data?.message || 
                           (error as Error).message || 
                           'An unexpected error occurred';
        
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        
        if (onError) {
          onError(errorMessage);
        }
        
        throw error;
      }
    },
    [apiFunction, onSuccess, onError]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hooks for common patterns
export function useFetch<T = any>(
  apiFunction: () => Promise<AxiosResponse<T>>,
  dependencies: any[] = []
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiFunction();
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = (error as AxiosError<any>)?.response?.data?.message || 
                         (error as Error).message || 
                         'Failed to fetch data';
      
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useMutation<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  options: UseApiOptions = {}
) {
  return useApi(apiFunction, { ...options, immediate: false });
}