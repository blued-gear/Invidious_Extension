package apps.chocolatecakecodes.invidious_ext.download

import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadRequestDto
import apps.chocolatecakecodes.invidious_ext.download.dto.StoredFileDto
import apps.chocolatecakecodes.invidious_ext.download.dto.TagValueDto
import apps.chocolatecakecodes.invidious_ext.download.enums.FileType
import apps.chocolatecakecodes.invidious_ext.download.enums.TagField
import apps.chocolatecakecodes.invidious_ext.download.service.FileService
import apps.chocolatecakecodes.invidious_ext.download.service.TaggingService
import com.mpatric.mp3agic.ID3v1Genres
import com.mpatric.mp3agic.Mp3File
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.micronaut.test.extensions.kotest5.annotation.MicronautTest
import jakarta.inject.Inject
import java.nio.file.Files
import java.nio.file.Path

@MicronautTest(
    rollback = false,
    transactional = false
)
class TaggingServiceTest(
    @Inject private val service: TaggingService,
    @Inject private val fileService: FileService
) : AnnotationSpec() {

    private val testfile = javaClass.getResource("/testfiles/taggable.mp3")!!

    @Test
    fun canWriteTags() {
        val file = prepareInpFile()

        val title = "Title"
        val genre = "Instrumental"
        val artist = "Artist"
        val album = "Album"
        val albumArtist = "Album Artist"

        try {
            service.tagFile(file.path, DownloadRequestDto("", FileType.MP3, arrayOf(
                TagValueDto(TagField.TITLE, title),
                TagValueDto(TagField.GENRE, genre),
                TagValueDto(TagField.ARTIST, artist),
                TagValueDto(TagField.ALBUM, album),
                TagValueDto(TagField.ALBUM_ARTIST, albumArtist)
            )))

            // verify
            val tagger = Mp3File(file.path)
            val tag = tagger.id3v2Tag

            tag shouldNotBe null
            tag.title shouldBe title
            tag.artist shouldBe artist
            tag.album shouldBe album
            tag.albumArtist shouldBe albumArtist
            tag.genreDescription shouldBe genre
            tag.genre shouldBe ID3v1Genres.matchGenreDescription(genre)
        } finally {
            fileService.deleteFile(file.publicId)
        }
    }

    private fun prepareInpFile(): StoredFileDto {
        val file = fileService.newFile()

        Files.newOutputStream(Path.of(file.path)).use { out ->
            testfile.openStream().use {  inp ->
                inp.transferTo(out)
            }
        }

        return file
    }
}
