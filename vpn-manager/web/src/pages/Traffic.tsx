import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Clock, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import apiClient from '../api/client';
import type { UserResponse, TrafficRecordResponse } from '@shared/api-contracts';
import type { ApiResponse } from '@shared/types';

type Period = '1h' | '24h' | '7d';

interface TrafficDataPoint {
  timestamp: string;
  bytes_in: number;
  bytes_out: number;
  total: number;
}

/**
 * Format bytes to human-readable format with auto-scaling (KB/MB/GB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get period in hours for API request
 */
function getPeriodHours(period: Period): number {
  switch (period) {
    case '1h':
      return 1;
    case '24h':
      return 24;
    case '7d':
      return 168;
  }
}

/**
 * Traffic statistics page with charts and history table
 */
export default function Traffic() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [period, setPeriod] = useState<Period>('24h');

  // Fetch users list for dropdown
  const { data: usersData } = useQuery<ApiResponse<UserResponse[]>>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<UserResponse[]>>('/users');
      return response.data;
    },
    retry: 2,
  });

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - getPeriodHours(period) * 60 * 60 * 1000);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [period]);

  // Fetch traffic stats with polling (60s interval)
  const { data: trafficData, isLoading } = useQuery<ApiResponse<{ records: TrafficRecordResponse[] }>>({
    queryKey: ['traffic', selectedUserId, period],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        limit: '1000',
      });
      if (selectedUserId) {
        params.set('userId', selectedUserId);
      }
      const response = await apiClient.get<ApiResponse<{ records: TrafficRecordResponse[] }>>(
        `/traffic/stats?${params}`
      );
      return response.data;
    },
    refetchInterval: 60000,
    retry: 3,
    enabled: !!selectedUserId,
  });

  // Transform traffic records into chart data
  const chartData: TrafficDataPoint[] = useMemo(() => {
    if (!trafficData?.data?.records) return [];

    return trafficData.data.records.map((record) => ({
      timestamp: new Date(record.timestamp).toLocaleTimeString(),
      bytes_in: record.bytes_in,
      bytes_out: record.bytes_out,
      total: record.bytes_in + record.bytes_out,
    }));
  }, [trafficData]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!trafficData?.data?.records) {
      return { bytesIn: 0, bytesOut: 0, total: 0 };
    }
    const bytesIn = trafficData.data.records.reduce((sum, r) => sum + r.bytes_in, 0);
    const bytesOut = trafficData.data.records.reduce((sum, r) => sum + r.bytes_out, 0);
    return { bytesIn, bytesOut, total: bytesIn + bytesOut };
  }, [trafficData]);

  const users = usersData?.data || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Traffic Statistics
        </h1>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* User Dropdown */}
        <div className="flex-1">
          <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select User
          </label>
          <select
            id="user-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            <option value="">Select a user...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>

        {/* Period Buttons */}
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period
          </span>
          <div className="flex gap-2">
            {(['1h', '24h', '7d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[44px] ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                }`}
                aria-pressed={period === p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
            <ArrowDownRight className="w-5 h-5" />
            <span className="text-sm font-medium">Downloaded</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatBytes(totals.bytesIn)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <ArrowUpRight className="w-5 h-5" />
            <span className="text-sm font-medium">Uploaded</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatBytes(totals.bytesOut)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatBytes(totals.total)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <section aria-labelledby="chart-heading" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h2 id="chart-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Traffic Over Time
        </h2>

        {!selectedUserId ? (
          <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Select a user to view traffic data</p>
          </div>
        ) : isLoading ? (
          <div className="h-64 sm:h-80 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
        ) : chartData.length === 0 ? (
          <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No traffic data available for this period</p>
          </div>
        ) : (
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  tickFormatter={formatBytes}
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(31 41 55)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  labelStyle={{ color: 'rgb(156 163 175)' }}
                  formatter={(value) => [formatBytes(Number(value)), '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bytes_in"
                  name="Download"
                  stroke="rgb(34 197 94)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="bytes_out"
                  name="Upload"
                  stroke="rgb(59 130 246)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* History Table */}
      <section aria-labelledby="history-heading" className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <h2 id="history-heading" className="text-lg font-semibold text-gray-900 dark:text-white p-4 sm:p-6 pb-0">
          Traffic History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full" role="grid">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Download
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Upload
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-gray-500 dark:text-gray-400">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : !selectedUserId ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Select a user to view history
                  </td>
                </tr>
              ) : chartData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No history available for this period
                  </td>
                </tr>
              ) : (
                chartData.slice().reverse().map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {row.timestamp}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      {formatBytes(row.bytes_in)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                      {formatBytes(row.bytes_out)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(row.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
