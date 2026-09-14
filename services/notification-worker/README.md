# Notification Worker

Этот сервис будет единственным потребителем событий `auth.sms_code_requested`, `order.created` и `order.status_changed` из RabbitMQ. Он отправит SMS / email и сохранит технический статус доставки сообщения.

Он не читает базы `auth-service` и `orders-service`: всё необходимое должно приходить в полезной нагрузке события. Реализация придёт вместе с SMS-регистрацией на следующем этапе.
