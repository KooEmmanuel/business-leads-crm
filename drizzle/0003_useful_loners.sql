CREATE TABLE `vapiAgents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vapiId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`model` varchar(50) NOT NULL DEFAULT 'gpt-4',
	`voice` varchar(50) NOT NULL DEFAULT 'josh',
	`transcriber` varchar(50) NOT NULL DEFAULT 'deepgram',
	`firstMessage` text,
	`systemPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vapiAgents_id` PRIMARY KEY(`id`),
	CONSTRAINT `vapiAgents_vapiId_unique` UNIQUE(`vapiId`)
);
--> statement-breakpoint
CREATE TABLE `vapiPhoneNumbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vapiId` varchar(255) NOT NULL,
	`number` varchar(20) NOT NULL,
	`provider` varchar(50) NOT NULL DEFAULT 'twilio',
	`assistantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vapiPhoneNumbers_id` PRIMARY KEY(`id`),
	CONSTRAINT `vapiPhoneNumbers_vapiId_unique` UNIQUE(`vapiId`)
);
