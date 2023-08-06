package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class SyncTimeDto(
    /** unix-time ms */
    val time: Long
)
