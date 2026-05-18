import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Plus,
  Download,
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Key,
} from 'lucide-react';
import apiClient from '../api/client';
import { CreateUserRequestSchema, UserResponseSchema } from '@shared/api-contracts';
import type { ApiResponse } from '@shared/types';
import toast from 'react-hot-toast';
import { downloadBlob } from '../utils/download';

type UserResponse = z.infer<typeof UserResponseSchema>;

// Extended schema for user creation with optional secret generation
const CreateUserDataSchema = CreateUserRequestSchema.extend({
  shared_secret: CreateUserRequestSchema.shape.shared_secret.optional(),
});

type CreateUserData = z.infer<typeof CreateUserDataSchema>;

/**
 * Generate a random secure secret
 */
function generateSecret(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Users management page with table, search, sorting, and CRUD operations
 */
export default function Users() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'username' | 'is_active' | 'created_at'>('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [unmaskedSecrets, setUnmaskedSecrets] = useState<Set<string>>(new Set());

  // Fetch users list
  const { data: usersData, isLoading } = useQuery<ApiResponse<UserResponse[]>>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<UserResponse[]>>('/users');
      return response.data;
    },
    retry: 3,
  });

  // Toggle user active status mutation with optimistic update
  const toggleMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch<ApiResponse<void>>(`/users/${userId}/toggle`),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData<ApiResponse<UserResponse[]>>(['users']);

      if (previousUsers?.data) {
        queryClient.setQueryData(['users'], {
          ...previousUsers,
          data: previousUsers.data.map((user) =>
            user.id === userId ? { ...user, is_active: !user.is_active } : user
          ),
        });
      }

      return { previousUsers };
    },
    onError: (err, userId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
      toast.error('Failed to update user status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) =>
      apiClient.post<ApiResponse<UserResponse>>('/users', {
        username: data.username,
        shared_secret: data.shared_secret || generateSecret(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to create user';
      toast.error(message);
    },
  });

  // Download mobileconfig
  const downloadConfigMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.get(`/users/${userId}/mobileconfig`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    },
    onSuccess: (blob, userId) => {
      const user = usersData?.data?.find((u) => u.id === userId);
      const filename = `${user?.username || 'user'}.mobileconfig`;
      downloadBlob(blob, filename);
      toast.success('Configuration downloaded');
    },
    onError: () => {
      toast.error('Failed to download configuration');
    },
  });

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let users = usersData?.data || [];

    if (searchTerm) {
      users = users.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    users.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'username') {
        comparison = a.username.localeCompare(b.username);
      } else if (sortField === 'is_active') {
        comparison = Number(a.is_active) - Number(b.is_active);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return users;
  }, [usersData, searchTerm, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSecretVisibility = (userId: string) => {
    setUnmaskedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserData>({
    resolver: zodResolver(CreateUserDataSchema),
    defaultValues: {
      username: '',
      shared_secret: '',
    },
  });

  const onSubmit = (data: CreateUserData) => {
    createMutation.mutate(data);
  };

  const handleGenerateSecret = () => {
    setValue('shared_secret', generateSecret(), { shouldValidate: true });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          aria-label="Search users"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('username')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none focus:underline"
                >
                  Username
                  {sortField === 'username' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Shared Secret
                </span>
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('is_active')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none focus:underline"
                >
                  Status
                  {sortField === 'is_active' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No users found matching your search' : 'No users yet'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                        {unmaskedSecrets.has(user.id)
                          ? user.shared_secret
                          : '•'.repeat(Math.min(user.shared_secret.length, 12))}
                      </span>
                      <button
                        onClick={() => toggleSecretVisibility(user.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label={unmaskedSecrets.has(user.id) ? 'Hide secret' : 'Show secret'}
                      >
                        {unmaskedSecrets.has(user.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleMutation.mutate(user.id)}
                      disabled={toggleMutation.isPending}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 min-h-[44px] ${
                        user.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 focus:ring-green-500'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 focus:ring-red-500'
                      }`}
                      aria-label={user.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      {toggleMutation.isPending ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : user.is_active ? (
                        <>
                          <Check className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => downloadConfigMutation.mutate(user.id)}
                      disabled={downloadConfigMutation.isPending}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[44px]"
                      aria-label={`Download config for ${user.username}`}
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Config</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New User
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  {...register('username')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="shared_secret"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Shared Secret
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="shared_secret"
                      type="text"
                      {...register('shared_secret')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      placeholder="Enter or generate secret"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSecret}
                    className="inline-flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition min-h-[44px]"
                    aria-label="Generate random secret"
                  >
                    <Key className="w-5 h-5" />
                  </button>
                </div>
                {errors.shared_secret && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.shared_secret.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[44px]"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
