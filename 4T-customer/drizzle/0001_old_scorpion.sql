ALTER TABLE `laundryOrders` ADD `deliveryMethod` enum('store','address') DEFAULT 'address' NOT NULL;--> statement-breakpoint
ALTER TABLE `laundryOrders` ADD `routeDistanceMeters` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `laundryOrders` ADD `shippingFeeVnd` int DEFAULT 0 NOT NULL;