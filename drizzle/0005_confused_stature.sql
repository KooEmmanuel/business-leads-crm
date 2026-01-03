CREATE TABLE `vapiCalls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vapiCallId` varchar(255) NOT NULL,
	`assistantId` varchar(255),
	`phoneNumberId` varchar(255),
	`type` varchar(20),
	`status` varchar(50),
	`customerNumber` varchar(20),
	`recordingUrl` text,
	`summary` text,
	`transcript` text,
	`duration` int,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vapiCalls_id` PRIMARY KEY(`id`),
	CONSTRAINT `vapiCalls_vapiCallId_unique` UNIQUE(`vapiCallId`)
);
--> statement-breakpoint
ALTER TABLE `vapiPhoneNumbers` MODIFY COLUMN `assistantId` varchar(255);--> statement-breakpoint
ALTER TABLE `vapiPhoneNumbers` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;