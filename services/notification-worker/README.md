# Notification Worker

Изолированный потребитель RabbitMQ-событий для SMS и будущих email-уведомлений.

В локальном режиме (`SMS_PROVIDER=mock`) код входа выводится в Docker-логи и также возвращается auth API в поле `debug_code`. В production `debug_code` отключается, а обработчик будет передавать сообщение выбранному SMS-провайдеру.
