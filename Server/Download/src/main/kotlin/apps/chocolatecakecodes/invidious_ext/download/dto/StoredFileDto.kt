package apps.chocolatecakecodes.invidious_ext.download.dto

import jakarta.validation.constraints.NotNull

data class StoredFileDto(
    @NotNull
    val publicId: String,

    @NotNull
    val path: String
)
