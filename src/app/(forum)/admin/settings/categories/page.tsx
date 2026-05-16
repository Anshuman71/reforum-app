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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { client } from '@/app/client-utils/react-query';

interface Category {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  roleIds?: string[];
  groupIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
}

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryIsPrivate, setCategoryIsPrivate] = useState(false);
  const [categoryRoleIds, setCategoryRoleIds] = useState<string[]>([]);
  const [categoryGroupIds, setCategoryGroupIds] = useState<string[]>([]);

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryIsPrivate(false);
    setCategoryRoleIds([]);
    setCategoryGroupIds([]);
    setError(null);
  };

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const [categoriesRes, rolesRes, groupsRes] = await Promise.all([
        client.categories.$get({ query: {} }),
        client.admin.roles.$get(),
        client.admin.groups.$get(),
      ]);
      const categoriesData = await categoriesRes.json();
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData as Category[]);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData as Role[]);
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData as Group[]);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description);
    setCategoryIsPrivate(category.isPrivate);
    setCategoryRoleIds(category.roleIds ?? []);
    setCategoryGroupIds(category.groupIds ?? []);
    setError(null);
    setIsCreateModalOpen(true);
  };

  const toggleRole = (roleId: string) => {
    setCategoryRoleIds(current =>
      current.includes(roleId)
        ? current.filter(id => id !== roleId)
        : [...current, roleId]
    );
  };

  const toggleGroup = (groupId: string) => {
    setCategoryGroupIds(current =>
      current.includes(groupId)
        ? current.filter(id => id !== groupId)
        : [...current, groupId]
    );
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        isPrivate: categoryIsPrivate,
        roleIds: categoryRoleIds,
        groupIds: categoryGroupIds,
      };

      const res = editingCategory
        ? await client.categories[':id'].$patch({
            param: { id: editingCategory.id },
            json: payload,
          })
        : await client.categories.$post({ json: payload });

      if (!res.ok) {
        const errorData: any = await res.json();
        throw new Error(errorData?.error?.message ?? 'Failed to create category');
      }

      setSuccess(editingCategory ? 'Category updated.' : 'Category created successfully!');
      setIsCreateModalOpen(false);
      resetForm();
      await loadCategories();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save category:', err);
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await client.categories[':id'].$delete({
        param: { id },
      });

      if (!res.ok) {
        throw new Error('Failed to delete category');
      }

      setSuccess('Category deleted.');
      await loadCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Organize your community content with categories.
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
              <DialogDescription>
                Configure where content belongs and who can access private areas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  value={categoryDescription}
                  onChange={e => setCategoryDescription(e.target.value)}
                  placeholder="Describe what this category is for (optional)"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={categoryIsPrivate}
                  disabled={isSubmitting}
                  onCheckedChange={checked => setCategoryIsPrivate(Boolean(checked))}
                />
                Private category
              </label>

              {categoryIsPrivate ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Allowed roles</Label>
                    <div className="grid gap-2 rounded-md border p-3">
                      {roles.map(role => (
                        <label key={role.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={categoryRoleIds.includes(role.id)}
                            disabled={isSubmitting}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          {role.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed groups</Label>
                    <div className="grid gap-2 rounded-md border p-3">
                      {groups.map(group => (
                        <label key={group.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={categoryGroupIds.includes(group.id)}
                            disabled={isSubmitting}
                            onCheckedChange={() => toggleGroup(group.id)}
                          />
                          {group.name}
                        </label>
                      ))}
                      {groups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No groups configured.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCategory}
                disabled={isSubmitting || !categoryName.trim()}
              >
                {isSubmitting ? 'Saving...' : editingCategory ? 'Save Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Manage the categories available in your community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No categories created yet. Create your first category to get
                started.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Category
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{category.name}</h3>
                      {category.isPrivate ? <Badge variant="secondary">Private</Badge> : null}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    )}
                    {category.isPrivate && category.roleIds?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {category.roleIds.map(roleId => (
                          <Badge key={roleId} variant="outline">
                            {roles.find(role => role.id === roleId)?.name ?? roleId}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {category.isPrivate && category.groupIds?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {category.groupIds.map(groupId => (
                          <Badge key={groupId} variant="outline">
                            {groups.find(group => group.id === groupId)?.name ?? groupId}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCategory(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
