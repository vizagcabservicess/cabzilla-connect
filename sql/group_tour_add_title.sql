-- Add title column to group_tour_tours
-- Run this migration to support the Tour Title field in the admin Edit Tour form.
-- The title is displayed on tour cards (e.g. "Araku Valley", "Lambasingi").
-- If empty, dropoff_location is used as fallback.
--
-- Backend update required: In group-tour-management.php, include `title` in
-- CREATE/UPDATE payloads and in GET responses. In list-routes.php and
-- search-tours.php, include `title` in the tour/route JSON output.

ALTER TABLE `group_tour_tours`
  ADD COLUMN `title` VARCHAR(255) NULL DEFAULT NULL
  AFTER `id`;
