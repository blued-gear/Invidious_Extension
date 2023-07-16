plugins {
    id("io.github.pereduromega.npm.plugin") version "1.3.0"
}

group = "apps.chocolatecakecodes.invidious_ext"
version = "1.0-SNAPSHOT"

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
