# Scene text and background soundtrack — migration 005

The user authorized editable Heart/Closing text and automatic soundtrack initiation inside the unlocked gift, with no recipient playback controls. Existing music assets, 16 MiB/360-second limits, default-volume/loop settings, private delivery, session gates and Creator preview controls remain intact. No deployment or advanced editor.

## Manual migration

1. In the isolated Supabase project's SQL Editor, create a new query.
2. Paste the **entire** `supabase/migrations/202610140005_scene_text.sql`, including BEGIN/COMMIT, and run once after 001–004. Do not modify/replay earlier migrations or run a reset.
3. On error the transaction rolls back; review the error before retrying. There are no table drops, row deletes, truncation or content backfills. New nullable column, validator, erasure trigger, appended security-invoker view column and restricted gateway replacements are forward changes. Runtime erasure occurs only when an existing authorized deletion tombstones the letter.
4. Run these read-only checks without printing protected rows or secrets:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name in ('letters','creator_letters')
and column_name='scene_text';
select relname,relrowsecurity from pg_class where oid='public.letters'::regclass;
select tgname from pg_trigger where tgrelid='public.letters'::regclass
and tgname='sl_clear_deleted_scene_text';
select has_function_privilege('anon','public.sl_recipient_content(text,text)','execute') as anon_execute,
 has_function_privilege('authenticated','public.sl_save_letter(uuid,uuid,text,jsonb)','execute') as browser_execute,
 has_function_privilege('service_role','public.sl_save_letter(uuid,uuid,text,jsonb)','execute') as service_execute;
```

Expected: two scene_text column rows, letters RLS true, one erasure trigger, privileges false/false/true. Storage/RLS policies and unrelated gateway permissions are unchanged. Keep `.env.local`; no new credentials or dependencies are required. Restart the updated local app after application. Published letters must be unpublished before edits; republish invalidates older links/sessions as before.

## Protected text contract

`scene_text` is nullable private content on the owner-protected letters table, separate from presentation configuration. No backfill or read-time writes. Null resolves to exact legacy copy; older Save requests omitting sceneText preserve stored customization. Explicit null resets all scene copy. New editor sends the full strict object with its existing expectedVersion.

```json
{
  "heart": {
    "eyebrow": "A feeling, made visible",
    "title": "Every beat holds a thought of you",
    "prompt": "Touch the heart. There is something waiting for you.",
    "message": "Some feelings are best told in a letter. Yours is just ahead."
  },
  "closing": {
    "eyebrow": "Until the next little moment",
    "title": "Carry this feeling with you",
    "message": "A letter ends. The words can stay.\nReturn to any moment, or begin again."
  }
}
```

Subtitle <=80 characters, heading <=160, heart invitation <=240, revealed/closing message <=500; required non-empty trimmed strings, strict known keys, <=8 KiB. The database additionally checks types/shape/character limits/serialized bytes. Editor limits follow JavaScript UTF-16 length; database Unicode character bounds are defensive. Newlines/Unicode are supported. HTML/code-looking text renders literally through React; no HTML interpretation, scripts, CSS or external URLs. Scene copy is returned only to the owner or an authorized recipient, never bootstrap/metadata. Tombstoning clears the column atomically; stale/published/foreign writes are denied.

Saved Creator preview now includes the heart/closing copy below the existing letter. Reading uses the same validated copy in the registered scenes, with existing animation/navigation/reduced-motion behavior. Navigation button labels remain platform UI.

## Soundtrack behavior and browser limits

The global player mounts only after a user-initiated unlock/resume returns authorized content. It attempts to start the enabled attached track once; no audible media or audio request before authorization. If the browser rejects with NotAllowedError, show an honest instruction and retry synchronously during the next envelope-open, heart-reveal or scene-navigation interaction. No repeated timer retries, muted-audio workaround or attempted bypass of browser sound permissions. Reading remains available without audio.

The existing V1 `startPolicy: "manual"` remains a compatibility marker for interaction-initiated gifts. The latest user instruction replaces the separate Play action with the unlock/open interaction; no schema/policy-data backfill or new executable configuration is introduced. The runtime behavior is described here and supersedes previous separate-Play acceptance text. Volume and looping still follow saved Creator settings.

Recipients have no app Play/Pause/Stop/Mute/volume controls and no native controls in the rendered letter. Creator preview keeps its controls. This is a UI choice, **not a guarantee that the recipient cannot silence or pause audio**: browser/OS/device controls and browser autoplay policy remain effective. Do not restart externally paused audio automatically or prevent leaving/closing the letter. Close, expiry, revoked/uncertain access, letter change and unmount still unload audio. One player persists across scenes. [Browser autoplay behavior](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

## Validation evidence

The user manually applied 005 and confirmed verification. Automated read-only owner view/column and anonymous-denial checks PASS. No remote SQL executed by the agent.

| Check                                                    | Status              | Actual result                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck/lint/production build                          | PASS                | Final commands exit 0; no new dependencies.                                                                                                                                                                                                                                                                                                 |
| Local unit/database/security tests                       | PASS                | 43 passed, 0 failed; 1 optional local external-MP3 test intentionally skipped, 5 files. New text validation, legacy defaults/omitted Save, owner/version/freeze, recipient gate and tombstone erasure pass.                                                                                                                                 |
| Full browser suite                                       | PASS                | 16 passed, 0 failed, 0 skipped; desktop and 360px Chromium against real isolated Supabase and production build.                                                                                                                                                                                                                             |
| Custom scene copy                                        | PASS                | UI Save/reload, saved owner preview, publish and authorized heart/closing rendering; Vietnamese/newlines, HTML-looking string displayed literally, no custom text before unlock.                                                                                                                                                            |
| Background soundtrack                                    | PASS                | Automatic attempt after authorization, simulated NotAllowedError followed by genuine envelope-interaction playback; no app/native recipient playback controls; saved volume/loop, one-player continuity, Creator controls, private isolation/ranges, external pause not forcibly restarted, close/expiry teardown and failure revalidation. |
| Secret scan/preservation                                 | PASS, bounded audit | 61 client assets; environment/dependencies/applied 001–005 unchanged during final verification window. Full-turn baseline was lost on interruption; no independent whole-turn hash claim. No relevant write operations performed.                                                                                                           |
| Current executed failures                                | PASS                | 0 in final checks. Initial browser run 14 PASS/2 FAIL due test navigation/reload race, corrected. Interrupted later run incomplete and not counted as PASS. Earlier unit fixture/ref typing/lint issues fixed without weakening rules.                                                                                                      |
| Real-device audible autoplay/codec/device control matrix | NOT TESTED          | Synthetic MP3 and headless playback state do not prove audibility or policy behavior on physical Safari/iOS/Android.                                                                                                                                                                                                                        |
| Vercel large-file transport/production operation         | NOT TESTED          | Previous transport/resource/SMTP/cron/cleanup-backlog release gates remain; no deployment.                                                                                                                                                                                                                                                  |

Desktop/mobile closing screenshots were visually reviewed: Unicode/newlines fit the layout and no recipient playback controls appear. Synthetic account IDs remain in ignored .test-fixtures.json: 61 tracked total, 9 added this extension, including interrupted setup. Completed tests delete test letters through application APIs; operator cleanup and complete physical queue drainage remain pending. No production/non-test accounts changed.

Changes are in scene-text fields/validation, Creator editor and saved preview, letter/recipient DTOs and DAL, registered scenes/experience controller, shared MusicPlayer background mode, new migration 005, readiness script, relevant local/browser tests and documentation. Broader theme/animation editors and rich-text scene customization remain deferred.
