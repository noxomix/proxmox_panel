CREATE TABLE `roles_namespaces` (
	`role_id` varchar(40) NOT NULL,
	`namespace_id` varchar(40) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_namespaces_role_id_namespace_id` PRIMARY KEY(`role_id`, `namespace_id`),
	CONSTRAINT `roles_namespaces_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `roles_namespaces_namespace_id_fk` FOREIGN KEY (`namespace_id`) REFERENCES `namespaces`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `role_id_idx` ON `roles_namespaces` (`role_id`);--> statement-breakpoint
CREATE INDEX `namespace_id_idx` ON `roles_namespaces` (`namespace_id`);