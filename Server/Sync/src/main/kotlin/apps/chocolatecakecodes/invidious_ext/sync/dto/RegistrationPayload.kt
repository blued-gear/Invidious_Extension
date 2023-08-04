package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

@Serdeable
data class RegistrationPayload(
    @get:Pattern(regexp = "^[a-zA-Z0-9-_]+\$", message = "the username may only consist of a-z, A-Z, 0-9, -, _")
    @get:Size(min = 3, max = 255)
    val username: String,
    @get:Size(min = 12, max = 255)
    val password: String
)
