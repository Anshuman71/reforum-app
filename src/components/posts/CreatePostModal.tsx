'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';
import { client, QUERY_KEYS } from '@/app/client-utils/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreatePostModalProps {
  onPostCreated?: () => void;
}

interface Category {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
}

export function CreatePostModal({ onPostCreated }: CreatePostModalProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
  });

  useEffect(() => {
    if (open) {
      client.categories
        .$get({ query: {} })
        .then(async (res) => {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCategories(data as Category[]);
          }
        })
        .catch(console.error);
    }
  }, [open]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      alert('You must be logged in to create a post');
      return;
    }

    if (
      !formData.title.trim() ||
      !formData.content.trim() ||
      !formData.categoryId
    ) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await client.posts.$post({
        json: {
          title: formData.title.trim(),
          content: formData.content.trim(),
          categoryId: formData.categoryId,
          authorId: session.user.id,
          tags: [],
        },
      });

      if (!res.ok) {
        const errorData: any = await res.json();
        throw new Error(errorData?.error?.message ?? 'Failed to create post');
      }

      setFormData({ title: '', content: '', categoryId: '' });
      setOpen(false);

      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.posts] });
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create post. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.title.trim() && formData.content.trim() && formData.categoryId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Post</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Share your thoughts with the community. Fill out the form below to
            create a new post.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title for your post"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.categoryId}
              onValueChange={value => handleInputChange('categoryId', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="What would you like to share with the community?"
              value={formData.content}
              onChange={e => handleInputChange('content', e.target.value)}
              rows={6}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.content.length}/5000 characters
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
