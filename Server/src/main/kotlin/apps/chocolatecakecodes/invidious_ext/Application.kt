package apps.chocolatecakecodes.invidious_ext

import io.micronaut.runtime.Micronaut.run
import java.security.Security

fun main(args: Array<String>) {
    // allow maximum crypto strength
    Security.setProperty("crypto.policy", "unlimited")

    run(*args)
}
