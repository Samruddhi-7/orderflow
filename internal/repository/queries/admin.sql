-- name: GetPlatformAnalytics :one
SELECT 
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM vendors) as total_vendors,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered') as total_revenue;
