'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  status: 'active' | 'inactive';
  joinedAt: string;
}

const initialUsers: User[] = [
  { id: '1', username: 'trader_pro', email: 'trader@example.com', balance: 5234.50, status: 'active', joinedAt: '2024-01-15' },
  { id: '2', username: 'crypto_king', email: 'crypto@example.com', balance: 12450.75, status: 'active', joinedAt: '2024-02-10' },
  { id: '3', username: 'bull_market', email: 'bull@example.com', balance: 3890.00, status: 'active', joinedAt: '2024-02-20' },
  { id: '4', username: 'swing_trader', email: 'swing@example.com', balance: 7654.25, status: 'inactive', joinedAt: '2024-01-25' },
  { id: '5', username: 'day_trader', email: 'day@example.com', balance: 9876.50, status: 'active', joinedAt: '2024-03-01' },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleResetBalance = (userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, balance: 10000 }
        : u
    ));
    toast.success('User balance reset to $10,000');
    setSelectedUser(null);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
        : u
    ));
    const user = users.find(u => u.id === userId);
    toast.success(`User ${user?.username} marked as ${user?.status === 'active' ? 'inactive' : 'active'}`);
  };

  const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);
  const activeUsers = users.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#151e26] rounded-lg p-4 border border-[#1f2937]"
        >
          <p className="text-sm text-[#9ca3af] mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
          <p className="text-xs text-[#6b7280] mt-2">{activeUsers} active</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#151e26] rounded-lg p-4 border border-[#1f2937]"
        >
          <p className="text-sm text-[#9ca3af] mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-white">${(totalBalance / 1000).toFixed(1)}k</p>
          <p className="text-xs text-[#10b981] mt-2">+5.2% this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#151e26] rounded-lg p-4 border border-[#1f2937]"
        >
          <p className="text-sm text-[#9ca3af] mb-1">Avg Balance</p>
          <p className="text-2xl font-bold text-white">${(totalBalance / users.length).toFixed(0)}</p>
          <p className="text-xs text-[#6b7280] mt-2">per user</p>
        </motion.div>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-[#151e26] rounded-lg border border-[#1f2937] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#1f2937] bg-[#0b1217]">
                <TableHead className="text-[#9ca3af]">Username</TableHead>
                <TableHead className="text-[#9ca3af]">Email</TableHead>
                <TableHead className="text-[#9ca3af] text-right">Balance</TableHead>
                <TableHead className="text-[#9ca3af]">Status</TableHead>
                <TableHead className="text-[#9ca3af]">Joined</TableHead>
                <TableHead className="text-[#9ca3af]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, idx) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-[#1f2937] hover:bg-[#0b1217] transition-colors"
                >
                  <TableCell className="text-white font-medium">{user.username}</TableCell>
                  <TableCell className="text-[#9ca3af]">{user.email}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold ${user.balance > 8000 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                      ${user.balance.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-[#10b98124] text-[#10b981]'
                        : 'bg-[#6b728024] text-[#6b7280]'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#6b7280] text-sm">{user.joinedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleResetBalance(user.id)}
                        className="h-7 px-2 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleToggleStatus(user.id)}
                        className={`h-7 px-2 text-xs ${
                          user.status === 'active'
                            ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white'
                            : 'bg-[#10b981] hover:bg-[#059669] text-white'
                        }`}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
