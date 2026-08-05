-- Reserved migration kept as a no-op because its timestamp precedes the
-- transactional email foundation migration at 20260805180000.
-- The actual enum extension is applied by
-- 20260805190000_add_email_verification_delivery_kind.
SELECT 1;
