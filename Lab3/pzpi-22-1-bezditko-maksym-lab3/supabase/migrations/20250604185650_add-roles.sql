INSERT INTO user_roles (role_name) 
VALUES ('admin'), ('user')
ON CONFLICT (role_name) DO NOTHING;