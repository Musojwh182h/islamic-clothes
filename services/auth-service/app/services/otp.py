import hashlib
import hmac
import secrets

from redis.asyncio import Redis

from app.core.config import Settings

VERIFY_SCRIPT = """
local current = redis.call('GET', KEYS[1])
if not current then return -1 end
if current ~= ARGV[1] then
  local attempts = redis.call('INCR', KEYS[2])
  if attempts == 1 then redis.call('EXPIRE', KEYS[2], ARGV[2]) end
  if attempts >= tonumber(ARGV[3]) then
    redis.call('DEL', KEYS[1], KEYS[2])
    return -2
  end
  return attempts
end
redis.call('DEL', KEYS[1], KEYS[2])
return 0
"""


class OtpService:
    def __init__(self, redis: Redis, settings: Settings):
        self.redis = redis
        self.settings = settings

    def _key(self, kind: str, identifier: str) -> str:
        identifier_hash = hashlib.sha256(identifier.encode()).hexdigest()
        return f"auth:otp:{kind}:{identifier_hash}"

    def _hash(self, identifier: str, code: str) -> str:
        value = f"{identifier}:{code}".encode()
        return hmac.new(self.settings.otp_secret.encode(), value, hashlib.sha256).hexdigest()

    async def issue(self, identifier: str) -> tuple[str, bool]:
        cooldown_key = self._key("cooldown", identifier)
        allowed = await self.redis.set(cooldown_key, "1", ex=self.settings.otp_cooldown_seconds, nx=True)
        if not allowed:
            return "", False

        code = f"{secrets.randbelow(1_000_000):06d}"
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.set(self._key("code", identifier), self._hash(identifier, code), ex=self.settings.otp_ttl_seconds)
            pipe.delete(self._key("attempts", identifier))
            await pipe.execute()
        return code, True

    async def cancel(self, identifier: str) -> None:
        await self.redis.delete(self._key("code", identifier), self._key("cooldown", identifier))

    async def verify(self, identifier: str, code: str) -> int:
        result = await self.redis.eval(
            VERIFY_SCRIPT,
            2,
            self._key("code", identifier),
            self._key("attempts", identifier),
            self._hash(identifier, code),
            self.settings.otp_ttl_seconds,
            self.settings.otp_max_attempts,
        )
        return int(result)
