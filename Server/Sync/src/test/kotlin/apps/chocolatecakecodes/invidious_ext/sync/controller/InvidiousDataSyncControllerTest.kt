package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.DataGetDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.InvDataUpdateDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeWithHashDto
import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import apps.chocolatecakecodes.invidious_ext.sync.repo.InvidiousDataRepo
import apps.chocolatecakecodes.invidious_ext.sync.repo.UserRepo
import apps.chocolatecakecodes.invidious_ext.sync.service.InvidiousDataService
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import apps.chocolatecakecodes.invidious_ext.testEndpoint
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.Spec
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.core.test.TestCase
import io.kotest.matchers.equals.shouldBeEqual
import io.kotest.matchers.longs.shouldBeGreaterThan
import io.kotest.matchers.longs.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.micronaut.core.type.Argument
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpStatus
import io.micronaut.http.MediaType
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.client.exceptions.HttpClientResponseException
import io.micronaut.http.hateoas.JsonError
import io.micronaut.test.extensions.kotest5.annotation.MicronautTest
import jakarta.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import kotlin.jvm.optionals.getOrNull

@MicronautTest(
    rollback = false,
    transactional = false
)
class InvidiousDataSyncControllerTest(
    @Client("/sync/invidious") private val http: HttpClient,
    @Inject private val userRepo: UserRepo,
    @Inject private val userService: UserService,
    @Inject private val entryRepo: InvidiousDataRepo,
    @Inject private val entryService: InvidiousDataService
) : AnnotationSpec() {

    companion object {
        private const val USERNAME = "test_user"
        private const val PASSWORD = "7787z876tzui96zth3efg"
        private const val EXAMPLE_HASH = "~hash~"
        private const val EXAMPLE_DATA = "~data~"
    }

    private lateinit var user: User

    @ExperimentalKotest
    override fun concurrency(): Int? {
        return 1
    }

    override suspend fun beforeSpec(spec: Spec) {
        super.beforeSpec(spec)

        withContext(Dispatchers.IO) {
            entryRepo.deleteAll()
            userRepo.deleteAll()

            user = userService.addNewUser(USERNAME, PASSWORD)
        }
    }

    override suspend fun afterSpec(spec: Spec) {
        super.afterSpec(spec)

        withContext(Dispatchers.IO) {
            entryRepo.deleteAll()
            userRepo.deleteAll()
        }
    }

    override suspend fun beforeTest(testCase: TestCase) {
        super.beforeEach(testCase)

        withContext(Dispatchers.IO) {
            entryRepo.deleteAll()
        }
    }

    @Test
    fun canAddNewKeysCorrectly() {
        val expectedTime = addTestData()

        val now = Instant.now().toEpochMilli()
        expectedTime.time shouldBeLessThan now
    }

    @Test
    fun canGetLastSyncTime() {
        val expectedTime = addTestData()

        testEndpoint(http) { http ->
            val resp = http.exchange(
                HttpRequest.GET<Void>("/lastSyncTime").apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(SyncTimeWithHashDto::class.java)
            )

            resp.status shouldBe HttpStatus.OK

            val respVal = resp.body()
            respVal shouldNotBe null

            respVal.syncTime shouldBe expectedTime.time
            respVal.hash shouldBe EXAMPLE_HASH
        }
    }

    @Test
    fun canGetData() {
        addTestData()

        testEndpoint(http) { http ->
            val resp = http.exchange(
                HttpRequest.GET<Void>("/data").apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(DataGetDto::class.java)
            )

            resp.status shouldBe HttpStatus.OK
            resp.contentType.getOrNull() shouldBe MediaType.APPLICATION_JSON_TYPE

            val respVal = resp.body()
            respVal shouldNotBe null
            respVal.data shouldBe EXAMPLE_DATA
        }
    }

    @Test
    fun canCreateData() {
        val newData = "changed_data"
        val newHash = "changed_hash"

        val startTime = Instant.now().toEpochMilli()
        var savedTime: SyncTimeDto? = null

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.PUT("/data", InvDataUpdateDto(
                    -1,
                    newHash,
                    newData
                )).apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(SyncTimeDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null

                val endTime = Instant.now().toEpochMilli()
                respVal.time shouldBeGreaterThan  startTime
                respVal.time shouldBeLessThan endTime

                savedTime = respVal
            }

            // check if really written
            verifyData(savedTime!!.time, newHash, newData)
        }
    }

    @Test
    fun canUpdateData() {
        val newData = "changed_data"
        val newHash = "changed_hash"

        val startTime = Instant.now().toEpochMilli()
        val initialTime = addTestData()
        var savedTime: SyncTimeDto? = null

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.PUT("/data", InvDataUpdateDto(
                    initialTime.time,
                    newHash,
                    newData
                )).apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(SyncTimeDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null

                val endTime = Instant.now().toEpochMilli()
                respVal.time shouldBeGreaterThan  startTime
                respVal.time shouldBeLessThan endTime

                savedTime = respVal
            }

            // check if really written
            verifyData(savedTime!!.time, newHash, newData)
        }
    }

    @Test
    fun canDetectUpdateOutOfSync() {
        val newData = "changed_data"
        val newHash = "changed_hash"

        val expectedLastSync = addTestData()

        testEndpoint(http) { http ->
            shouldThrow<HttpClientResponseException> {
                http.retrieve(
                    HttpRequest.PUT("/data", InvDataUpdateDto(
                        expectedLastSync.time - 1000,
                        newHash,
                        newData
                    )).apply { basicAuth(USERNAME, PASSWORD) },
                    Argument.of(SyncTimeDto::class.java)
                )
            }.let { err ->
                err.status shouldBe HttpStatus.PRECONDITION_FAILED
            }

            // check that not written
            verifyData(expectedLastSync.time, EXAMPLE_HASH, EXAMPLE_DATA)
        }
    }

    @Test
    fun canDeleteEntry() {
        addTestData()

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.DELETE<Void>("/data").apply { basicAuth(USERNAME, PASSWORD) },
                Argument.VOID
            ).let { resp ->
                resp.status() shouldBe HttpStatus.NO_CONTENT
            }

            http.exchange(
                HttpRequest.GET<Void>("/lastSyncTime").apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(JsonError::class.java)
            ).let { resp ->
                resp.status() shouldBe HttpStatus.NOT_FOUND
            }
        }
    }

    @Test
    fun retrievesOnlyFromCurrentUser() {
        addTestData()

        val username = "user-2"
        val password = "987412365"
        val hash = "hash:${username}"

        userService.addNewUser(username, password)

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.GET<Void>("/lastSyncTime").apply { basicAuth(username, password) },
                Argument.of(JsonError::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.NOT_FOUND
            }

            http.retrieve(
                HttpRequest.PUT("/data", InvDataUpdateDto(
                    -1,
                    hash,
                    "data"
                )).apply { basicAuth(username, password) },
                Argument.of(SyncTimeDto::class.java)
            )

            val entries = http.retrieve(
                HttpRequest.GET<Void>("/lastSyncTime").apply { basicAuth(username, password) },
                Argument.of(SyncTimeWithHashDto::class.java)
            )

            entries.hash shouldBe hash
        }
    }

    private fun verifyData(expectedTime: Long, expectedHash: String, expectedData: String) {
        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.GET<Void>("/lastSyncTime").apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(SyncTimeWithHashDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null

                respVal.syncTime shouldBe expectedTime
                respVal.hash shouldBeEqual expectedHash
            }

            http.exchange(
                HttpRequest.GET<Void>("/data").apply { basicAuth(USERNAME, PASSWORD) },
                Argument.of(DataGetDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK
                resp.body()?.data shouldBe expectedData
            }
        }
    }
    
    private fun addTestData(): SyncTimeDto {
        return entryService.updateData(user, InvDataUpdateDto(
            -1,
            EXAMPLE_HASH,
            EXAMPLE_DATA
        ))
    }
}
