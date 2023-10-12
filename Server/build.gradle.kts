import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    val kotlinVersion = "1.9.10"
    val micronautVersion = "4.1.1"

    id("org.jetbrains.kotlin.jvm") version kotlinVersion
    id("org.jetbrains.kotlin.kapt") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.allopen") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.jpa") version kotlinVersion

    id("io.micronaut.application") version micronautVersion
    id("io.micronaut.test-resources") version micronautVersion
    id("io.micronaut.aot") version micronautVersion

    id("com.github.johnrengelman.shadow") version "8.1.1"

    id("com.jaredsburrows.license") version "0.9.3"
}

group = "apps.chocolatecakecodes.invidious_ext"
version = "1.0.0-Beta"

repositories {
    maven("https://s01.oss.sonatype.org/content/repositories/snapshots/") {
        mavenContent { snapshotsOnly() }
    }
    mavenCentral()
}

dependencies {
    val kotlinVersion = project.properties["kotlinVersion"]

    implementation(project("Sync"))
    implementation(project("Download"))

    implementation("org.jetbrains.kotlin:kotlin-reflect:${kotlinVersion}")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:${kotlinVersion}")
    implementation("io.micronaut.kotlin:micronaut-kotlin-extension-functions")
    implementation("io.micronaut.kotlin:micronaut-kotlin-runtime")
    implementation("io.micronaut:micronaut-jackson-databind")
    implementation("io.micronaut.serde:micronaut-serde-jackson")
    implementation("io.micronaut.problem:micronaut-problem-json")
    implementation("io.micronaut.security:micronaut-security")
    implementation("io.micronaut.data:micronaut-data-hibernate-jpa")
    implementation("io.micronaut.sql:micronaut-jdbc-hikari")
    implementation("io.micronaut.validation:micronaut-validation")
    implementation("jakarta.validation:jakarta.validation-api")
    implementation("io.micronaut.reactor:micronaut-reactor")

    kapt("io.micronaut.security:micronaut-security-annotations")
    kapt("io.micronaut.serde:micronaut-serde-processor")
    kapt("io.micronaut.validation:micronaut-validation-processor")
    kapt("io.micronaut.data:micronaut-data-processor")

    runtimeOnly("com.fasterxml.jackson.module:jackson-module-kotlin")
    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.slf4j:slf4j-simple")

    testImplementation("io.micronaut:micronaut-http-client")
    testImplementation("io.mockk:mockk:1.13.8")
}

application {
    mainClass.set("apps.chocolatecakecodes.invidious_ext.ApplicationKt")
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
    runtime("netty")
    testRuntime("kotest5")

    processing {
        incremental(true)
        annotations("apps.chocolatecakecodes.invidious_ext.*")
    }

    testResources {
        additionalModules.add("jdbc-postgresql")
    }

    aot {
        // Please review carefully the optimizations enabled below
        // Check https://micronaut-projects.github.io/micronaut-aot/latest/guide/ for more details
        optimizeServiceLoading.set(false)
        convertYamlToJava.set(false)
        precomputeOperations.set(true)
        cacheEnvironment.set(true)
        optimizeClassLoading.set(true)
        deduceEnvironment.set(true)
        optimizeNetty.set(true)
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
