package apps.chocolatecakecodes.invidious_ext.download.dto

import apps.chocolatecakecodes.invidious_ext.download.enums.FileType
import io.micronaut.serde.annotation.Serdeable
import jakarta.annotation.Nullable
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

@Serdeable
data class DownloadRequestDto(
    @NotNull
    @NotBlank
    val videoId: String,
    @NotNull
    val destType: FileType,
    @Nullable
    val tags: Array<TagValueDto>?
) {

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as DownloadRequestDto

        if (videoId != other.videoId) return false
        if (destType != other.destType) return false
        if (!tags.contentEquals(other.tags)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = videoId.hashCode()
        result = 31 * result + destType.hashCode()
        result = 31 * result + tags.contentHashCode()
        return result
    }
}
