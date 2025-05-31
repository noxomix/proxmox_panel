CREATE TABLE `tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`type` enum('session','api') DEFAULT 'session',
	`user_agent` text,
	`ip_address` varchar(45),
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `token_hash_idx` ON `tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `tokens` (`type`);