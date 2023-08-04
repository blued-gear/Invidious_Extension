package apps.chocolatecakecodes.invidious_ext.sync.config

import apps.chocolatecakecodes.invidious_ext.util.crypto.Argon2PasswordEncoder
import apps.chocolatecakecodes.invidious_ext.util.crypto.PasswordEncoder
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

@Factory
class Beans {

    @Singleton
    fun passwordEncoder(): PasswordEncoder {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()
    }
}
