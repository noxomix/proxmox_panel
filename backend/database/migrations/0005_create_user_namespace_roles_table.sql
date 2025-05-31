CREATE TABLE `user_namespace_roles` (
	`user_id` varchar(40) NOT NULL,
	`namespace_id` varchar(40) NOT NULL,
	`role_id` varchar(40) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_namespace_roles_user_id_namespace_id` PRIMARY KEY(`user_id`, `namespace_id`),
	CONSTRAINT `user_namespace_roles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `user_namespace_roles_namespace_id_fk` FOREIGN KEY (`namespace_id`) REFERENCES `namespaces`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `user_namespace_roles_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_namespace_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `namespace_id_idx` ON `user_namespace_roles` (`namespace_id`);--> statement-breakpoint
CREATE INDEX `role_id_idx` ON `user_namespace_roles` (`role_id`);