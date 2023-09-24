package apps.chocolatecakecodes.invidious_ext.download.dto

import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.constraints.NotNull

@Serdeable
data class DownloadIdDto(
    @NotNull
    val id: String
)
