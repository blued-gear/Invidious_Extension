package apps.chocolatecakecodes.invidious_ext.sync.dto

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class DataPutDto(
    /** unix-time ms */
    val expectedLastSync: Long,
    /** if true the data will be written, even if there is a conflict */
    val force: Boolean,
    val data: String
)
