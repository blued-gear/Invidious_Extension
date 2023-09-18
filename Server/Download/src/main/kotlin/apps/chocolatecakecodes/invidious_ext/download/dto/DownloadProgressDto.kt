package apps.chocolatecakecodes.invidious_ext.download.dto

import apps.chocolatecakecodes.invidious_ext.download.enums.DownloadJobState
import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

@Serdeable
data class DownloadProgressDto(
    @NotNull
    @NotBlank
    val id: String,
    @NotNull
    val state: DownloadJobState,
    /** progress between 0.0 and 1.0 */
    @NotNull
    val progress: Float
)
