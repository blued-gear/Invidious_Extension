package apps.chocolatecakecodes.invidious_ext.download

import apps.chocolatecakecodes.invidious_ext.download.dto.*
import apps.chocolatecakecodes.invidious_ext.download.enums.DownloadJobState
import apps.chocolatecakecodes.invidious_ext.download.enums.FileType
import apps.chocolatecakecodes.invidious_ext.download.enums.TagField
import apps.chocolatecakecodes.invidious_ext.testEndpoint
import io.kotest.assertions.fail
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.micronaut.core.type.Argument
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpStatus
import io.micronaut.http.client.BlockingHttpClient
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.filter.HttpClientFilter
import io.micronaut.security.authentication.AuthenticationProvider
import io.micronaut.security.authentication.AuthenticationResponse
import io.micronaut.test.annotation.MockBean
import io.micronaut.test.extensions.kotest5.annotation.MicronautTest
import reactor.core.publisher.Flux

@MicronautTest(
    rollback = false,
    transactional = false
)
class DownloadControllerTest(
    @Client("/download") private val http: HttpClient
) : AnnotationSpec() {

    // DownloadController requires auth, so mock it
    @MockBean
    fun securityAllowAllChain() = HttpClientFilter { request, chain ->
        request.basicAuth("dummy", "dummy")
        chain.proceed(request)
    }
    @MockBean
    fun securityAllowAllAuth() = AuthenticationProvider<Any> { _, _ ->
        Flux.just(AuthenticationResponse.success("dummy"))
    }

    @Test
    fun canDownloadVideo() {
        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.POST("/", DownloadRequestDto(
                    YoutubeDlpServiceTest.VIDEO_ID,
                    FileType.VIDEO,
                    null
                )),
                Argument.of(DownloadIdDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.ACCEPTED

                val jobId = resp.body()
                jobId shouldNotBe null
                jobId.id.isBlank() shouldBe false

                waitForJobDone(jobId.id, http)

                val extension = http.retrieve("/extension?id=${jobId.id}", FileExtensionDto::class.java)
                extension shouldNotBe null
                extension.extension.isNullOrBlank() shouldBe false

                val file = http.retrieve("/file?id=${jobId.id}", ByteArray::class.java)
                file.size shouldBeGreaterThan 1024
            }
        }
    }

    @Test
    fun canDownloadMp3() {
        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.POST("/", DownloadRequestDto(
                    YoutubeDlpServiceTest.VIDEO_ID,
                    FileType.MP3,
                    arrayOf(TagValueDto(TagField.TITLE, "title"))
                )),
                Argument.of(DownloadIdDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.ACCEPTED

                val jobId = resp.body()
                jobId shouldNotBe null
                jobId.id.isBlank() shouldBe false

                waitForJobDone(jobId.id, http)

                val extension = http.retrieve("/extension?id=${jobId.id}", FileExtensionDto::class.java)
                extension shouldNotBe null
                extension.extension shouldBe "mp3"

                val file = http.retrieve("/file?id=${jobId.id}", ByteArray::class.java)
                file.size shouldBeGreaterThan 1024
            }
        }
    }

    private fun waitForJobDone(jobId: String, http: BlockingHttpClient) {
        while(true) {
            val prog = http.retrieve("/progress?id=$jobId", DownloadProgressDto::class.java)

            prog.id shouldBe jobId

            when(prog.state) {
                DownloadJobState.INIT, DownloadJobState.STARTED -> Thread.sleep(500)
                DownloadJobState.FAILED, DownloadJobState.CANCELLED -> fail("job failed; $prog")
                DownloadJobState.DONE -> return
            }
        }
    }
}
