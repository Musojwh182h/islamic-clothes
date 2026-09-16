# Notification Worker

Изолированный потребитель RabbitMQ-событий для email-уведомлений.

В локальном режиме (`EMAIL_PROVIDER=mock`) код входа выводится в Docker-логи и также возвращается auth API в поле `debug_code`. В production обработчик отправляет письмо через Resend, а неуспешные сообщения перемещаются в очередь `notifications.email.failed`.
