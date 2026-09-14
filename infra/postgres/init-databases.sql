-- Один кластер PostgreSQL для локальной разработки, но отдельная БД на сервис.
-- В production эти базы получают независимые роли, бэкапы и политики доступа.
CREATE DATABASE auth_db;
CREATE DATABASE orders_db;
