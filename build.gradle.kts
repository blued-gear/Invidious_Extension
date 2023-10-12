import com.github.benmanes.gradle.versions.updates.DependencyUpdatesTask
import java.util.*

plugins {
    id("com.github.ben-manes.versions") version "0.49.0"
}

group = "apps.chocolatecakecodes.invidious_ext"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {

}

tasks.withType<DependencyUpdatesTask>().configureEach {
    rejectVersionIf {
        listOf("ALPHA", "BETA", "RC", "EAP", "-JRE").any{ keyword ->
            this.candidate.version.uppercase(Locale.getDefault()).contains(keyword) }
    }
}
