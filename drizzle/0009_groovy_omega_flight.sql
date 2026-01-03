ALTER TABLE `contacts` ADD `type` enum('individual','company') DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `parentId` int;