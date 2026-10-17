import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireOperator } from './identity';
import { durableLimit } from './rate';
import { rpc } from './rpc';
import { serviceClient } from '@/lib/supabase/service';
import { AppError } from './errors';
import {
  accessAction,
  deletionAction,
  moderationAction,
  resolutionAction,
} from '@/lib/validation/access';
export type ReportCard = {
  id: string;
  reason: string;
  status: string;
  version: string;
  createdAt: string;
};
export type ReportDetail = ReportCard & {
  description: string;
  letterId: string | null;
  moderationVersion: string;
  letterVersion: string | null;
};
export type CreatorCard = { id: string; status: string; version: string };
export async function operatorRead(kind: 'reports' | 'creators', cursor?: string | null) {
  const { user } = await requireOperator();
  await durableLimit('operator_read', user.id, 120, 60);
  return rpc<ReportCard[] | CreatorCard[]>(
    kind === 'reports' ? 'sl_report_list' : 'sl_creator_access_list',
    { a: user.id, cursor_input: cursor ? z.uuid().parse(cursor) : null },
  );
}
export async function operatorDetail(id: string) {
  z.uuid().parse(id);
  const { user } = await requireOperator();
  await durableLimit('operator_read', user.id, 120, 60);
  return rpc<ReportDetail>('sl_report_get', { a: user.id, rid: id, request_input: randomUUID() });
}
export async function operatorMutate(
  kind: 'access' | 'resolve' | 'moderate' | 'delete',
  id: string,
  input: unknown,
) {
  z.uuid().parse(id);
  const { user } = await requireOperator();
  await durableLimit('operator_mutation', user.id, 60, 60);
  const common = { a: user.id, request_input: randomUUID() };
  if (kind === 'access') {
    const p = accessAction.parse(input);
    const { data, error } = await serviceClient().auth.admin.getUserById(id);
    if (error && (error.status ?? 0) >= 500)
      throw new AppError(
        503,
        'TEMPORARILY_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    if (error || !data.user?.email_confirmed_at)
      throw new AppError(
        422,
        'CONFIRMED_USER_REQUIRED',
        'The target must be an existing confirmed Auth user.',
      );
    return rpc('sl_creator_access_set', {
      ...common,
      target: id,
      expected: p.expectedVersion,
      action_input: p.action,
      reason_input: p.reasonCode,
    });
  }
  if (kind === 'resolve') {
    const p = resolutionAction.parse(input);
    return rpc('sl_report_resolve', {
      ...common,
      rid: id,
      expected: p.expectedVersion,
      resolution_input: p.resolution,
    });
  }
  if (kind === 'moderate') {
    const p = moderationAction.parse(input);
    return rpc('sl_letter_moderate', {
      ...common,
      lid: id,
      expected: p.expectedModerationVersion,
      action_input: p.action,
      reason_input: p.reasonCode,
      rid: p.reportId ?? null,
    });
  }
  const p = deletionAction.parse(input);
  return rpc('sl_operator_letter_delete', {
    ...common,
    lid: id,
    expected: p.expectedVersion,
    reference_input: p.requestReference,
    reason_input: p.reasonCode,
  });
}
