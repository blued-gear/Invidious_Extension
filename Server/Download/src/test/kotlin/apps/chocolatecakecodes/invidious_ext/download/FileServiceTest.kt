package apps.chocolatecakecodes.invidious_ext.download

import apps.chocolatecakecodes.invidious_ext.download.repo.SavedFileRepo
import apps.chocolatecakecodes.invidious_ext.download.service.FileService
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.matchers.equals.shouldBeEqual
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldStartWith
import io.micronaut.context.annotation.Value
import io.micronaut.kotlin.context.createBean
import io.micronaut.runtime.EmbeddedApplication
import io.micronaut.test.extensions.kotest5.annotation.MicronautTest
import jakarta.inject.Inject
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.absolutePathString

@MicronautTest(
    rollback = false,
    transactional = false
)
class FileServiceTest(
    @Inject private val app: EmbeddedApplication<*>,
    @Inject private val repo: SavedFileRepo,
    @Value("\${inv-ext.download.dir}") private val dirPath: String
) : AnnotationSpec() {

    private val appCtx = app.applicationContext
    private val dir = Path.of(dirPath)

    @ExperimentalKotest
    override fun concurrency(): Int? {
        return 1
    }

    @Test
    fun canInit() {
        Files.exists(dir) shouldBe false

        val bean = appCtx.createBean<FileService>()

        try {
            Files.exists(dir) shouldBe true
            repo.count() shouldBe 0
        } finally {
            appCtx.destroyBean(bean)
        }
    }

    @Test
    fun canCreateFile() {
        Files.exists(dir) shouldBe false

        val bean = appCtx.createBean<FileService>()

        try {
            val file = bean.newFile()

            Files.list(dir).count() shouldBe 1
            Files.list(dir).findFirst().get().absolutePathString() shouldBeEqual file.path
        } finally {
            appCtx.destroyBean(bean)
        }
    }

    @Test
    fun canCreateFileInSubdir() {
        val subdir = "sub_1"

        Files.exists(dir) shouldBe false

        val bean = appCtx.createBean<FileService>()

        try {
            val file = bean.newFile(subdir)

            file.path shouldStartWith dir.resolve(subdir).absolutePathString()
            Files.list(dir).count() shouldBe 1
            Files.exists(Path.of(file.path)) shouldBe true
        } finally {
            appCtx.destroyBean(bean)
        }
    }

    @Test
    fun canDeinit() {
        val bean = appCtx.createBean<FileService>()

        try {
            bean.newFile()
            bean.newFile("sub")
            Files.list(dir).count() shouldBe 2
        } finally {
            appCtx.destroyBean(bean)

            repo.count() shouldBe 0
            Files.exists(dir) shouldBe false
        }
    }

    @Test
    fun canProvideContent() {
        val content = "test"
        val bean = appCtx.createBean<FileService>()

        try {
            val file = bean.newFile()
            Files.writeString(Path.of(file.path), content)

            bean.getContent(file.publicId).readAllBytes().decodeToString() shouldBe content
        } finally {
            appCtx.destroyBean(bean)
        }
    }

    @Test
    fun canDeleteFile() {
        val bean = appCtx.createBean<FileService>()

        try {
            val file1 = bean.newFile()
            val file2 = bean.newFile()

            Files.list(dir).count() shouldBe 2
            Files.exists(Path.of(file1.path)) shouldBe true
            Files.exists(Path.of(file2.path)) shouldBe true

            bean.deleteFile(file1.publicId)

            Files.list(dir).count() shouldBe 1
            Files.exists(Path.of(file1.path)) shouldBe false
            Files.exists(Path.of(file2.path)) shouldBe true
        } finally {
            appCtx.destroyBean(bean)
        }
    }
}
