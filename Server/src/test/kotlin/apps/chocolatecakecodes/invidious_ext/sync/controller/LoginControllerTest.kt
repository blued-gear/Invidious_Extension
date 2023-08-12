package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.KeyWithSyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.RegistrationPayload
import apps.chocolatecakecodes.invidious_ext.sync.repo.UserRepo
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import apps.chocolatecakecodes.invidious_ext.testEndpoint
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.Spec
import io.kotest.core.spec.style.AnnotationSpec
import io.kotest.core.spec.style.Test
import io.kotest.core.test.TestCase
import io.kotest.matchers.shouldBe
import io.micronaut.core.type.Argument
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpStatus
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.client.exceptions.HttpClientResponseException
import io.micronaut.http.hateoas.JsonError
import io.micronaut.test.extensions.kotest5.annotation.MicronautTest
import jakarta.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@MicronautTest(
    rollback = false,
    transactional = false
)
class LoginControllerTest(
    @Client("/") private val http: HttpClient,
    @Inject private val userService: UserService,
    @Inject private val userRepo: UserRepo
) : AnnotationSpec() {

    override suspend fun beforeTest(testCase: TestCase) {
        super.beforeEach(testCase)

        withContext(Dispatchers.IO) {
            userRepo.deleteAll()
        }
    }

    override suspend fun afterSpec(spec: Spec) {
        super.afterSpec(spec)

        withContext(Dispatchers.IO) {
            userRepo.deleteAll()
        }
    }

    @Test
    fun anonymousRequestShouldBeBlockedFromSyncEndpoints() {
        http.toBlocking().let { http ->
            http.exchange("/sync/extension/entry/ABC/lastSyncTime", JsonError::class.java).let {
                it.status shouldBe HttpStatus.UNAUTHORIZED
            }
            http.exchange("/sync/extension/entry/ABC/data", JsonError::class.java).let {
                it.status shouldBe HttpStatus.UNAUTHORIZED
            }
            http.exchange("/sync/extension/allKeys", JsonError::class.java).let {
                it.status shouldBe HttpStatus.UNAUTHORIZED
            }
            http.exchange(HttpRequest.POST("/sync/extension/entry/create", ""), JsonError::class.java).let {
                it.status shouldBe HttpStatus.UNAUTHORIZED
            }
            http.exchange(HttpRequest.PUT("/sync/extension/entry/ABC/data", ""), JsonError::class.java).let {
                it.status shouldBe HttpStatus.UNAUTHORIZED
            }
            http.exchange(HttpRequest.DELETE<Void>("/sync/extension/entry/ABC"), JsonError::class.java).let {
                it.status shouldBe HttpStatus.UNAUTHORIZED
            }
        }
    }

    @Test
    fun canRegisterUser() {
        val name = "user-1"
        val pass = "6fc buertzu6765rdc7"

        testEndpoint(http) { http ->
            http.exchange(HttpRequest.POST("/user/register", RegistrationPayload(name, pass)), Argument.VOID).let {
                it.status shouldBe HttpStatus.CREATED
            }

            HttpRequest.GET<Void>("/sync/extension/allKeys").apply {
                basicAuth(name, pass)
            }.let { req ->
                http.exchange(req, Argument.listOf(KeyWithSyncTimeDto::class.java)).let {
                    it.status shouldBe HttpStatus.OK
                    it.body().isEmpty() shouldBe true
                }
            }
        }
    }

    @Test
    fun canNotRegisterUserTwice() {
        val name = "user-1"
        val pass = "6fc buertzu6765rdc7"

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.POST("/user/register", RegistrationPayload(name, pass)),
                Argument.VOID, Argument.VOID
            ).let {
                it.status shouldBe HttpStatus.CREATED
            }

            shouldThrow<HttpClientResponseException> {
                http.retrieve(
                    HttpRequest.POST("/user/register", RegistrationPayload(name, pass)),
                    Argument.VOID, Argument.VOID
                )
            }.let { err ->
                err.status shouldBe HttpStatus.CONFLICT
            }
        }
    }

    @Test
    fun testLoginNoLogin() {
        testEndpoint(http) { http ->
            shouldThrow<HttpClientResponseException> {
                http.retrieve("/user/testLogin")
            }.let { err ->
                err.status shouldBe HttpStatus.UNAUTHORIZED
            }
        }
    }

    @Test
    fun testLoginInvalidLogin() {
        val name = "user-1"
        val pass = "6fc buertzu6765rdc7"

        testEndpoint(http) { http ->
            shouldThrow<HttpClientResponseException> {
                http.retrieve(HttpRequest.GET<Void>("/user/testLogin").apply { basicAuth(name, pass) })
            }.let { err ->
                err.status shouldBe HttpStatus.UNAUTHORIZED
            }
        }
    }

    @Test
    fun testLoginWithLogin() {
        val name = "user-1"
        val pass = "6fc buertzu6765rdc7"

        userService.addNewUser(name, pass)

        testEndpoint(http) { http ->
            http.exchange(
                HttpRequest.GET<Void>("/user/testLogin").apply { basicAuth(name, pass) },
                Argument.VOID
            ).let { resp ->
                resp.status shouldBe HttpStatus.NO_CONTENT
            }
        }
    }
}
