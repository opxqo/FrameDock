CREATE TABLE `api_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` integer NOT NULL,
	`state` text NOT NULL,
	`source` text NOT NULL,
	`method` text NOT NULL,
	`url` text NOT NULL,
	`url_hash` text NOT NULL,
	`host` text NOT NULL,
	`path` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`status` integer,
	`error` text,
	`duration_ms` integer,
	`total_ms` integer,
	`req_headers` text,
	`req_body` text,
	`req_size` integer,
	`req_truncated` integer DEFAULT 0 NOT NULL,
	`res_headers` text,
	`res_body` text,
	`res_size` integer,
	`res_truncated` integer DEFAULT 0 NOT NULL,
	`res_type` text,
	`project_id` text,
	`node_id` text,
	`mode` text,
	`run_id` text,
	`page` text,
	`req_uid` text,
	`poll` integer DEFAULT 0 NOT NULL,
	`extra` text
);
--> statement-breakpoint
CREATE INDEX `api_logs_ts` ON `api_logs` (`ts`);--> statement-breakpoint
CREATE INDEX `api_logs_node` ON `api_logs` (`node_id`);--> statement-breakpoint
CREATE INDEX `api_logs_run` ON `api_logs` (`run_id`);--> statement-breakpoint
CREATE INDEX `api_logs_state_status` ON `api_logs` (`state`,`status`);--> statement-breakpoint
CREATE INDEX `api_logs_poll` ON `api_logs` (`method`,`url_hash`,`ts`);