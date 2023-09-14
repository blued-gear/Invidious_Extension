package apps.chocolatecakecodes.invidious_ext

import com.fasterxml.jackson.databind.ObjectMapper
import io.kotest.assertions.failure
import io.micronaut.http.client.BlockingHttpClient
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.exceptions.HttpClientResponseException
import kotlin.jvm.optionals.getOrElse

fun testEndpoint(http: HttpClient, block: (http: BlockingHttpClient) -> Unit) {
    try {
        block(http.toBlocking())
    } catch(e: HttpClientResponseException) {
        val httpErrMsg = e.response.getBody(String::class.java).getOrElse {
            throw failure("unexpected HttpClientResponseException: $e", e)
        }

        val jackson = ObjectMapper()
        val prettyfier = jackson.writerWithDefaultPrettyPrinter()
        val prettyMsg = prettyfier.writeValueAsString(jackson.readTree(httpErrMsg))

        throw failure("Server returned error: ${e.response.code()} ${e.response.reason()}\n$prettyMsg", e)
    }
}
