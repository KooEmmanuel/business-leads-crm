CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int,
	`dealId` int,
	`type` enum('call','email','meeting','note','task') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`duration` int,
	`outcome` varchar(100),
	`scheduledFor` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`company` varchar(255),
	`location` text,
	`category` varchar(100),
	`status` enum('prospect','lead','customer','inactive') NOT NULL DEFAULT 'prospect',
	`notes` text,
	`website` varchar(500),
	`contactPerson` varchar(255),
	`lastContactedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dealHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`userId` int NOT NULL,
	`previousStage` varchar(50),
	`newStage` varchar(50) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dealHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`value` decimal(12,2),
	`currency` varchar(3) DEFAULT 'USD',
	`stage` enum('prospecting','negotiation','proposal','won','lost') NOT NULL DEFAULT 'prospecting',
	`probability` int DEFAULT 0,
	`expectedCloseDate` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int,
	`dealId` int,
	`type` enum('internal_note','email','sms','call_log') NOT NULL DEFAULT 'internal_note',
	`subject` varchar(255),
	`content` text NOT NULL,
	`senderName` varchar(255),
	`recipientEmail` varchar(320),
	`isRead` boolean DEFAULT false,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int,
	`dealId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
