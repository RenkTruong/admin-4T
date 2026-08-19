CREATE TABLE `laundryOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicCode` varchar(32) NOT NULL,
	`userId` int,
	`customerName` varchar(120) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`customerEmail` varchar(320),
	`pickupAddress` text NOT NULL,
	`pickupWindow` varchar(80) NOT NULL,
	`serviceTier` enum('standard','express') NOT NULL DEFAULT 'standard',
	`estimatedKg` int NOT NULL,
	`notes` text,
	`paymentMethod` enum('cash','bank_transfer','ewallet') NOT NULL,
	`paymentStatus` enum('cash_on_delivery','awaiting_transfer','awaiting_wallet','paid') NOT NULL,
	`status` enum('requested','confirmed','pickup','washing','drying','ready','completed','cancelled') NOT NULL DEFAULT 'requested',
	`estimatedTotalVnd` int NOT NULL,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `laundryOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `laundry_orders_public_code_uq` UNIQUE(`publicCode`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentPoints` int NOT NULL DEFAULT 0,
	`totalEarned` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyaltyAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_account_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`kind` enum('earn','redeem','adjust') NOT NULL,
	`points` int NOT NULL,
	`note` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_review_order_uq` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `orderStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('requested','confirmed','pickup','washing','drying','ready','completed','cancelled') NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siteVisits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorKey` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `siteVisits_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_visit_visitor_uq` UNIQUE(`visitorKey`)
);
--> statement-breakpoint
CREATE TABLE `supportMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadKey` varchar(48) NOT NULL,
	`userId` int,
	`visitorName` varchar(120),
	`contact` varchar(120),
	`sender` enum('visitor','staff') NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `laundry_orders_user_idx` ON `laundryOrders` (`userId`);--> statement-breakpoint
CREATE INDEX `laundry_orders_status_idx` ON `laundryOrders` (`status`);--> statement-breakpoint
CREATE INDEX `loyalty_tx_user_idx` ON `loyaltyTransactions` (`userId`);--> statement-breakpoint
CREATE INDEX `loyalty_tx_order_idx` ON `loyaltyTransactions` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_review_user_idx` ON `orderReviews` (`userId`);--> statement-breakpoint
CREATE INDEX `order_history_order_idx` ON `orderStatusHistory` (`orderId`);--> statement-breakpoint
CREATE INDEX `support_thread_idx` ON `supportMessages` (`threadKey`);--> statement-breakpoint
CREATE INDEX `support_created_idx` ON `supportMessages` (`createdAt`);