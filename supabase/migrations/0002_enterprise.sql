-- Enterprise scan request authorization flow
-- Applied: 2026-06-13

CREATE TABLE enterprise_requests (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  company         TEXT,
  role_title      TEXT,
  phone           TEXT,
  chatbot_url     TEXT        NOT NULL,
  target_description TEXT,
  ownership_method TEXT       NOT NULL,
  ownership_detail TEXT,
  agreed_to_tos   BOOLEAN     NOT NULL DEFAULT FALSE,
  agreement_text  TEXT,
  agreement_signed_at TIMESTAMPTZ,
  ip_address      TEXT,
  user_agent      TEXT,
  triage_score    INTEGER,
  triage_verdict  TEXT        DEFAULT 'pending',
  triage_flags    JSONB       DEFAULT '[]',
  triage_recommendation TEXT,
  approval_status TEXT        NOT NULL DEFAULT 'pending',
  approval_token  TEXT        UNIQUE,
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  scan_id         UUID        REFERENCES scans(id) ON DELETE SET NULL,
  report_token    TEXT        UNIQUE,
  re_scan_token   TEXT        UNIQUE,
  re_scan_used    BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enterprise_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert enterprise_requests"
  ON enterprise_requests FOR INSERT TO anon WITH CHECK (true);

-- SECURITY DEFINER RPCs: token-gated access without service role key
CREATE OR REPLACE FUNCTION get_enterprise_request_by_approval_token(p_token text)
RETURNS SETOF enterprise_requests
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM enterprise_requests WHERE approval_token = p_token LIMIT 1; $$;

CREATE OR REPLACE FUNCTION get_enterprise_request_by_report_token(p_token text)
RETURNS SETOF enterprise_requests
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM enterprise_requests WHERE report_token = p_token AND approval_status = 'approved' LIMIT 1; $$;

CREATE OR REPLACE FUNCTION get_enterprise_request_by_rescan_token(p_token text)
RETURNS SETOF enterprise_requests
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM enterprise_requests WHERE re_scan_token = p_token LIMIT 1; $$;

CREATE OR REPLACE FUNCTION approve_enterprise_request(p_id uuid, p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE enterprise_requests
  SET approval_status = 'approved', approved_at = NOW()
  WHERE id = p_id AND approval_token = p_token AND approval_status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION reject_enterprise_request(p_id uuid, p_token text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE enterprise_requests
  SET approval_status = 'rejected',
      rejection_reason = COALESCE(p_reason, 'Your request did not meet our authorization requirements.')
  WHERE id = p_id AND approval_token = p_token AND approval_status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION link_scan_to_enterprise_request(p_id uuid, p_scan_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE enterprise_requests SET scan_id = p_scan_id WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION mark_rescan_used(p_id uuid, p_scan_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE enterprise_requests SET re_scan_used = TRUE, scan_id = p_scan_id WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enterprise_requests_updated_at
  BEFORE UPDATE ON enterprise_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT EXECUTE ON FUNCTION get_enterprise_request_by_approval_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_enterprise_request_by_report_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_enterprise_request_by_rescan_token(text) TO anon;
GRANT EXECUTE ON FUNCTION approve_enterprise_request(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reject_enterprise_request(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION link_scan_to_enterprise_request(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION mark_rescan_used(uuid, uuid) TO anon;
