'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  User,
  Crown,
} from 'lucide-react';
import { client } from '@/app/client-utils/react-query';
interface ForumUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'moderator' | 'admin';
  createdAt: string;
}

const roleConfig = {
  admin: { label: 'Admin', icon: Crown, color: 'bg-purple-100 text-purple-800' },
  moderator: { label: 'Moderator', icon: Shield, color: 'bg-blue-100 text-blue-800' },
  user: { label: 'User', icon: User, color: 'bg-gray-100 text-gray-800' },
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<ForumUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await client.admin.users.$get({ query: {} });
      if (res.ok) {
        const data = await res.json();
        setUsers(data as ForumUser[]);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChangeRole = async (userId: string, newRole: ForumUser['role']) => {
    try {
      const res = await client.admin.users.role.$patch({
        json: { userId, role: newRole },
      });

      if (res.ok) {
        setUsers(users.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
      }
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

  const getRoleBadge = (role: ForumUser['role']) => {
    const config = roleConfig[role];
    const IconComponent = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage community members and their roles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'moderator').length}
            </div>
            <div className="text-sm text-muted-foreground">Moderators</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage all users in your community.
          </CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.id, 'admin')}
                            disabled={member.role === 'admin'}
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.id, 'moderator')}
                            disabled={member.role === 'moderator'}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Make Moderator
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.id, 'user')}
                            disabled={member.role === 'user'}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Make User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
