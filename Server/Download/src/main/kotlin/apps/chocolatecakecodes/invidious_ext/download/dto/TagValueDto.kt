package apps.chocolatecakecodes.invidious_ext.download.dto

import apps.chocolatecakecodes.invidious_ext.download.enums.TagField
import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.constraints.NotNull

@Serdeable
data class TagValueDto(
    @NotNull
    val field: TagField,
    @NotNull
    val value: String
)
