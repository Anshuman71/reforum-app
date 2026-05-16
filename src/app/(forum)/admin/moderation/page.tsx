'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  RefreshCw,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { client } from '@/app/client-utils/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type FlagStatus = 'pending' | 'accepted' | 'rejected';
type ContentAction = 'none' | 'hide' | 'delete' | 'restore';

type ModerationFlag = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: FlagStatus;
  reviewedBy: string | null;
  createdAt: string | Date;
  resolvedAt: string | Date | null;
};

const statusLabels: Record<FlagStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const statusClasses: Record<FlagStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-slate-200 bg-slate-50 text-slate-700',
};

const actionLabels: Record<ContentAction, string> = {
  none: 'No content change',
  hide: 'Hide content',
  delete: 'Delete content',
  restore: 'Restore content',
};

function formatDate(value: string | Date | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: FlagStatus }) {
  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {statusLabels[status]}
    </Badge>
  );
}

export default function ModerationPage() {
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [status, setStatus] = useState<FlagStatus | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await client.moderation.flags.$get({
        query: {
          ...(status === 'all' ? {} : { status }),
          limit: '100',
        },
      });

      if (!res.ok) {
        setError('Unable to load moderation queue.');
        return;
      }

      setFlags(await res.json() as ModerationFlag[]);
    } catch (err) {
      console.error('Failed to load moderation queue:', err);
      setError('Unable to load moderation queue.');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const counts = useMemo(() => ({
    pending: flags.filter(flag => flag.status === 'pending').length,
    accepted: flags.filter(flag => flag.status === 'accepted').length,
    rejected: flags.filter(flag => flag.status === 'rejected').length,
  }), [flags]);

  const reviewFlag = async (
    flagId: string,
    decision: 'accepted' | 'rejected',
    contentAction: ContentAction = 'none'
  ) => {
    setActiveFlagId(flagId);
    setError(null);

    try {
      const res = await client.moderation.flags[':id'].review.$post({
        param: { id: flagId },
        json: { status: decision, contentAction },
      });

      if (!res.ok) {
        setError('Unable to save moderation decision.');
        return;
      }

      const updated = await res.json() as ModerationFlag;
      setFlags(current => current.map(flag => (
        flag.id === updated.id ? updated : flag
      )));
    } catch (err) {
      console.error('Failed to review flag:', err);
      setError('Unable to save moderation decision.');
    } finally {
      setActiveFlagId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review reports, resolve queue items, and apply content actions.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadFlags()} disabled={isLoading}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="size-5 text-amber-600" />
            <div>
              <div className="text-2xl font-bold">{counts.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <div>
              <div className="text-2xl font-bold">{counts.accepted}</div>
              <div className="text-sm text-muted-foreground">Accepted</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="size-5 text-slate-500" />
            <div>
              <div className="text-2xl font-bold">{counts.rejected}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Resolve user-submitted reports with explicit moderation permissions.
            </CardDescription>
          </div>
          <Select
            value={status}
            onValueChange={value => setStatus(value as FlagStatus | 'all')}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All reports</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading moderation queue...
            </div>
          ) : flags.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No reports match this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map(flag => {
                  const isActive = activeFlagId === flag.id;
                  const isPending = flag.status === 'pending';

                  return (
                    <TableRow key={flag.id}>
                      <TableCell className="max-w-[22rem]">
                        <div className="font-medium capitalize">{flag.reason}</div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {flag.details || 'No additional details'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{flag.targetId}</div>
                        <div className="text-sm capitalize text-muted-foreground">
                          {flag.targetType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={flag.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(flag.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isPending || isActive}
                            onClick={() => reviewFlag(flag.id, 'accepted', 'hide')}
                            title={actionLabels.hide}
                          >
                            <EyeOff className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isPending || isActive}
                            onClick={() => reviewFlag(flag.id, 'accepted', 'delete')}
                            title={actionLabels.delete}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isPending || isActive}
                            onClick={() => reviewFlag(flag.id, 'accepted', 'restore')}
                            title={actionLabels.restore}
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!isPending || isActive}
                            onClick={() => reviewFlag(flag.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
