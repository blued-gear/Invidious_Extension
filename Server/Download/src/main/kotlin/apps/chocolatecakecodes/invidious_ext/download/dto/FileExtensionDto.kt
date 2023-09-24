package apps.chocolatecakecodes.invidious_ext.download.dto

import io.micronaut.serde.annotation.Serdeable
import jakarta.annotation.Nullable

@Serdeable
data class FileExtensionDto(
    @Nullable
    val extension: String?
)
