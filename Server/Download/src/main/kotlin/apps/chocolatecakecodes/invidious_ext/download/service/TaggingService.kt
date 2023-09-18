package apps.chocolatecakecodes.invidious_ext.download.service

import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadRequestDto
import apps.chocolatecakecodes.invidious_ext.download.dto.TagValueDto
import apps.chocolatecakecodes.invidious_ext.download.enums.TagField
import com.mpatric.mp3agic.ID3v1Genres
import com.mpatric.mp3agic.ID3v2
import com.mpatric.mp3agic.ID3v24Tag
import com.mpatric.mp3agic.Mp3File
import jakarta.inject.Singleton
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlin.io.path.absolutePathString

@Singleton
class TaggingService {

    fun tagFile(path: String, options: DownloadRequestDto) {
        if(options.tags == null)
            throw IllegalArgumentException("tags must not be null")

        val file = Mp3File(path)
        val tag = prepareTag(file)

        options.tags!!.forEach {
            setField(tag, it)
        }

        save(file)
    }

    private fun prepareTag(file: Mp3File): ID3v2 {
        if(file.hasId3v2Tag()) {
            return file.id3v2Tag
        } else {
            val tag = ID3v24Tag()
            file.id3v2Tag = tag
            return tag
        }
    }

    private fun setField(tag: ID3v2, field: TagValueDto) {
        when(field.field) {
            TagField.TITLE -> tag.title = field.value
            TagField.ARTIST -> tag.artist = field.value
            TagField.ALBUM -> tag.album = field.value
            TagField.ALBUM_ARTIST -> tag.albumArtist = field.value
            TagField.GENRE ->{
                tag.genreDescription = field.value

                val genreIdx = ID3v1Genres.matchGenreDescription(field.value)
                if(genreIdx != -1)
                    tag.genre = genreIdx
            }
        }
    }

    private fun save(file: Mp3File) {
        val orgDest = Path.of(file.filename)
        val saveDest = orgDest.parent.resolve("${orgDest.fileName}.swp")

        try {
            file.save(saveDest.absolutePathString())
            Files.move(saveDest, orgDest, StandardCopyOption.REPLACE_EXISTING)
        } catch(e: Exception) {
            try {
                Files.deleteIfExists(saveDest)
            } catch(e2: Exception) {
                e.addSuppressed(e2)
            }

            throw e
        }
    }
}
