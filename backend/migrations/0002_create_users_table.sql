CREATE TABLE `users` (
	`id` varchar(40) NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
	`avatar` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `users` (`status`);