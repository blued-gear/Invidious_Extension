package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class DataPutDto(
    /** unix-time ms */
    val expectedLastSync: Long,
    val data: String
)
