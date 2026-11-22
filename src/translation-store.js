// Server-only SQL boundary. Each write is one atomic D1/SQLite statement.
import {directWriteSucceeded} from './db-write.js';
export const TRANSLATION_SQL=Object.freeze({
 source:`SELECT * FROM translation_sources WHERE guide_id=?1 AND section=?2`,
 language:`UPDATE translation_sources SET source_language=?3,source_version=source_version+1 WHERE guide_id=?1 AND section=?2 AND source_language IS NOT ?3 RETURNING 1 AS applied`,
 cached:`SELECT t.* FROM translations t JOIN translation_sources s ON s.guide_id=t.guide_id AND s.section=t.section AND s.source_language=t.source_language AND s.source_version=t.source_version WHERE t.guide_id=?1 AND t.section=?2 AND t.target_language=?3 AND t.model=?4 AND t.prompt_version=?5 AND t.provider_mode=?6 AND t.status='ready'`,
 claim:`INSERT INTO translation_attempts(claim_id,guide_id,section,source_language,target_language,source_version,model,prompt_version,created_ms,lease_until,reservation_nano,provider_mode)
 SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12
 WHERE EXISTS(SELECT 1 FROM translation_sources WHERE guide_id=?2 AND section=?3 AND source_language=?4 AND source_version=?6)
 AND ?10>?9 AND ?11>0
 AND (SELECT COUNT(*) FROM translation_attempts)<(SELECT max_requests FROM translation_policy WHERE id=1)
 AND (SELECT COALESCE(SUM(reservation_nano),0) FROM translation_attempts)+?11<=(SELECT budget_nano FROM translation_policy WHERE id=1)
 AND (SELECT COUNT(*) FROM translation_attempts WHERE created_ms>=?9-60000)<(SELECT per_minute FROM translation_policy WHERE id=1)
 AND NOT EXISTS(SELECT 1 FROM translations WHERE guide_id=?2 AND section=?3 AND source_language=?4 AND target_language=?5 AND source_version=?6 AND model=?7 AND prompt_version=?8 AND provider_mode=?12 AND (status='ready' OR (status='pending' AND lease_until>?9))) RETURNING 1 AS applied`,
 publish:`UPDATE translations SET translated_text=?2,status='ready',origin=?3 WHERE claim_id=?1 AND status='pending' AND lease_until>?4 AND EXISTS(SELECT 1 FROM translation_sources s WHERE s.guide_id=translations.guide_id AND s.section=translations.section AND s.source_language=translations.source_language AND s.source_version=translations.source_version) RETURNING 1 AS applied`,
 reconcile:`UPDATE translation_attempts SET usage_json=?2,cost_nano=?3 WHERE claim_id=?1 AND reservation_nano>=?3 AND provider_mode='openai' RETURNING 1 AS applied`,
 fail:`UPDATE translations SET status='failed' WHERE claim_id=?1 AND status='pending' RETURNING 1 AS applied`,
 manual:`UPDATE translations SET translated_text=?2,origin='manual' WHERE claim_id=?1 AND status='ready' AND source_version=?3 AND guide_id=?4 AND section=?5 AND target_language=?6 AND model=?7 AND prompt_version=?8 AND source_language=?9 AND translated_text=?10 AND EXISTS(SELECT 1 FROM translation_sources s WHERE s.guide_id=translations.guide_id AND s.section=translations.section AND s.source_language=translations.source_language AND s.source_version=translations.source_version) RETURNING 1 AS applied`
});
export function createTranslationStore(db){
 const first=(name,args)=>db.prepare(TRANSLATION_SQL[name]).bind(...args).first();
 const write=async(name,args)=>directWriteSucceeded(await db.prepare(TRANSLATION_SQL[name]).bind(...args).all());
 return {
  source:(id,section)=>first('source',[id,section]),
  setLanguage:(id,section,language)=>write('language',[id,section,language]),
  cached:(id,section,target,model,prompt,mode='mock')=>first('cached',[id,section,target,model,prompt,mode]),
  claim:attempt=>write('claim',[attempt.claim_id,attempt.guide_id,attempt.section,attempt.source_language,attempt.target_language,attempt.source_version,attempt.model,attempt.prompt_version,attempt.created_ms,attempt.lease_until,attempt.reservation_nano,attempt.provider_mode??'mock']),
  publish:(claim,text,now)=>write('publish',[claim,text,'generated',now]),
  reconcile:(claim,usage)=>write('reconcile',[claim,JSON.stringify(usage),usage.conservativeNano]),
  fail:claim=>write('fail',[claim]),
  correct:edit=>write('manual',[edit.translationId,edit.translatedText,edit.sourceVersion,edit.guideId,edit.section,edit.targetLanguage,edit.model,edit.promptVersion,edit.sourceLanguage,edit.previousText])
 };
}
