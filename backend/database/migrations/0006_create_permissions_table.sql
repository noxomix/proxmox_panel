CREATE TABLE `permissions` (
  `id` varchar(40) NOT NULL,
  `name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) NOT NULL,
  `is_system` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
  CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);