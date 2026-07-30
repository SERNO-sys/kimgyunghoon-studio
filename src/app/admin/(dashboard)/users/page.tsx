'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useToast } from '@/hooks/useToast';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersAdminPage() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {
        toast.addToast('Failed to load users.', 'error');
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Users
        </h1>
        <p className="mt-2 text-stone-600">
          Manage users and permissions.
        </p>
      </div>

      <Card className="space-y-4">
        {isLoading ? (
          <p className="py-8 text-center text-stone-500">Loading users...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-stone-950">
                    {user.name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-stone-500"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
