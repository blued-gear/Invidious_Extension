package apps.chocolatecakecodes.invidious_ext.download.enums

import io.micronaut.serde.annotation.Serdeable

@Serdeable
enum class FileType(
    val supportTags: Boolean
) {
    MP3(true),
    VIDEO(false)
}
