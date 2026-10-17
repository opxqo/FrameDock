CREATE TABLE `kv` (
	`store` text NOT NULL,
	`key` text NOT NULL,
	`kind` text NOT NULL,
	`value` text,
	`mime` text,
	`size` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`store`, `key`)
);
