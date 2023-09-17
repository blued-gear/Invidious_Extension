package apps.chocolatecakecodes.invidious_ext.download.service

import apps.chocolatecakecodes.invidious_ext.download.entity.SavedFile
import apps.chocolatecakecodes.invidious_ext.download.repo.SavedFileRepo
import apps.chocolatecakecodes.invidious_ext.download.service.exception.FileNotFoundException
import apps.chocolatecakecodes.invidious_ext.download.util.PathUtils
import io.micronaut.context.annotation.Value
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import jakarta.inject.Inject
import jakarta.inject.Singleton
import jakarta.transaction.Transactional
import java.io.InputStream
import java.nio.file.FileAlreadyExistsException
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.Instant
import java.util.*
import kotlin.io.path.absolutePathString

@Singleton
class FileService(
    @Inject private val repo: SavedFileRepo,
    @Value("\${inv-ext.download.dir}") private val dirPath: String
) {

    companion object {
        const val PUBLIC_ID_BITS = 256

        private val PUBLIC_ID_FORMATTER = HexFormat.of()
    }

    private val dir = Path.of(dirPath)
    private val idRng = Random()

    @Transactional
    fun newFile(): SavedFile {
        val fileWithId = allocFile()
    fun newFile(subdir: String? = null): StoredFileDto {
        val fileWithId = allocFile(subdir)

        val entity = repo.save(SavedFile(
            0,
            fileWithId.second,
            Instant.now(),
            fileWithId.first
        ))

        return StoredFileDto(entity.publicId, entity.path)
    }

    fun getContent(publicId: String): InputStream {
        val entry = repo.findByPublicId(publicId).orElseThrow {
            FileNotFoundException(publicId)
        }
        return Files.newInputStream(Path.of(entry.path))
    }

    fun deleteFile(publicId: String) {
        val entry = repo.findByPublicId(publicId).orElseThrow {
            FileNotFoundException(publicId)
        }

        deleteFile(entry)
    }

    @PostConstruct
    private fun initDir() {
        clearFiles()
        Files.createDirectories(dir)
    }

    @PreDestroy
    @Transactional
    private fun clearFiles() {
        repo.deleteAll()
        PathUtils.deleteFileTree(dir, true)
    }

    private fun deleteFile(entity: SavedFile) {
        Files.deleteIfExists(Path.of(entity.path))
        repo.delete(entity)
    }

    /**
     * @return Pair<path, publicId>
     */
    private fun allocFile(subdir: String?): Pair<String, String> {
        val idBytes = ByteArray(PUBLIC_ID_BITS / 8)
        val subdirPath = if(subdir != null) dir.resolve(subdir) else dir

        Files.createDirectories(subdirPath)

        while(true) {
            idRng.nextBytes(idBytes)
            val name = PUBLIC_ID_FORMATTER.formatHex(idBytes)
            val path = subdirPath.resolve(name)

            if(!Files.exists(path)) {
                try {
                    Files.createFile(path)
                } catch (ignored: FileAlreadyExistsException) {
                    continue
                }

                val pathStr = path.absolutePathString()
                val digest = MessageDigest.getInstance("SHA-${PUBLIC_ID_BITS}")
                val hash = digest.digest(pathStr.toByteArray())
                val id = PUBLIC_ID_FORMATTER.formatHex(hash)

                return Pair(pathStr, id)
            }
        }
    }
}
