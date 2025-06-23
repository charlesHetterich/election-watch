DROP INDEX `idx_logs_app_ts`;--> statement-breakpoint
CREATE INDEX `idx_logs_app_desc(timestamp)` ON `logs` (`app`,"timestamp" desc);--> statement-breakpoint
DROP INDEX `idx_settings_app`;