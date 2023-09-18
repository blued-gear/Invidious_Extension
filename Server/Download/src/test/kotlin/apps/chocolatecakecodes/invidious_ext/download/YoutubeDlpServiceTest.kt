package apps.chocolatecakecodes.invidious_ext.download

import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadRequestDto
import apps.chocolatecakecodes.invidious_ext.download.enums.DownloadJobState
import apps.chocolatecakecodes.invidious_ext.download.enums.FileType
import apps.chocolatecakecodes.invidious_ext.download.service.FileService
import apps.chocolatecakecodes.invidious_ext.download.service.YoutubeDlpService
import apps.chocolatecakecodes.invidious_ext.download.service.exception.JobNotFoundException
import com.mpatric.mp3agic.Mp3File
import io.kotest.assertions.fail
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.floats.shouldBeGreaterThanOrEqual
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.longs.shouldBeGreaterThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.micronaut.context.annotation.Value
import io.micronaut.test.extensions.kotest5.annotation.MicronautTest
import jakarta.inject.Inject
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.absolute

@Suppress("BlockingMethodInNonBlockingContext")
@MicronautTest(
    rollback = false,
    transactional = false
)
class YoutubeDlpServiceTest(
    @Inject val service: YoutubeDlpService,
    @Inject val fileService: FileService,
    @Value("\${inv-ext.download.dir}") private val dirPath: String
) : AnnotationSpec() {

    companion object {
        const val VIDEO_ID = "4TlyzKBm5yw"
    }

    private val downloadDir = Path.of(dirPath, "running").absolute()

    @Test
    suspend fun canDownloadVideo() {
        val options = DownloadRequestDto(VIDEO_ID, FileType.VIDEO, null)
        val file = fileService.newFile()

        try {
            val done = CompletableDeferred<Unit>(null)
            var errInListener = false

            val listener = object : YoutubeDlpService.JobProgressListener {

                private var lastProg = 0.0f

                override fun onUpdate(state: DownloadJobState, progress: Float) {
                    if(progress < lastProg) {
                        errInListener = true
                        progress shouldBeGreaterThanOrEqual lastProg
                    }
                    lastProg = progress

                    if(state == DownloadJobState.FAILED || state == DownloadJobState.CANCELLED)
                        done.completeExceptionally(IllegalStateException("job finished with state $state"))
                }
                override fun onDone(fileExtension: String) {
                    done.complete(Unit)
                    listOf("mp4", "mkv", "webm", "avi") shouldContain fileExtension
                }
            }

            val jobId = service.startJob(options, file.path, listener)
            jobId.isBlank() shouldBe false

            done.await()
            delay(200)// give the service a bit time to clean up

            errInListener shouldBe false
            shouldThrow<JobNotFoundException> {
                service.cancelJob(jobId)
            }
            Files.list(downloadDir).count() shouldBe 0

            Files.size(Path.of(file.path)) shouldBeGreaterThan 1024
        } finally {
            fileService.deleteFile(file.publicId)
        }
    }

    @Test
    suspend fun canDownloadMp3() {
        val options = DownloadRequestDto(VIDEO_ID, FileType.MP3, null)
        val file = fileService.newFile()

        try {
            val done = CompletableDeferred<Unit>(null)
            var errInListener = false

            val listener = object : YoutubeDlpService.JobProgressListener {

                private var lastProg = 0.0f

                override fun onUpdate(state: DownloadJobState, progress: Float) {
                    if(progress < lastProg) {
                        errInListener = true
                        progress shouldBeGreaterThanOrEqual lastProg
                    }
                    lastProg = progress

                    if(state == DownloadJobState.FAILED || state == DownloadJobState.CANCELLED)
                        done.completeExceptionally(IllegalStateException("job finished with state $state"))
                }
                override fun onDone(fileExtension: String) {
                    done.complete(Unit)
                    fileExtension shouldBe "mp3"
                }
            }

            val jobId = service.startJob(options, file.path, listener)
            jobId.isBlank() shouldBe false

            done.await()
            delay(200)// give the service a bit time to clean up

            shouldThrow<JobNotFoundException> {
                service.cancelJob(jobId)
            }
            Files.list(downloadDir).count() shouldBe 0

            Files.size(Path.of(file.path)) shouldBeGreaterThan 1024

            val tagger = Mp3File(File(file.path))
            tagger.lengthInMilliseconds shouldBeGreaterThan 50
            tagger.id3v2Tag.albumImage.let {
                it shouldNotBe null
                it.size shouldBeGreaterThan 128
            }
        } finally {
            fileService.deleteFile(file.publicId)
        }
    }

    @Test
    suspend fun canCancel() {
        val options = DownloadRequestDto(VIDEO_ID, FileType.VIDEO, null)
        val file = fileService.newFile()

        try {
            val done = CompletableDeferred<Unit>(null)

            val listener = object : YoutubeDlpService.JobProgressListener {
                override fun onUpdate(state: DownloadJobState, progress: Float) {
                    if(state == DownloadJobState.CANCELLED)
                        done.complete(Unit)
                    if(state == DownloadJobState.FAILED)
                        done.completeExceptionally(IllegalStateException("job finished with state $state"))
                }
                override fun onDone(fileExtension: String) {
                    fail("should not be reached")
                }
            }

            val jobId = service.startJob(options, file.path, listener)
            jobId.isBlank() shouldBe false

            service.cancelJob(jobId)
            done.await()
            delay(200)// give the service a bit time to clean up

            shouldThrow<JobNotFoundException> {
                service.cancelJob(jobId)
            }
            Files.list(downloadDir).count() shouldBe 0

            Files.size(Path.of(file.path)) shouldBe 0
        } finally {
            fileService.deleteFile(file.publicId)
        }
    }
}
