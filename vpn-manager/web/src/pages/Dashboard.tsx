import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RotateCcw, Copy, Check, Terminal, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import type { DockerStatusResponse, DockerStartRequest, DockerStopRequest, DockerRestartRequest } from '@shared/api-contracts';
import type { ApiResponse } from '@shared/types';

interface LogEntry {
  timestamp: string;
  message: string;
}

/**
 * Dashboard page with Docker status, controls, and logs panel
 */
export default function Dashboard() {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'start' | 'stop' | 'restart' | null>(null);

  // Fetch Docker status with polling (15s interval)
  const { data: statusData, isLoading: statusLoading } = useQuery<ApiResponse<DockerStatusResponse>>({
    queryKey: ['docker', 'status'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<DockerStatusResponse>>('/docker/status');
      return response.data;
    },
    refetchInterval: 15000,
    retry: 3,
  });

  // Disable polling when document is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        queryClient.setQueryData(['docker', 'status'], (old: any) => old);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);

  // Fetch logs
  const { data: logsData, isLoading: logsLoading } = useQuery<ApiResponse<{ logs: string[] }>>({
    queryKey: ['docker', 'logs'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ logs: string[] }>>('/docker/logs');
      return response.data;
    },
    refetchInterval: 10000,
    retry: 2,
  });

  useEffect(() => {
    if (logsData?.data?.logs) {
      setLogs(logsData.data.logs.map((log, i) => ({ timestamp: new Date().toISOString(), message: log })));
    }
  }, [logsData]);

  // Docker action mutations
  const startMutation = useMutation({
    mutationFn: () => apiClient.post<ApiResponse<void>>('/docker/start', {} as DockerStartRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker', 'status'] });
      setConfirmAction(null);
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiClient.post<ApiResponse<void>>('/docker/stop', {} as DockerStopRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker', 'status'] });
      setConfirmAction(null);
    },
  });

  const restartMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ApiResponse<void>>('/docker/restart', { timeout: 30 } as DockerRestartRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker', 'status'] });
      setConfirmAction(null);
    },
  });

  const handleCopyLogs = async () => {
    const logText = logs.map((l) => l.message).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy logs');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
      case 'exited':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'restarting':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const currentStatus = statusData?.data;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Status Card */}
      <section aria-labelledby="status-heading" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 id="status-heading" className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Docker Container Status
        </h1>

        {statusLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : currentStatus ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${getStatusColor(currentStatus.status)} animate-pulse`}
                aria-hidden="true"
              />
              <span className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                {currentStatus.status}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Container ID</dt>
                <dd className="font-mono text-sm text-gray-900 dark:text-white truncate">
                  {currentStatus.containerId}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Image</dt>
                <dd className="font-mono text-sm text-gray-900 dark:text-white truncate">
                  {currentStatus.image}
                </dd>
              </div>
              {currentStatus.uptime !== null && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Uptime</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {Math.floor(currentStatus.uptime! / 3600)}h{' '}
                    {Math.floor((currentStatus.uptime! % 3600) / 60)}m
                  </dd>
                </div>
              )}
            </dl>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => setConfirmAction('start')}
                disabled={startMutation.isPending || currentStatus.status === 'running'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition min-h-[44px]"
                aria-label="Start container"
              >
                <Play className="w-5 h-5" />
                <span>{startMutation.isPending ? 'Starting...' : 'Start'}</span>
              </button>

              <button
                onClick={() => setConfirmAction('stop')}
                disabled={stopMutation.isPending || currentStatus.status === 'stopped'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition min-h-[44px]"
                aria-label="Stop container"
              >
                <Square className="w-5 h-5" />
                <span>{stopMutation.isPending ? 'Stopping...' : 'Stop'}</span>
              </button>

              <button
                onClick={() => setConfirmAction('restart')}
                disabled={restartMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition min-h-[44px]"
                aria-label="Restart container"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{restartMutation.isPending ? 'Restarting...' : 'Restart'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load status</span>
          </div>
        )}
      </section>

      {/* Logs Panel */}
      <section aria-labelledby="logs-heading" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="logs-heading" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Container Logs
          </h2>
          <button
            onClick={handleCopyLogs}
            disabled={logsLoading || logs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition min-h-[44px]"
            aria-label="Copy logs to clipboard"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div
          className="bg-gray-900 text-gray-100 rounded-lg p-4 h-64 sm:h-80 overflow-y-auto font-mono text-xs sm:text-sm"
          role="log"
          aria-live="polite"
        >
          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-400">No logs available</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {log.message}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm {confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to {confirmAction} the Docker container?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'start') startMutation.mutate();
                  else if (confirmAction === 'stop') stopMutation.mutate();
                  else if (confirmAction === 'restart') restartMutation.mutate();
                }}
                className={`flex-1 px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 transition min-h-[44px] ${
                  confirmAction === 'start'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : confirmAction === 'stop'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
