package apps.chocolatecakecodes.invidious_ext.download.enums

import io.micronaut.serde.annotation.Serdeable

@Serdeable
enum class TagField {
    TITLE,
    ALBUM,
    ALBUM_ARTIST,
    ARTIST,
    GENRE
}
