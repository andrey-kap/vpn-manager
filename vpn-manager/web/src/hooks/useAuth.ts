import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { LoginRequest, AuthTokensResponse } from '@shared/api-contracts';
import type { ApiResponse } from '@shared/types';

// Комментарий: В prod заменить sessionStorage на httpOnly cookies для безопасности
// sessionStorage уязвим для XSS-атак, httpOnly cookies защищены от доступа через JS

interface UseAuthReturn {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('accessToken');
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<ApiResponse<AuthTokensResponse>>(
        '/auth/login',
        { username, password } as LoginRequest
      );

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken } = response.data.data;
        
        // Сохранение токенов в sessionStorage
        // В prod заменить на httpOnly cookies
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        
        setIsAuthenticated(true);
        navigate('/', { replace: true });
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    // Очистка сессии
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  return {
    isAuthenticated,
    login,
    logout,
    isLoading,
    error,
  };
}

/**
 * Хук для проверки валидности токена
 * Опционально можно вызывать /api/auth/verify для серверной валидации
 */
export function useAuthCheck(): { isValid: boolean; isLoading: boolean } {
  const [isValid, setIsValid] = useState<boolean>(() => {
    return !!sessionStorage.getItem('accessToken');
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setIsValid(false);
      return;
    }

    setIsLoading(true);
    try {
      // Опциональная проверка токена через API
      // Раскомментировать для prod-режима
      // await apiClient.get('/auth/verify');
      setIsValid(true);
    } catch {
      setIsValid(false);
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isValid, isLoading };
}
