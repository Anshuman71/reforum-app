'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Users } from 'lucide-react';
import { client } from '@/app/client-utils/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ForumUser = {
  id: string;
  name: string;
  email: string;
};

type Group = {
  id: string;
  name: string;
  description: string;
  userIds: string[];
  memberCount: number;
};

type GroupForm = {
  id: string | null;
  name: string;
  description: string;
  userIds: string[];
};

const emptyForm: GroupForm = {
  id: null,
  name: '',
  description: '',
  userIds: [],
};

export default function GroupsSettingsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<ForumUser[]>([]);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [groupsRes, usersRes] = await Promise.all([
        client.admin.groups.$get(),
        client.admin.users.$get({ query: {} }),
      ]);

      if (!groupsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load groups');
      }

      const [groupsData, usersData] = await Promise.all([
        groupsRes.json(),
        usersRes.json(),
      ]);

      setGroups(groupsData as Group[]);
      setUsers(usersData as ForumUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;

    return users.filter(user =>
      user.name.toLowerCase().includes(value) ||
      user.email.toLowerCase().includes(value)
    );
  }, [query, users]);

  const selectGroup = (group: Group) => {
    setForm({
      id: group.id,
      name: group.name,
      description: group.description,
      userIds: group.userIds,
    });
    setError(null);
  };

  const startNewGroup = () => {
    setForm(emptyForm);
    setQuery('');
    setError(null);
  };

  const toggleUser = (userId: string) => {
    setForm(current => ({
      ...current,
      userIds: current.userIds.includes(userId)
        ? current.userIds.filter(id => id !== userId)
        : [...current.userIds, userId],
    }));
  };

  const saveGroup = async () => {
    if (!form.name.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        userIds: form.userIds,
      };

      const res = form.id
        ? await client.admin.groups[':id'].$patch({
            param: { id: form.id },
            json: payload,
          })
        : await client.admin.groups.$post({ json: payload });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as any)?.error?.message ?? 'Failed to save group');
      }

      await loadData();
      selectGroup(data as Group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!form.id) return;
    if (!confirm(`Delete the ${form.name} group?`)) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await client.admin.groups[':id'].$delete({
        param: { id: form.id },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any)?.error?.message ?? 'Failed to delete group');
      }

      startNewGroup();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Groups</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize members for identity and private category access.
          </p>
        </div>
        <Button onClick={startNewGroup} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group Library</CardTitle>
            <CardDescription>{groups.length} configured groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading groups...</p>
            ) : (
              groups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => selectGroup(group)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent',
                    form.id === group.id && 'border-primary bg-accent'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{group.name}</span>
                    <Badge variant="secondary">{group.memberCount}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {group.description || 'No description'}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {form.id ? 'Edit Group' : 'Create Group'}
                </CardTitle>
                <CardDescription>
                  Groups do not grant global permissions; they can unlock private categories.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveGroup} disabled={isSaving || !form.name.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                {form.id ? (
                  <Button onClick={deleteGroup} disabled={isSaving} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Members</Label>
                <div className="flex h-10 items-center rounded-md border px-3 text-sm">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  {form.userIds.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label>Members</Label>
                <Input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search members..."
                  className="max-w-xs"
                />
              </div>

              <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={form.userIds.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{user.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                    </span>
                  </label>
                ))}
                {filteredUsers.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No members match your search.
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
