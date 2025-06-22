CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`app` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_logs_app_ts` ON `logs` (`app`,"timestamp" desc);--> statement-breakpoint
CREATE TABLE `settings` (
	`app` text NOT NULL,
	`key` text NOT NULL,
	`field_type` text NOT NULL,
	`value` blob NOT NULL,
	PRIMARY KEY(`app`, `key`)
);
--> statement-breakpoint
CREATE INDEX `idx_settings_app` ON `settings` (`app`);