package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class InvDataUpdateDto(
    /** unix-time ms */
    val expectedLastSync: Long,
    val hash: String,
    val data: String
)
