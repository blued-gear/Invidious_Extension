import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.file.Files
import java.util.*

plugins {
    id("io.github.pereduromega.npm.plugin") version "1.3.0"
}

group = "apps.chocolatecakecodes.invidious_ext"
version = "1.0-Beta"

repositories {
    mavenCentral()
}

dependencies {}

npm {
    packageJson.set(project.file("package.json"))
    nodeModules.set(project.file("node_modules"))
    workingDir.set(project.projectDir)
    defaultTaskGroup.set("npm")
    autoCreateTasksFromPackageJsonScripts.set(true)
    tasksDependingOnNpmInstallByDefault.set(false)
    nodeVersion.set("18.16.1")
    downloadNode.set(false)
}

tasks.named<NpmScriptTask>("build") {
    group = BasePlugin.BUILD_GROUP

    inputs.dir("src")
    inputs.file(project.file("package.json"))
    inputs.file(project.file("vite.config.ts"))
    outputs.dir("dist")
}

tasks.create("publishUserScript") {
    group = "publish"
    dependsOn.add("build")

    val properties = Properties()
    properties.load(project.rootProject.file("local.properties").inputStream())

    val filename = "invidious-extension.user.js"
    val url = "${properties.getProperty("gitlab.host")}/api/v4/projects/${properties.getProperty("gitlab.projectId")}/packages/generic/${project.name}/${project.version}/$filename"
    val file = java.nio.file.Path.of("${project.projectDir}/dist/$filename")
    val authCredentials = "${properties.getProperty("gitlab.publish.username")}:${properties.getProperty("gitlab.publish.password")}"

    doLast {
        (URL(url).openConnection() as HttpURLConnection).apply {
            doOutput = true
            doInput = true
            instanceFollowRedirects = true
            requestMethod = "PUT"
            setRequestProperty("Authorization", "Basic ${Base64.getEncoder().encodeToString(authCredentials.toByteArray())}")
        }.also { http ->
            val httpOut = http.outputStream
            val fileIn = Files.newInputStream(file)

            fileIn.transferTo(httpOut)

            httpOut.flush()
            httpOut.close()
            fileIn.close()
        }.also { http ->
            val httpRespCode = http.responseCode
            if(httpRespCode < 200 || httpRespCode >= 300) {
                val respLines = BufferedReader(InputStreamReader(http.errorStream)).use {
                    it.readLines()
                }

                val msg = "Upload of debug apk failed: statusCode = $httpRespCode; statusMessage = ${http.responseMessage}\n${respLines.joinToString("\n")}"
                throw IOException(msg)
            } else {
                logger.info("Uploaded debug apk")
            }
        }
    }
}
