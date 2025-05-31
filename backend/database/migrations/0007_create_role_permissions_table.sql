CREATE TABLE `role_permissions` (
  `role_id` varchar(40) NOT NULL,
  `permission_id` varchar(40) NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `role_permissions_role_id_permission_id` PRIMARY KEY(`role_id`,`permission_id`),
  CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action,
  CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action
);