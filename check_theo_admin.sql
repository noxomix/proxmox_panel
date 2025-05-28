-- SQL script to check user 'theo' and admin role permissions
-- Run with: node -e "require('./src/db').raw(require('fs').readFileSync('./check_theo_admin.sql', 'utf8')).then(console.log).catch(console.error).finally(() => process.exit())"

-- 1. Check if user 'theo' exists and has the admin role
SELECT 
    u.id,
    u.email,
    u.name,
    u.role_id,
    r.name as role_name,
    r.display_name as role_display_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'theo' OR u.name = 'theo';

-- 2. Check if the admin role has the user_index permission
SELECT 
    r.name as role_name,
    p.name as permission_name,
    p.display_name as permission_display_name,
    'via role' as permission_source
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin' AND p.name = 'user_index';

-- 3. List all permissions the admin role has
SELECT 
    r.name as role_name,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category as permission_category
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.category, p.name;