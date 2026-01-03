CREATE TABLE `kwickflowBusinesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessId` varchar(255) NOT NULL,
	`contactId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`ownerUserId` varchar(255),
	`status` varchar(50),
	`subscription` json,
	`contactInfo` json,
	`ownerInfo` json,
	`users` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kwickflowBusinesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `kwickflowBusinesses_businessId_unique` UNIQUE(`businessId`)
);
