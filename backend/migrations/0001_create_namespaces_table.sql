CREATE TABLE `namespaces` (
	`id` varchar(40) NOT NULL,
	`name` varchar(255) NOT NULL,
	`parent_id` varchar(40),
	`full_path` text NOT NULL,
	`depth` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `namespaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `namespaces_parent_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `namespaces`(`id`) ON DELETE CASCADE,
	CONSTRAINT `namespaces_name_parent_id_unique` UNIQUE(`name`, `parent_id`),
	CONSTRAINT `namespaces_full_path_unique` UNIQUE(`full_path`(255))
);
--> statement-breakpoint
CREATE INDEX `parent_id_idx` ON `namespaces` (`parent_id`);--> statement-breakpoint
CREATE INDEX `depth_idx` ON `namespaces` (`depth`);