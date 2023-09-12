package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class SyncTimeWithHashDto(
    /** unix-time ms */
    val syncTime: Long,
    val hash: String
)
