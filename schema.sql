CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  edit_token_hash TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Fresh databases include migration 0001; existing databases apply that migration once.
-- SG-P31 Phase 3A: additive, no language assumption or live-provider enablement.
CREATE TABLE translation_sources (
 guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
 section TEXT NOT NULL, source_language TEXT, source_version INTEGER NOT NULL DEFAULT 1,
 source_text TEXT NOT NULL, PRIMARY KEY(guide_id,section)
);
CREATE TABLE translations (
 guide_id TEXT NOT NULL, section TEXT NOT NULL, source_language TEXT NOT NULL,
 target_language TEXT NOT NULL, source_version INTEGER NOT NULL,
 model TEXT NOT NULL, prompt_version TEXT NOT NULL,
 provider_mode TEXT NOT NULL DEFAULT 'mock' CHECK(provider_mode='mock'),
 translated_text TEXT, status TEXT NOT NULL CHECK(status IN ('pending','ready','failed','stale')),
 origin TEXT NOT NULL DEFAULT 'generated' CHECK(origin IN ('generated','manual')),
 claim_id TEXT NOT NULL, lease_until INTEGER NOT NULL,
 PRIMARY KEY(guide_id,section,source_language,target_language,source_version,model,prompt_version),
 FOREIGN KEY(guide_id,section) REFERENCES translation_sources(guide_id,section)
);
CREATE TABLE translation_attempts (
 claim_id TEXT PRIMARY KEY, guide_id TEXT NOT NULL, section TEXT NOT NULL,
 source_language TEXT NOT NULL, target_language TEXT NOT NULL, source_version INTEGER NOT NULL,
 model TEXT NOT NULL, prompt_version TEXT NOT NULL,
 created_ms INTEGER NOT NULL, lease_until INTEGER NOT NULL,
 reservation_nano INTEGER NOT NULL CHECK(reservation_nano > 0),
 status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','completed','failed')),
 FOREIGN KEY(guide_id,section) REFERENCES translation_sources(guide_id,section)
);
CREATE TABLE translation_policy (
 id INTEGER PRIMARY KEY CHECK(id=1), budget_nano INTEGER NOT NULL CHECK(budget_nano>=0),
 max_requests INTEGER NOT NULL CHECK(max_requests>=0), per_minute INTEGER NOT NULL CHECK(per_minute>=0)
);
-- Offline-only foundation limits, not authorization for paid usage. No automatic reset/refund.
INSERT INTO translation_policy VALUES(1,100000000,8,4);
CREATE INDEX translation_attempt_time ON translation_attempts(created_ms);
CREATE TRIGGER translation_claim AFTER INSERT ON translation_attempts BEGIN
 INSERT INTO translations(guide_id,section,source_language,target_language,source_version,model,prompt_version,status,claim_id,lease_until)
 VALUES(NEW.guide_id,NEW.section,NEW.source_language,NEW.target_language,NEW.source_version,NEW.model,NEW.prompt_version,'pending',NEW.claim_id,NEW.lease_until)
 ON CONFLICT(guide_id,section,source_language,target_language,source_version,model,prompt_version)
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
CREATE TRIGGER translation_insert_welcome AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'welcome',json_object('welcome',COALESCE(json_extract(NEW.content_json,'$.welcome'),''))); END;
CREATE TRIGGER translation_update_welcome AFTER UPDATE OF content_json ON guides WHEN json_object('welcome',COALESCE(json_extract(OLD.content_json,'$.welcome'),'')) != json_object('welcome',COALESCE(json_extract(NEW.content_json,'$.welcome'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('welcome',COALESCE(json_extract(NEW.content_json,'$.welcome'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='welcome'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'welcome',json_object('welcome',COALESCE(json_extract(guides.content_json,'$.welcome'),'')) FROM guides;
CREATE TRIGGER translation_insert_arrival AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'arrival',json_object('checkin',COALESCE(json_extract(NEW.content_json,'$.checkin'),''),'checkout',COALESCE(json_extract(NEW.content_json,'$.checkout'),''))); END;
CREATE TRIGGER translation_update_arrival AFTER UPDATE OF content_json ON guides WHEN json_object('checkin',COALESCE(json_extract(OLD.content_json,'$.checkin'),''),'checkout',COALESCE(json_extract(OLD.content_json,'$.checkout'),'')) != json_object('checkin',COALESCE(json_extract(NEW.content_json,'$.checkin'),''),'checkout',COALESCE(json_extract(NEW.content_json,'$.checkout'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('checkin',COALESCE(json_extract(NEW.content_json,'$.checkin'),''),'checkout',COALESCE(json_extract(NEW.content_json,'$.checkout'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='arrival'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'arrival',json_object('checkin',COALESCE(json_extract(guides.content_json,'$.checkin'),''),'checkout',COALESCE(json_extract(guides.content_json,'$.checkout'),'')) FROM guides;
CREATE TRIGGER translation_insert_rules AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'rules',json_object('rules',COALESCE(json_extract(NEW.content_json,'$.rules'),''))); END;
CREATE TRIGGER translation_update_rules AFTER UPDATE OF content_json ON guides WHEN json_object('rules',COALESCE(json_extract(OLD.content_json,'$.rules'),'')) != json_object('rules',COALESCE(json_extract(NEW.content_json,'$.rules'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('rules',COALESCE(json_extract(NEW.content_json,'$.rules'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='rules'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'rules',json_object('rules',COALESCE(json_extract(guides.content_json,'$.rules'),'')) FROM guides;
CREATE TRIGGER translation_insert_appliances AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'appliances',json_object('appliances',COALESCE(json_extract(NEW.content_json,'$.appliances'),''))); END;
CREATE TRIGGER translation_update_appliances AFTER UPDATE OF content_json ON guides WHEN json_object('appliances',COALESCE(json_extract(OLD.content_json,'$.appliances'),'')) != json_object('appliances',COALESCE(json_extract(NEW.content_json,'$.appliances'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('appliances',COALESCE(json_extract(NEW.content_json,'$.appliances'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='appliances'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'appliances',json_object('appliances',COALESCE(json_extract(guides.content_json,'$.appliances'),'')) FROM guides;
CREATE TRIGGER translation_insert_parking AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'parking',json_object('parking',COALESCE(json_extract(NEW.content_json,'$.parking'),''))); END;
CREATE TRIGGER translation_update_parking AFTER UPDATE OF content_json ON guides WHEN json_object('parking',COALESCE(json_extract(OLD.content_json,'$.parking'),'')) != json_object('parking',COALESCE(json_extract(NEW.content_json,'$.parking'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('parking',COALESCE(json_extract(NEW.content_json,'$.parking'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='parking'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'parking',json_object('parking',COALESCE(json_extract(guides.content_json,'$.parking'),'')) FROM guides;
CREATE TRIGGER translation_insert_local_tips AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'local_tips',json_object('local_tips',COALESCE(json_extract(NEW.content_json,'$.local_tips'),''))); END;
CREATE TRIGGER translation_update_local_tips AFTER UPDATE OF content_json ON guides WHEN json_object('local_tips',COALESCE(json_extract(OLD.content_json,'$.local_tips'),'')) != json_object('local_tips',COALESCE(json_extract(NEW.content_json,'$.local_tips'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('local_tips',COALESCE(json_extract(NEW.content_json,'$.local_tips'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='local_tips'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'local_tips',json_object('local_tips',COALESCE(json_extract(guides.content_json,'$.local_tips'),'')) FROM guides;
CREATE TRIGGER translation_insert_emergency AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'emergency',json_object('emergency',COALESCE(json_extract(NEW.content_json,'$.emergency'),''))); END;
CREATE TRIGGER translation_update_emergency AFTER UPDATE OF content_json ON guides WHEN json_object('emergency',COALESCE(json_extract(OLD.content_json,'$.emergency'),'')) != json_object('emergency',COALESCE(json_extract(NEW.content_json,'$.emergency'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('emergency',COALESCE(json_extract(NEW.content_json,'$.emergency'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='emergency'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'emergency',json_object('emergency',COALESCE(json_extract(guides.content_json,'$.emergency'),'')) FROM guides;
CREATE TRIGGER translation_insert_contact AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'contact',json_object('contact',COALESCE(json_extract(NEW.content_json,'$.contact'),''))); END;
CREATE TRIGGER translation_update_contact AFTER UPDATE OF content_json ON guides WHEN json_object('contact',COALESCE(json_extract(OLD.content_json,'$.contact'),'')) != json_object('contact',COALESCE(json_extract(NEW.content_json,'$.contact'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('contact',COALESCE(json_extract(NEW.content_json,'$.contact'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='contact'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'contact',json_object('contact',COALESCE(json_extract(guides.content_json,'$.contact'),'')) FROM guides;
CREATE TRIGGER translation_insert_additional AFTER INSERT ON guides BEGIN INSERT INTO translation_sources(guide_id,section,source_text) VALUES(NEW.id,'additional',json_object('additional',COALESCE(json_extract(NEW.content_json,'$.additional'),''))); END;
CREATE TRIGGER translation_update_additional AFTER UPDATE OF content_json ON guides WHEN json_object('additional',COALESCE(json_extract(OLD.content_json,'$.additional'),'')) != json_object('additional',COALESCE(json_extract(NEW.content_json,'$.additional'),'')) BEGIN UPDATE translation_sources SET source_text=json_object('additional',COALESCE(json_extract(NEW.content_json,'$.additional'),'')),source_version=source_version+1 WHERE guide_id=NEW.id AND section='additional'; END;
INSERT INTO translation_sources(guide_id,section,source_text) SELECT id,'additional',json_object('additional',COALESCE(json_extract(guides.content_json,'$.additional'),'')) FROM guides;
