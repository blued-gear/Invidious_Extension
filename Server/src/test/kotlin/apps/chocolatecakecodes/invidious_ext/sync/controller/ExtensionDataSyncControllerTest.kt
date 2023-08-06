package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.DataPostDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.DataPutDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.KeyWithSyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import apps.chocolatecakecodes.invidious_ext.sync.repo.ExtensionDataRepo
import apps.chocolatecakecodes.invidious_ext.sync.repo.UserRepo
import apps.chocolatecakecodes.invidious_ext.sync.service.ExtensionDataService
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import apps.chocolatecakecodes.invidious_ext.testEndpoint
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.Spec
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.core.test.TestCase
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
class ExtensionDataSyncControllerTest(
    @Client("/sync/extension") private val http: HttpClient,
    @Inject private val userRepo: UserRepo,
    @Inject private val userService: UserService,
    @Inject private val entryRepo: ExtensionDataRepo,
    @Inject private val entryService: ExtensionDataService
) : AnnotationSpec() {

    companion object {
        private const val username = "test_user"
        private const val password = "7787z876tzui96zth3efg"
    }

    private lateinit var user: User
    private val keysWithData = listOf("k-1", "k-2", "k-3").associateWith { "$it:data" }

    @ExperimentalKotest
    override fun concurrency(): Int? {
        return 1
    }

    override suspend fun beforeSpec(spec: Spec) {
        super.beforeSpec(spec)

        withContext(Dispatchers.IO) {
            entryRepo.deleteAll()
            userRepo.deleteAll()

            user = userService.addNewUser(username, password)
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
        val expectedKeysWithTime = addTestEntries()

        expectedKeysWithTime.size shouldBe keysWithData.size

        val now = Instant.now().toEpochMilli()
        expectedKeysWithTime.forEach {
            it.syncTime shouldBeLessThan now
        }

        expectedKeysWithTime.map {
            it.key
        }.toSet() shouldBe keysWithData.keys
    }

    @Test
    fun canListAllKeys() {
        val expectedKeysWithTime = addTestEntries()

        testEndpoint(http) { http ->
            val resp = http.exchange(
                HttpRequest.GET<Void>("/allKeys").apply { basicAuth(username, password) },
                //Argument.STRING
                Argument.listOf(KeyWithSyncTimeDto::class.java)
            )

            resp.status() shouldBe HttpStatus.OK

            val respVal = resp.body()
            respVal shouldBe expectedKeysWithTime
        }
    }

    @Test
    fun canGetLastSyncTimes() {
        val expectedKeysWithTime = addTestEntries()
        val keyToTime = expectedKeysWithTime.associate {
            it.key to it.syncTime
        }

        testEndpoint(http) { http ->
            keysWithData.keys.forEach { key ->
                val resp = http.exchange(
                    HttpRequest.GET<Void>("/entry/$key/lastSyncTime").apply { basicAuth(username, password) },
                    Argument.of(SyncTimeDto::class.java)
                )

                resp.status shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null

                respVal.time shouldBe keyToTime[key]
            }
        }
    }

    @Test
    fun canGetData() {
        addTestEntries()

        testEndpoint(http) { http ->
            keysWithData.forEach { (key, data) ->
                val resp = http.exchange(
                    HttpRequest.GET<Void>("/entry/$key/data").apply { basicAuth(username, password) },
                    Argument.STRING
                )

                resp.status shouldBe HttpStatus.OK
                resp.contentType.getOrNull() shouldBe MediaType.TEXT_PLAIN_TYPE

                val respVal = resp.body()
                respVal shouldNotBe null
                respVal shouldBe data
            }
        }
    }
    
    @Test
    fun canCreateEntries() {
        testEndpoint(http) { http ->
            val startTime = Instant.now().toEpochMilli()

            keysWithData.forEach { (key, data) ->
                val resp = http.exchange(
                    HttpRequest.POST("/entry/$key/data", DataPostDto(data)).apply { basicAuth(username, password) },
                    Argument.of(KeyWithSyncTimeDto::class.java)
                )

                resp.status shouldBe HttpStatus.CREATED

                val respVal = resp.body()
                respVal shouldNotBe null

                val endTime = Instant.now().toEpochMilli()
                respVal.syncTime shouldBeGreaterThan startTime
                respVal.syncTime shouldBeLessThan endTime

                respVal.key shouldBe key
            }

            // check if really written
            keysWithData.keys.forEach { key ->
                val resp = http.exchange(
                    HttpRequest.GET<Void>("/entry/$key/data").apply { basicAuth(username, password) },
                    Argument.STRING
                )

                resp.status shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null
                respVal shouldBe keysWithData[key]
            }
        }
    }

    @Test
    fun canDetectCreateConflict() {
        addTestEntries()

        val key = keysWithData.keys.random()

        testEndpoint(http) { http ->
            shouldThrow<HttpClientResponseException> {
                http.retrieve(
                    HttpRequest.POST("/entry/$key/data", DataPostDto("something else")).apply {
                        basicAuth(username, password) },
                    Argument.VOID, Argument.VOID
                )
            }.let { err ->
                err.status shouldBe HttpStatus.CONFLICT
            }

            // check that not written
            http.exchange(
                HttpRequest.GET<Void>("/entry/$key/data").apply { basicAuth(username, password) },
                Argument.STRING
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK
                resp.body() shouldBe keysWithData[key]
            }
        }
    }
    
    @Test
    fun canUpdateEntry() {
        val keyWithTime = addTestEntries().associate { it.key to it.syncTime }

        val key = keysWithData.keys.random()
        val newData = "changed"

        val startTime = Instant.now().toEpochMilli()
        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.PUT("/entry/$key/data", DataPutDto(
                    keyWithTime[key]!!,
                    newData
                )).apply { basicAuth(username, password) },
                Argument.of(SyncTimeDto::class.java)
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null

                val endTime = Instant.now().toEpochMilli()
                respVal.time shouldBeGreaterThan  startTime
                respVal.time shouldBeLessThan endTime
            }

            // check if really written
            http.exchange(
                HttpRequest.GET<Void>("/entry/$key/data").apply { basicAuth(username, password) },
                Argument.STRING
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK
                resp.body() shouldBe newData
            }
        }
    }

    @Test
    fun canDetectUpdateOutOfSync() {
        val keyWithTime = addTestEntries().associate { it.key to it.syncTime }

        val key = keysWithData.keys.random()
        val newData = "changed"
        val expectedLastSync = keyWithTime[key]!! - 1000

        testEndpoint(http) { http ->
            shouldThrow<HttpClientResponseException> {
                http.retrieve(
                    HttpRequest.PUT("/entry/$key/data", DataPutDto(
                        expectedLastSync,
                        newData
                    )).apply { basicAuth(username, password) },
                    Argument.of(SyncTimeDto::class.java)
                )
            }.let { err ->
                err.status shouldBe HttpStatus.PRECONDITION_FAILED
            }

            // check that not written
            http.exchange(
                HttpRequest.GET<Void>("/entry/$key/data").apply { basicAuth(username, password) },
                Argument.STRING
            ).let { resp ->
                resp.status shouldBe HttpStatus.OK
                resp.body() shouldBe keysWithData[key]
            }
        }
    }
    
    @Test
    fun canDeleteEntry() {
        addTestEntries()

        val key = keysWithData.keys.random()

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.DELETE<Void>("/entry/$key").apply { basicAuth(username, password) },
                Argument.VOID
            ).let { resp ->
                resp.status() shouldBe HttpStatus.NO_CONTENT
            }

            http.exchange(
                HttpRequest.GET<Void>("/allKeys").apply { basicAuth(username, password) },
                Argument.listOf(KeyWithSyncTimeDto::class.java)
            ).let { resp ->
                resp.status() shouldBe HttpStatus.OK

                val respVal = resp.body()
                respVal shouldNotBe null

                respVal.size shouldBe keysWithData.size - 1
                respVal.find { it.key == key } shouldBe null
            }
        }
    }

    @Test
    fun retrievesOnlyFromCurrentUser() {
        addTestEntries()

        val username = "user-2"
        val password = "987412365"
        val key = "aKey"

        userService.addNewUser(username, password)

        testEndpoint(http) { http ->
            http.retrieve(
                HttpRequest.POST("/entry/$key/data", DataPostDto("data")).apply { basicAuth(username, password) },
                Argument.of(KeyWithSyncTimeDto::class.java)
            )

            val entries = http.retrieve(
                HttpRequest.GET<Void>("/allKeys").apply { basicAuth(username, password) },
                Argument.listOf(KeyWithSyncTimeDto::class.java)
            )

            entries.size shouldBe 1
            entries[0]!!.key shouldBe key
        }
    }
    
    private fun addTestEntries(): List<KeyWithSyncTimeDto> {
        return keysWithData.map { (key, data) ->
            entryService.addData(user, key, DataPostDto(data))
        }
    }
}
