CREATE TABLE `roles` (
	`id` varchar(40) NOT NULL,
	`name` varchar(100) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`namespace_id` varchar(40) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_namespace_id_fk` FOREIGN KEY (`namespace_id`) REFERENCES `namespaces`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `roles_name_namespace_id_unique` UNIQUE(`name`, `namespace_id`)
);
--> statement-breakpoint
CREATE INDEX `namespace_id_idx` ON `roles` (`namespace_id`);--> statement-breakpoint
CREATE INDEX `enabled_idx` ON `roles` (`enabled`);