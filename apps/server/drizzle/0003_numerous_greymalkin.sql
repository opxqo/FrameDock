CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`adapter` text NOT NULL,
	`model` text NOT NULL,
	`state` text NOT NULL,
	`request` text NOT NULL,
	`credentials` text,
	`idempotency_key` text,
	`remote_task_id` text,
	`result` text,
	`error` text,
	`project_id` text,
	`node_id` text,
	`run_id` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_poll_at` integer,
	`cancel_requested` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_idempotency` ON `jobs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `jobs_state` ON `jobs` (`state`);--> statement-breakpoint
CREATE INDEX `jobs_node` ON `jobs` (`node_id`);--> statement-breakpoint
CREATE INDEX `jobs_project` ON `jobs` (`project_id`);