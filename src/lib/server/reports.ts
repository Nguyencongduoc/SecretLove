import 'server-only';
import { reportSchema } from '@/lib/validation/reports';
import { recipientRateSubject, tokenDigest } from './recipient';
import { durableLimit } from './rate';
import { rpc } from './rpc';
export async function submitReport(input: unknown, request: Request) {
  const payload = reportSchema.parse(input);
  const ip = recipientRateSubject(request);
  const digest = tokenDigest(payload.shareToken);
  // Separate committed calls: rejected/unknown-target attempts must still consume limits.
  await durableLimit('report_hour', ip, 3, 3600);
  await durableLimit('report_day', ip, 10, 86400);
  await durableLimit('report_share', digest, 3, 86400);
  await durableLimit('report_global', 'all', 200, 86400);
  return rpc<{ received: true; reference: string }>('sl_report_submit', {
    digest_input: digest,
    reason_input: payload.reason,
    description_input: payload.description,
  });
}
