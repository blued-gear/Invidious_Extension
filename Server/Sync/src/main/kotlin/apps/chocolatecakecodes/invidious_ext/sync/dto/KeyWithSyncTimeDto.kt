package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class KeyWithSyncTimeDto(
    val key: String,
    /** unix-time ms */
    val syncTime: Long
)
