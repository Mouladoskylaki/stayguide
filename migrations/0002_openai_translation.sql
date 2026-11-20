-- Preserve all Phase 3A mock rows while separating real-provider identities.
DROP TRIGGER translation_claim;
DROP TRIGGER translation_invalidate;
DROP TRIGGER translation_published;
ALTER TABLE translation_attempts ADD COLUMN provider_mode TEXT NOT NULL DEFAULT 'mock' CHECK(provider_mode IN ('mock','openai'));
ALTER TABLE translation_attempts ADD COLUMN usage_json TEXT;
ALTER TABLE translation_attempts ADD COLUMN cost_nano INTEGER CHECK(cost_nano>=0);
CREATE TABLE translations_next (
 guide_id TEXT NOT NULL, section TEXT NOT NULL, source_language TEXT NOT NULL,
 target_language TEXT NOT NULL, source_version INTEGER NOT NULL,
 model TEXT NOT NULL, prompt_version TEXT NOT NULL,
 provider_mode TEXT NOT NULL DEFAULT 'mock' CHECK(provider_mode IN ('mock','openai')),
 translated_text TEXT, status TEXT NOT NULL CHECK(status IN ('pending','ready','failed','stale')),
 origin TEXT NOT NULL DEFAULT 'generated' CHECK(origin IN ('generated','manual')),
 claim_id TEXT NOT NULL, lease_until INTEGER NOT NULL,
 PRIMARY KEY(guide_id,section,source_language,target_language,source_version,model,prompt_version,provider_mode),
 FOREIGN KEY(guide_id,section) REFERENCES translation_sources(guide_id,section)
);
INSERT INTO translations_next SELECT * FROM translations;
DROP TABLE translations;
ALTER TABLE translations_next RENAME TO translations;
CREATE TRIGGER translation_claim AFTER INSERT ON translation_attempts BEGIN
 INSERT INTO translations(guide_id,section,source_language,target_language,source_version,model,prompt_version,provider_mode,status,claim_id,lease_until)
 VALUES(NEW.guide_id,NEW.section,NEW.source_language,NEW.target_language,NEW.source_version,NEW.model,NEW.prompt_version,NEW.provider_mode,'pending',NEW.claim_id,NEW.lease_until)
 ON CONFLICT(guide_id,section,source_language,target_language,source_version,model,prompt_version,provider_mode)
 DO UPDATE SET status='pending',claim_id=NEW.claim_id,lease_until=NEW.lease_until,translated_text=NULL,origin='generated';
END;
CREATE TRIGGER translation_invalidate AFTER UPDATE ON translation_sources
 WHEN OLD.source_version != NEW.source_version BEGIN
 UPDATE translations SET status='stale' WHERE guide_id=NEW.guide_id AND section=NEW.section;
END;
CREATE TRIGGER translation_published AFTER UPDATE OF status ON translations
 WHEN NEW.status IN ('ready','failed') BEGIN
 UPDATE translation_attempts SET status=CASE WHEN NEW.status='ready' THEN 'completed' ELSE 'failed' END WHERE claim_id=NEW.claim_id;
END;
