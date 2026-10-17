'use client';
import { useState } from 'react';
import { api } from '@/lib/client-api';
import type { CreatorCard, ReportCard, ReportDetail } from '@/lib/server/operator';
export function OperatorConsole() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [reports, setReports] = useState<ReportCard[]>([]),
    [creators, setCreators] = useState<CreatorCard[]>([]);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (e) {
      setMessage(
        `${e instanceof Error ? e.message : 'Request failed.'} Reload current state before another mutation; do not blindly retry.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function mutate(url: string, method: string, body: unknown) {
    await api(url, method, body);
    setDetail(null);
    setReports([]);
    setCreators([]);
    setMessage(
      'Action recorded. Reload the relevant record before acting again. Deletion remains queued, not physically complete.',
    );
  }
  return (
    <div className="space-y-8">
      <p role="status">{message}</p>
      <section className="space-y-4">
        <h2>Reports</h2>
        <button
          className="button"
          disabled={busy}
          onClick={() => run(async () => setReports(await api('/api/operator/reports')))}
        >
          Load first 50 reports
        </button>
        {reports.map((r) => (
          <p key={r.id}>
            <button
              disabled={busy}
              className="underline"
              onClick={() => run(async () => setDetail(await api(`/api/operator/reports/${r.id}`)))}
            >
              {r.id} · {r.reason} · {r.status}
            </button>
          </p>
        ))}
        {reports.length === 50 && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              run(async () =>
                setReports(await api(`/api/operator/reports?cursor=${reports.at(-1)!.id}`)),
              )
            }
          >
            Next reports
          </button>
        )}
        {detail && (
          <div className="panel space-y-4 p-6">
            <p>
              Report {detail.id} · revision {detail.version}
            </p>
            <p className="whitespace-pre-wrap break-words">
              {detail.description || 'No description'}
            </p>
            <p>Letter ID: {detail.letterId ?? 'Unresolved target'}</p>
            <div className="flex flex-wrap gap-3">
              {(['dismissed', 'action_taken', 'unresolved_target'] as const).map((resolution) => (
                <button
                  key={resolution}
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      mutate(`/api/operator/reports/${detail.id}`, 'PATCH', {
                        expectedVersion: detail.version,
                        resolution,
                      }),
                    )
                  }
                >
                  Resolve: {resolution}
                </button>
              ))}
            </div>
            {detail.letterId && (
              <>
                <p>
                  Moderation revision {detail.moderationVersion}. Clearing leaves a draft; it never
                  restores links or sessions.
                </p>
                <div className="flex gap-3">
                  {(['hold', 'clear'] as const).map((action) => (
                    <button
                      key={action}
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          mutate(`/api/operator/letters/${detail.letterId}/moderation`, 'POST', {
                            expectedModerationVersion: detail.moderationVersion,
                            action,
                            reasonCode: action === 'hold' ? 'abuse' : 'review_complete',
                            reportId: detail.id,
                          }),
                        )
                      }
                    >
                      {action}
                    </button>
                  ))}
                </div>
                {detail.letterVersion && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      if (
                        !confirm(
                          'Revoke access and queue deletion of this exact letter? Verify request entitlement first.',
                        )
                      )
                        return;
                      void run(() =>
                        mutate(`/api/operator/letters/${detail.letterId}/delete`, 'POST', {
                          expectedVersion: detail.letterVersion,
                          requestReference: f.get('reference'),
                          reasonCode: 'deletion_request',
                        }),
                      );
                    }}
                  >
                    <label className="label">
                      Verified deletion case reference
                      <input
                        className="field"
                        name="reference"
                        required
                        pattern="[A-Za-z0-9_-]{3,80}"
                        maxLength={80}
                        disabled={busy}
                      />
                    </label>
                    <button className="button secondary" disabled={busy}>
                      Queue exact-letter deletion
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </section>
      <section className="space-y-4">
        <h2>Creator access</h2>
        <p>
          Use the confirmed Auth UUID from the Dashboard. Missing approval has revision 0. No email
          directory or operator-role grant is exposed.
        </p>
        <button
          className="button"
          disabled={busy}
          onClick={() => run(async () => setCreators(await api('/api/operator/creators')))}
        >
          Load first 50 access records
        </button>
        {creators.map((c) => (
          <p key={c.id}>
            {c.id} · {c.status} · revision {c.version}
          </p>
        ))}
        {creators.length === 50 && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              run(async () =>
                setCreators(await api(`/api/operator/creators?cursor=${creators.at(-1)!.id}`)),
              )
            }
          >
            Next access records
          </button>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(() =>
              mutate(`/api/operator/creators/${f.get('id')}`, 'PUT', {
                expectedVersion: f.get('version'),
                action: f.get('action'),
                reasonCode: f.get('reason'),
              }),
            );
          }}
        >
          <label className="label">
            Confirmed Auth UUID
            <input className="field" name="id" required disabled={busy} />
          </label>
          <label className="label">
            Current revision
            <input
              className="field"
              name="version"
              required
              pattern="0|[1-9][0-9]*"
              disabled={busy}
            />
          </label>
          <label className="label">
            Action
            <select className="field" name="action" disabled={busy}>
              <option value="approve">Approve</option>
              <option value="suspend">Suspend and revoke all active letter access</option>
            </select>
          </label>
          <label className="label">
            Reason
            <select className="field" name="reason" disabled={busy}>
              <option value="review_complete">Review complete</option>
              <option value="abuse">Abuse</option>
              <option value="privacy">Privacy</option>
            </select>
          </label>
          <button className="button" disabled={busy}>
            Apply access decision
          </button>
        </form>
      </section>
    </div>
  );
}
