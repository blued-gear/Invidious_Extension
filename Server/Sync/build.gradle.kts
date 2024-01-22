import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    val kotlinVersion = "1.9.22"

    id("org.jetbrains.kotlin.jvm") version kotlinVersion
    id("org.jetbrains.kotlin.kapt") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.allopen") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.jpa") version kotlinVersion

    id("io.micronaut.library")
    id("io.micronaut.test-resources")
}

group = "apps.chocolatecakecodes.invidious_ext"
version = "1.1.0"

repositories {
    maven("https://s01.oss.sonatype.org/content/repositories/snapshots/") {
        mavenContent { snapshotsOnly() }
    }
    mavenCentral()
}

dependencies {
    val kotlinVersion = project.properties["kotlinVersion"]

    implementation("org.jetbrains.kotlin:kotlin-reflect:${kotlinVersion}")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:${kotlinVersion}")
    implementation("io.micronaut.kotlin:micronaut-kotlin-extension-functions")
    implementation("io.micronaut.kotlin:micronaut-kotlin-runtime")
    implementation("io.micronaut:micronaut-jackson-databind")
    implementation("io.micronaut.serde:micronaut-serde-jackson")
    implementation("io.micronaut.security:micronaut-security")
    implementation("io.micronaut.data:micronaut-data-hibernate-jpa")
    implementation("io.micronaut.sql:micronaut-jdbc-hikari")
    implementation("io.micronaut.validation:micronaut-validation")
    implementation("jakarta.validation:jakarta.validation-api")
    implementation("io.micronaut.reactor:micronaut-reactor")

    implementation("org.bouncycastle:bcprov-jdk18on:1.76")

    kapt("io.micronaut.security:micronaut-security-annotations")
    kapt("io.micronaut.serde:micronaut-serde-processor")
    kapt("io.micronaut.validation:micronaut-validation-processor")
    kapt("io.micronaut.data:micronaut-data-processor")

    runtimeOnly("com.fasterxml.jackson.module:jackson-module-kotlin")
    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.slf4j:slf4j-simple")

    testImplementation("io.micronaut:micronaut-http-server-netty")
    testImplementation("io.micronaut:micronaut-http-client")
    testImplementation("io.mockk:mockk:1.13.5")
}

java {
    sourceCompatibility = JavaVersion.toVersion(JavaVersion.VERSION_17)
}

tasks {
    compileKotlin {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }
    compileTestKotlin {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }
}

graalvmNative.toolchainDetection.set(false)

micronaut {
    version(project.properties["micronautVersion"] as String)

    importMicronautPlatform.set(true)

    testRuntime("kotest5")

    processing {
        incremental(true)

        module(project.name)
        group(project.group as String)

        annotations("apps.chocolatecakecodes.invidious_ext.*")
    }
}

allOpen {
    annotations(
        "jakarta.inject.Singleton",
        "io.micronaut.http.annotation.Controller",
        "io.micronaut.context.annotation.Factory",
        "io.micronaut.serde.annotation.Serdeable",
        "io.micronaut.core.annotation.Introspected"
    )
}
