'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Shield, Trash2 } from 'lucide-react';
import { client } from '@/app/client-utils/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Permission = {
  resource: string;
  action: string;
};

type Role = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
};

type RoleForm = {
  id: string | null;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
};

const emptyForm: RoleForm = {
  id: null,
  name: '',
  description: '',
  permissions: [],
  isSystem: false,
};

function permissionKey(permission: Permission) {
  return `${permission.resource}:${permission.action}`;
}

function titleCase(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        client.admin.roles.$get(),
        client.admin.roles.permissions.$get(),
      ]);

      if (!rolesRes.ok || !permissionsRes.ok) {
        throw new Error('Failed to load roles');
      }

      const [rolesData, permissionsData] = await Promise.all([
        rolesRes.json(),
        permissionsRes.json(),
      ]);

      setRoles(rolesData as Role[]);
      setPermissions(permissionsData as Permission[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      acc[permission.resource] ??= [];
      acc[permission.resource].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const selectedPermissionKeys = useMemo(
    () => new Set(form.permissions.map(permissionKey)),
    [form.permissions]
  );

  const selectRole = (role: Role) => {
    setForm({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
    });
    setError(null);
  };

  const startNewRole = () => {
    setForm(emptyForm);
    setError(null);
  };

  const togglePermission = (permission: Permission) => {
    if (form.isSystem) return;

    setForm(current => {
      const key = permissionKey(permission);
      const nextPermissions = current.permissions.some(item => permissionKey(item) === key)
        ? current.permissions.filter(item => permissionKey(item) !== key)
        : [...current.permissions, permission];

      return { ...current, permissions: nextPermissions };
    });
  };

  const saveRole = async () => {
    if (!form.name.trim() || form.isSystem) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      };

      const res = form.id
        ? await client.admin.roles[':id'].$patch({
            param: { id: form.id },
            json: payload,
          })
        : await client.admin.roles.$post({ json: payload });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as any)?.error?.message ?? 'Failed to save role');
      }

      await loadRoles();
      selectRole(data as Role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!form.id || form.isSystem) return;
    if (!confirm(`Delete the ${form.name} role?`)) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await client.admin.roles[':id'].$delete({
        param: { id: form.id },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any)?.error?.message ?? 'Failed to delete role');
      }

      startNewRole();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compose custom roles from the supported permission set.
          </p>
        </div>
        <Button onClick={startNewRole} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Role
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
            <CardTitle className="text-base">Role Library</CardTitle>
            <CardDescription>{roles.length} configured roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading roles...</p>
            ) : (
              roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent',
                    form.id === role.id && 'border-primary bg-accent'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem ? <Badge variant="secondary">System</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {role.description || 'No description'}
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
                  {form.id ? 'Edit Role' : 'Create Role'}
                </CardTitle>
                <CardDescription>
                  System roles are protected and can be copied manually into a custom role.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveRole} disabled={isSaving || form.isSystem || !form.name.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                {form.id && !form.isSystem ? (
                  <Button onClick={deleteRole} disabled={isSaving} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {form.isSystem ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                System role permissions are managed by the default RBAC matrix.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role-name">Name</Label>
                <Input
                  id="role-name"
                  value={form.name}
                  disabled={form.isSystem}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Selected Permissions</Label>
                <div className="flex h-10 items-center rounded-md border px-3 text-sm">
                  <Check className="mr-2 h-4 w-4 text-muted-foreground" />
                  {form.permissions.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={form.description}
                disabled={form.isSystem}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="space-y-3">
              {Object.entries(groupedPermissions).map(([resource, items]) => (
                <div key={resource} className="rounded-md border">
                  <div className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">
                    {titleCase(resource)}
                  </div>
                  <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map(permission => {
                      const key = permissionKey(permission);

                      return (
                        <label
                          key={key}
                          className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedPermissionKeys.has(key)}
                            disabled={form.isSystem}
                            onCheckedChange={() => togglePermission(permission)}
                          />
                          <span>{titleCase(permission.action)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
