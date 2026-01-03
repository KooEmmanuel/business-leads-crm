CREATE TABLE `oauthAccessTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(512) NOT NULL,
	`appId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauthAccessTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauthAccessTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `oauthApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` varchar(64) NOT NULL,
	`appSecret` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`redirectUris` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oauthApplications_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauthApplications_appId_unique` UNIQUE(`appId`)
);
--> statement-breakpoint
CREATE TABLE `oauthAuthorizationCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(128) NOT NULL,
	`appId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`redirectUri` text NOT NULL,
	`state` varchar(512),
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauthAuthorizationCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauthAuthorizationCodes_code_unique` UNIQUE(`code`)
);
